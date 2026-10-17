/**
 * AI 匹配引擎
 * 第一层：向量粗筛（pgvector 余弦相似度）
 * 第二层：LLM 精排（通义千问）
 */
import { createServiceClient } from './supabase';
import { embedding, chat } from './qwen';
import type { AcademicProfile, Preferences, MatchResult } from '@/types';

/**
 * 将画像拼接为 embedding 输入文本
 */
function buildProfileText(profile: AcademicProfile): string {
  return [
    `研究领域：${profile.research_fields.join('、')}`,
    profile.research_keywords.length > 0 ? `关键词：${profile.research_keywords.join('、')}` : '',
    profile.skills.length > 0 ? `技能：${profile.skills.join('、')}` : '',
    `学历：${profile.degree}`,
    profile.publications_summary ? `发表：${profile.publications_summary}` : '',
    profile.school ? `院校：${profile.school}` : '',
    profile.major ? `专业：${profile.major}` : '',
  ].filter(Boolean).join(' ');
}

/**
 * 第一层：向量粗筛，返回 Top N 岗位
 */
export async function vectorSearch(
  profile: AcademicProfile,
  topN: number = 100,
): Promise<Array<{ id: string; title: string; organization: string; similarity: number }>> {
  const profileText = buildProfileText(profile);
  const profileEmbedding = await embedding(profileText, { dimensions: 1024 });

  if (profileEmbedding.length === 0) {
    throw new Error('生成画像向量失败');
  }

  const supabase = createServiceClient();

  // pgvector 余弦相似度查询
  const { data, error } = await supabase.rpc('match_jobs', {
    query_embedding: JSON.stringify(profileEmbedding),
    match_threshold: 0.0,
    match_count: topN,
  });

  if (error) {
    // 如果 RPC 不存在，降级为普通查询
    console.warn('RPC match_jobs 不可用，降级为普通查询:', error.message);
    const { data: fallbackData } = await supabase
      .from('jobs')
      .select('id, title, organization, department, bianzhi_type, position_type, institution_type, location_city, salary_range, benefits, discipline, research_direction, deadline')
      .eq('status', 'active')
      .order('publish_date', { ascending: false })
      .limit(topN);

    return (fallbackData || []).map((j, i) => ({
      id: j.id,
      title: j.title,
      organization: j.organization,
      similarity: 1 - i * 0.005,
    }));
  }

  return (data || []).map((d: { id: string; title: string; organization: string; similarity: number }) => ({
    id: d.id,
    title: d.title,
    organization: d.organization,
    similarity: d.similarity,
  }));
}

/**
 * 第二层：LLM 精排
 */
export async function llmRerank(
  profile: AcademicProfile,
  preferences: Preferences,
  candidateIds: string[],
): Promise<MatchResult[]> {
  const supabase = createServiceClient();

  // 获取候选岗位摘要
  const { data: candidates } = await supabase
    .from('jobs')
    .select('id, title, organization, department, bianzhi_type, position_type, institution_type, location_city, salary_range, benefits, discipline, research_direction, deadline')
    .in('id', candidateIds)
    .eq('status', 'active');

  if (!candidates || candidates.length === 0) {
    return [];
  }

  // 构建岗位摘要（控制在合理长度内）
  const jobSummaries = candidates.map((j, i) => (
    `[${i + 1}] id=${j.id} | ${j.title} | ${j.organization} | ${j.location_city || ''} | ${j.bianzhi_type || ''} | ${j.position_type || ''} | ${j.institution_type || ''} | 学科:${j.discipline?.join(',') || ''} | 薪资:${j.salary_range || ''} | 截止:${j.deadline || ''}`
  )).join('\n');

  const prompt = `你是博士求职顾问。请根据求职者画像和偏好，从以下岗位中精选 Top 20 并评分。

## 求职者画像
- 研究领域：${profile.research_fields.join('、')}
- 关键词：${profile.research_keywords.join('、') || '无'}
- 技能：${profile.skills.join('、') || '无'}
- 学历：${profile.degree}
- 发表：${profile.publications_summary || '未填写'}
- 院校：${profile.school || '未填写'} ${profile.major || ''}

## 求职偏好
- 工作节奏：${preferences.work_pace || '不限'}
- 城市偏好：${preferences.preferred_cities.join('、') || '不限'}
- 职业路径：${preferences.career_path || '不限'}
- 福利优先：${preferences.benefit_priorities.join('、') || '不限'}
- 机构偏好：${preferences.institution_preferences.join('、') || '不限'}

## 评分维度
- 方向匹配 40%（研究领域、学科、关键词）
- 偏好吻合 30%（城市、编制、机构、工作节奏）
- 要求满足 20%（学历、能力匹配度）
- 时效性 10%（截止日期、发布时间）

## 候选岗位
${jobSummaries}

## 输出要求
返回 JSON 数组，包含 Top 20 岗位，按得分降序：
[{"job_id":"xxx","score":85,"reason":"一句话推荐理由"}]

只返回 JSON 数组，不要其他内容。`;

  try {
    const result = await chat(
      [{ role: 'user', content: prompt }],
      { temperature: 0.2, max_tokens: 3000, timeout: 45000 },
    );

    // 提取 JSON
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as MatchResult[];
      return parsed.slice(0, 20).map((m) => ({
        job_id: m.job_id,
        score: Math.min(100, Math.max(0, Math.round(m.score))),
        reason: m.reason || '',
      }));
    }
  } catch (e) {
    console.error('LLM 精排失败:', (e as Error).message);
  }

  return [];
}

/**
 * 完整匹配流程：粗筛 + 精排
 */
export async function matchJobs(
  profile: AcademicProfile,
  preferences: Preferences,
): Promise<{ results: MatchResult[]; degraded: boolean }> {
  // 1. 向量粗筛 Top 100
  const coarse = await vectorSearch(profile, 100);
  const candidateIds = coarse.map((c) => c.id);

  if (candidateIds.length === 0) {
    return { results: [], degraded: false };
  }

  // 2. LLM 精排
  try {
    const ranked = await llmRerank(profile, preferences, candidateIds);

    if (ranked.length > 0) {
      return { results: ranked, degraded: false };
    }
  } catch (e) {
    console.error('精排异常，降级:', (e as Error).message);
  }

  // 3. 降级：返回粗筛 Top 50（无推荐理由）
  const degradedResults = coarse.slice(0, 50).map((c) => ({
    job_id: c.id,
    score: Math.round(c.similarity * 100),
    reason: '',
  }));

  return { results: degradedResults, degraded: true };
}

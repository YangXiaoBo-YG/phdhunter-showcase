import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { matchJobs } from '@/lib/matcher';
import type { AcademicProfile, Preferences } from '@/types';

// 限流：3 天内同一 IP 仅 1 次
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * POST /api/v1/recommend — AI 匹配推荐
 */
export async function POST(request: NextRequest) {
  let body: { profile: AcademicProfile; preferences: Preferences };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const { profile, preferences } = body;

  // 基本验证
  if (!profile?.research_fields?.length || !profile?.degree) {
    return NextResponse.json({ error: '缺少必填画像信息' }, { status: 400 });
  }

  // 获取客户端 IP
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  const supabase = createServiceClient();

  // 限流检查
  const cutoff = new Date(Date.now() - THREE_DAYS_MS).toISOString();
  const { data: recentUse } = await supabase
    .from('rate_limits')
    .select('used_at')
    .eq('client_key', clientIp)
    .gte('used_at', cutoff)
    .order('used_at', { ascending: false })
    .limit(1);

  if (recentUse && recentUse.length > 0) {
    const lastUsed = new Date(recentUse[0].used_at).getTime();
    const nextAvailable = new Date(lastUsed + THREE_DAYS_MS);
    return NextResponse.json(
      {
        error: '匹配次数已用完',
        next_available: nextAvailable.toISOString(),
        retry_after_ms: nextAvailable.getTime() - Date.now(),
      },
      { status: 429 },
    );
  }

  // 执行匹配
  try {
    const { results, degraded } = await matchJobs(profile, preferences);

    // 记录使用
    await supabase.from('rate_limits').insert({ client_key: clientIp });

    // 如果有结果，查询完整岗位信息
    if (results.length > 0) {
      const jobIds = results.map((r) => r.job_id);
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, organization, department, location_city, bianzhi_type, position_type, institution_type, degree_requirement, discipline, salary_range, benefits, source_url, publish_date, deadline, status, created_at')
        .in('id', jobIds);

      // 按匹配分数排序附加岗位信息
      const jobMap = new Map((jobs || []).map((j) => [j.id, j]));
      const enriched = results.map((r) => ({
        ...r,
        job: jobMap.get(r.job_id) || null,
      }));

      return NextResponse.json({
        data: enriched,
        degraded,
        matched_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ data: [], degraded: false, matched_at: new Date().toISOString() });
  } catch (e) {
    console.error('匹配失败:', (e as Error).message);
    return NextResponse.json({ error: '匹配服务暂时不可用，请稍后重试' }, { status: 500 });
  }
}

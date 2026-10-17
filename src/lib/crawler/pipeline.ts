/**
 * 爬虫数据管道：爬取 → 清洗 → 标准化 → 去重 → 入库
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { detectBianzhiType } from './bianzhi';
import { matchInstitutionType } from './institutions';
import type { RawJobData, StandardizedJob, CrawlerSource, PipelineReport } from './types';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const TODAY = new Date().toISOString().slice(0, 10);

// ==================== 清洗 ====================

/** 去除多余空白、换行、特殊字符 */
function cleanText(text: string | undefined): string {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\u200b\u200c\u200d\ufeff]/g, '') // 零宽字符
    .trim();
}

/** 标准化日期格式为 YYYY-MM-DD */
function normalizeDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  const cleaned = dateStr.replace(/[年月]/g, '-').replace(/日/, '').trim();

  // 尝试解析
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  // 尝试 YYYYMMDD 格式
  const m = cleaned.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  return null;
}

/** 检测岗位类型 */
function detectPositionType(text: string): string | null {
  if (!text) return null;
  if (/教学科研|教研岗|教授|副教授|讲师/.test(text)) return '教学科研岗';
  if (/专职科研|科研岗|研究员|助理研究员/.test(text)) return '专职科研岗';
  if (/博士后|博后|postdoc/i.test(text)) return '博后';
  if (/研发岗|工程师|开发/.test(text)) return '研发岗';
  if (/实验[技术师]|实验岗/.test(text)) return '实验技术岗';
  if (/行政|管理岗|辅导员/.test(text)) return '行政岗';
  return '其他';
}

// ==================== 标准化 ====================

/** 将原始爬取数据标准化为 jobs 表格式 */
export function standardize(raw: RawJobData): StandardizedJob {
  const title = cleanText(raw.title);
  const org = cleanText(raw.organization);
  const desc = cleanText(raw.raw_description);
  const fullText = `${title} ${desc}`;

  // 编制类型：优先使用页面提取的，否则从描述中识别
  const bianzhiType = raw.bianzhi_type
    ? cleanText(raw.bianzhi_type)
    : detectBianzhiType(fullText);

  // 机构类型：从机构映射表匹配
  const institutionType = matchInstitutionType(org);

  // 岗位类型：优先使用页面提取的
  const positionType = raw.position_type
    ? cleanText(raw.position_type)
    : detectPositionType(fullText);

  // 判断过期状态
  const deadline = normalizeDate(raw.deadline);
  const isExpired = deadline ? new Date(deadline) < new Date(TODAY) : false;

  return {
    title,
    organization: org,
    department: cleanText(raw.department) || null,
    location_city: cleanText(raw.location_city) || null,
    bianzhi_type: bianzhiType,
    position_type: positionType,
    institution_type: institutionType,
    degree_requirement: cleanText(raw.degree_requirement) || null,
    discipline: raw.discipline?.map(cleanText).filter(Boolean) || null,
    research_direction: null, // 后续由 LLM 提取
    salary_range: cleanText(raw.salary_range) || null,
    benefits: raw.benefits?.map(cleanText).filter(Boolean) || null,
    source_url: raw.source_url.trim(),
    publish_date: normalizeDate(raw.publish_date),
    deadline,
    crawl_date: TODAY,
    status: isExpired ? 'expired' : 'active',
    raw_description: desc || null,
    structured_tags: null, // 后续由 LLM 提取
  };
}

// ==================== 去重入库 ====================

/**
 * 使用 upsert 实现去重入库
 * 基于 UNIQUE(source_url, organization, title) 约束
 */
async function upsertJobs(jobs: StandardizedJob[]): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  let inserted = 0;
  const skipped = 0;
  const errors: string[] = [];

  // 分批插入，每批 10 条
  const batchSize = 10;
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('jobs')
      .upsert(batch, {
        onConflict: 'source_url,organization,title',
        ignoreDuplicates: false, // 更新已有记录
      })
      .select('id');

    if (error) {
      errors.push(`批次 ${i / batchSize + 1}: ${error.message}`);
    } else {
      inserted += data.length;
    }
  }

  return { inserted, skipped, errors };
}

// ==================== 管道主流程 ====================

/**
 * 运行单个数据源的完整管道
 */
export async function runPipeline(source: CrawlerSource): Promise<PipelineReport> {
  const start = Date.now();
  const report: PipelineReport = {
    source: source.name,
    crawled: 0,
    inserted: 0,
    skipped_duplicate: 0,
    errors: [],
    duration_ms: 0,
  };

  try {
    // 1. 爬取
    console.log(`[${source.name}] 开始爬取...`);
    const rawData = await source.crawl();
    report.crawled = rawData.length;
    console.log(`[${source.name}] 爬取到 ${rawData.length} 条原始数据`);

    if (rawData.length === 0) {
      report.duration_ms = Date.now() - start;
      return report;
    }

    // 2. 清洗 + 标准化
    console.log(`[${source.name}] 标准化处理中...`);
    const standardized = rawData
      .map((raw) => {
        try {
          return standardize(raw);
        } catch (e) {
          report.errors.push(`标准化失败: ${raw.title} - ${(e as Error).message}`);
          return null;
        }
      })
      .filter((job): job is StandardizedJob => job !== null);

    // 3. 去重 + 入库
    console.log(`[${source.name}] 入库中（${standardized.length} 条）...`);
    const result = await upsertJobs(standardized);
    report.inserted = result.inserted;
    report.skipped_duplicate = result.skipped;
    report.errors.push(...result.errors);

  } catch (e) {
    report.errors.push(`管道异常: ${(e as Error).message}`);
  }

  report.duration_ms = Date.now() - start;
  console.log(`[${source.name}] 完成: 爬取=${report.crawled}, 入库=${report.inserted}, 耗时=${report.duration_ms}ms`);
  if (report.errors.length > 0) {
    console.error(`[${source.name}] 错误:`, report.errors);
  }

  return report;
}

/**
 * 运行多个数据源
 */
export async function runAllPipelines(sources: CrawlerSource[]): Promise<PipelineReport[]> {
  const reports: PipelineReport[] = [];

  for (const source of sources) {
    const report = await runPipeline(source);
    reports.push(report);
  }

  // 汇总
  const total = {
    crawled: reports.reduce((s, r) => s + r.crawled, 0),
    inserted: reports.reduce((s, r) => s + r.inserted, 0),
    errors: reports.reduce((s, r) => s + r.errors.length, 0),
    duration: reports.reduce((s, r) => s + r.duration_ms, 0),
  };
  console.log(`\n===== 全部完成 =====`);
  console.log(`总爬取: ${total.crawled}, 总入库: ${total.inserted}, 总错误: ${total.errors}, 总耗时: ${total.duration}ms`);

  return reports;
}

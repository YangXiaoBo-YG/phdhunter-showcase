/**
 * 爬虫管道类型定义
 */

/** 爬取到的原始数据（来自网页） */
export interface RawJobData {
  title: string;
  organization: string;
  department?: string;
  location_city?: string;
  source_url: string;
  publish_date?: string;
  deadline?: string;
  raw_description: string;
  // 以下可选，如页面已结构化则直接填
  salary_range?: string;
  degree_requirement?: string;
  discipline?: string[];
  benefits?: string[];
  bianzhi_type?: string;
  position_type?: string;
}

/** 标准化后的数据（对齐 jobs 表，准备入库） */
export interface StandardizedJob {
  title: string;
  organization: string;
  department: string | null;
  location_city: string | null;
  bianzhi_type: string;
  position_type: string | null;
  institution_type: string | null;
  degree_requirement: string | null;
  discipline: string[] | null;
  research_direction: string | null;
  salary_range: string | null;
  benefits: string[] | null;
  source_url: string;
  publish_date: string | null;
  deadline: string | null;
  crawl_date: string;
  status: 'active' | 'expired';
  raw_description: string | null;
  structured_tags: Record<string, unknown> | null;
}

/** 爬虫源配置 */
export interface CrawlerSource {
  /** 数据源名称 */
  name: string;
  /** 爬取函数，返回原始数据列表 */
  crawl: () => Promise<RawJobData[]>;
}

/** 管道运行报告 */
export interface PipelineReport {
  source: string;
  crawled: number;
  inserted: number;
  skipped_duplicate: number;
  errors: string[];
  duration_ms: number;
}

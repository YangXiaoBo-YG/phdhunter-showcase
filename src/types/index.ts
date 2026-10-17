// 岗位数据模型
export interface Job {
  id: string;
  title: string;
  organization: string;
  department: string | null;
  location_city: string | null;

  // 核心差异化字段
  bianzhi_type: BianzhiType | null;
  position_type: PositionType | null;
  institution_type: InstitutionType | null;

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
  // embedding 不在前端使用

  created_at: string;
}

// 编制类型
export type BianzhiType =
  | '事业编制'
  | '人事代理'
  | '合同制'
  | '备案制'
  | '未标注';

// 岗位类型
export type PositionType =
  | '教学科研岗'
  | '专职科研岗'
  | '博后'
  | '研发岗'
  | '实验技术岗'
  | '行政岗'
  | '其他';

// 机构类型
export type InstitutionType =
  | '双一流高校'
  | '省重点高校'
  | '普通本科'
  | '科研院所'
  | '央企研究院'
  | '国企研究院'
  | '事业单位';

// 学术画像
export interface AcademicProfile {
  research_fields: string[];       // 研究领域（必填）
  research_keywords: string[];     // 细分关键词
  skills: string[];                // 技能标签
  degree: '博士在读' | '博士应届' | '博士后'; // 学历阶段（必填）
  publications_summary: string;    // 发表概况
  school: string;                  // 毕业院校
  major: string;                   // 专业
}

// 工作节奏偏好
export type WorkPace =
  | '事少离家近'
  | '大城市拼搏'
  | '躺平养生'
  | '学术热爱'
  | '均衡发展';

// 职业路径偏好
export type CareerPath =
  | '学术路线'
  | '科研路线'
  | '产业研发'
  | '不限';

// 福利选项
export type BenefitOption =
  | '编制'
  | '薪资/安家费'
  | '科研启动经费'
  | '住房补贴'
  | '子女教育'
  | '晋升空间'
  | '学术自由度';

// 偏好设置
export interface Preferences {
  work_pace: WorkPace | null;                    // 工作节奏
  preferred_cities: string[];                    // 城市偏好
  career_path: CareerPath | null;                // 职业路径
  benefit_priorities: BenefitOption[];           // 福利优先级Top3
  institution_preferences: InstitutionType[];    // 机构偏好
}

// AI匹配结果
export interface MatchResult {
  job_id: string;
  score: number;       // 0-100
  reason: string;      // 推荐理由
  job?: Job;           // 关联的岗位信息
}

// 推荐缓存
export interface RecommendCache {
  results: MatchResult[];
  timestamp: number;
  profile: AcademicProfile;
  preferences: Preferences;
}

// 浙江省城市列表
export const ZHEJIANG_CITIES = [
  '杭州', '宁波', '温州', '金华', '绍兴',
  '湖州', '台州', '嘉兴', '丽水', '舟山', '衢州',
] as const;

// 编制类型选项
export const BIANZHI_OPTIONS: BianzhiType[] = [
  '事业编制', '备案制', '人事代理', '合同制', '未标注',
];

// 岗位类型选项
export const POSITION_OPTIONS: PositionType[] = [
  '教学科研岗', '专职科研岗', '博后', '研发岗', '实验技术岗', '行政岗', '其他',
];

// 机构类型选项
export const INSTITUTION_OPTIONS: InstitutionType[] = [
  '双一流高校', '省重点高校', '普通本科', '科研院所', '央企研究院', '国企研究院', '事业单位',
];

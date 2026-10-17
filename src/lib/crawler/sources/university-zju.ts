/**
 * 浙江大学招聘爬虫
 *
 * 数据源：ehr.zju.edu.cn REST API
 * 策略：直接获取 JSON 列表，一次请求拿到全部岗位
 */
import { fetchJsonWithRetry } from '../crawl-client';
import type { RawJobData, CrawlerSource } from '../types';

const API_BASE = 'http://ehr.zju.edu.cn/rest/introduce';

interface ApiResponse {
  message: string;
  success: boolean;
  page: { items: number };
  data: Record<string, PositionItem>;
}

interface PositionItem {
  globalid: string;
  gwmc: string;       // 岗位名称
  gwlbmc: string;     // 岗位类别名称
  gwjj: string;       // 岗位简介（HTML）
  gwyq: string;       // 岗位要求（HTML）
  fbdwmc: string;     // 发布单位名称
  fbsj: string;       // 发布时间
  yxjssj: string;     // 有效截止时间
  yxqssj: string;     // 有效起始时间
  zprs: string;       // 招聘人数
  sffb: string;       // 是否发布
  rylbmc: string;     // 人员类别名称
}

/** HTML 标签转纯文本 */
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 从文本中提取浙江城市 */
function extractCity(text: string): string {
  const cities = ['宁波', '温州', '金华', '绍兴', '湖州', '台州', '嘉兴', '丽水', '舟山', '衢州'];
  for (const city of cities) {
    if (text.includes(city)) return city;
  }
  return '杭州'; // 浙大默认杭州
}

async function crawlZju(): Promise<RawJobData[]> {
  // 一次请求获取全部岗位
  console.log('  获取岗位列表...');

  let response: ApiResponse;
  try {
    response = await fetchJsonWithRetry<ApiResponse>(
      `${API_BASE}/postRelease_list.html?perPageSize=500`
    );
  } catch (e) {
    console.log('  API 请求失败:', (e as Error).message);
    return [];
  }

  const items = Object.values(response.data || {}).filter(
    (item): item is PositionItem => typeof item === 'object' && item !== null && 'globalid' in item
  );

  console.log(`  共 ${items.length} 条岗位，筛选博士相关...`);

  const results: RawJobData[] = [];

  for (const item of items) {
    const intro = stripHtml(item.gwjj);
    const req = stripHtml(item.gwyq);
    const fullText = `${item.gwmc} ${item.gwlbmc} ${item.rylbmc} ${intro} ${req}`;

    // 过滤非博士岗位
    if (!/博士|博后|研究员|教授|副教授|讲师|PI|特聘|百人|高层次/.test(fullText)) {
      continue;
    }

    const rawDesc = [
      intro ? `岗位简介：${intro}` : '',
      req ? `岗位要求：${req}` : '',
    ].filter(Boolean).join('\n');

    const detailUrl = `http://ehr.zju.edu.cn/vuejs/recruitment/position-detail.htm?id=${item.globalid}`;

    results.push({
      title: item.gwmc,
      organization: '浙江大学',
      department: item.fbdwmc || undefined,
      location_city: extractCity(fullText),
      source_url: detailUrl,
      publish_date: item.fbsj?.slice(0, 10) || undefined,
      deadline: item.yxjssj?.slice(0, 10) || undefined,
      raw_description: rawDesc || `浙江大学 ${item.gwmc} ${item.gwlbmc}`,
      position_type: item.gwlbmc || undefined,
    });
  }

  console.log(`  博士相关: ${results.length} 条`);
  return results;
}

export const zjuSource: CrawlerSource = {
  name: '浙江大学',
  crawl: crawlZju,
};

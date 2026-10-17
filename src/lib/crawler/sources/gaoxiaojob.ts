/**
 * 高校人才网（gaoxiaojob.com）浙江板块爬虫
 *
 * 策略：
 * - /column/22.html 为 SSR 页面，可直接抓取列表链接
 * - /job?xxx 带查询参数的页面被 robots.txt 禁止，跳过
 * - 详情页需要较大间隔避免被封
 * - 仅保留博士相关岗位
 */
import { fetchWithRetry, delay } from '../crawl-client';
import type { RawJobData, CrawlerSource } from '../types';

const BASE_URL = 'https://www.gaoxiaojob.com';

// 只使用不被 403 的 SSR 列表页
const LIST_URLS = [
  `${BASE_URL}/column/22.html`,   // 浙江省总栏目
];

/**
 * 从列表页 HTML 中提取详情页链接 ID
 */
function extractJobIds(html: string): string[] {
  const ids = new Set<string>();
  const linkRegex = /href="\/job\/detail\/(\d+)\.html"/g;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    ids.add(match[1]);
  }
  return Array.from(ids);
}

/**
 * 解析详情页 HTML
 */
function parseDetailPage(html: string, url: string): RawJobData | null {
  // 提取标题
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) ||
    html.match(/class="[^"]*job-title[^"]*"[^>]*>([\s\S]*?)<\//);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : null;

  // 提取单位名称
  const orgMatch = html.match(/class="[^"]*company[^"]*name[^"]*"[^>]*>([\s\S]*?)<\//) ||
    html.match(/class="[^"]*job-company[^"]*"[^>]*>([\s\S]*?)<\//) ||
    html.match(/招聘单位[：:]\s*([^<\n]+)/);
  const organization = orgMatch ? orgMatch[1].replace(/<[^>]+>/g, '').trim() : null;

  if (!title || !organization) return null;

  // 整体文本（去掉脚本和标签）
  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

  // 提取各字段
  const salaryMatch = html.match(/class="[^"]*salary[^"]*"[^>]*>([\s\S]*?)<\//);
  const deadlineMatch = bodyText.match(/(?:截止日期|有效期至|截止时间|报名截止)[：:\s]*([\d\-\/\.]+)/);
  const publishMatch = bodyText.match(/(?:发布时间|发布日期|更新时间)[：:\s]*([\d\-\/\.]+)/);
  const degreeMatch = bodyText.match(/(?:学历要求|学历|最低学历)[：:\s]*([^\s,，。]+)/);
  const disciplineMatch = bodyText.match(/(?:学科|专业方向|专业要求|所学专业)[：:\s]*([^。\n]{2,100})/);

  // 提取描述段落
  const sectionNames = ['岗位职责', '任职要求', '岗位要求', '待遇保障', '薪酬待遇', '福利待遇', '岗位描述', '职位描述'];
  let rawDesc = '';
  for (const sec of sectionNames) {
    const m = bodyText.match(new RegExp(`${sec}[：:]?\\s*(.{10,2000}?)(?=${sectionNames.join('|')}|联系方式|联系人|$)`));
    if (m) rawDesc += `${sec}：${m[1].trim()}\n`;
  }
  if (!rawDesc) {
    const descFallback = bodyText.match(/(?:岗位|职位|招聘)[\s\S]{10,500}/);
    rawDesc = descFallback ? descFallback[0] : `${title} ${organization}`;
  }

  const city = extractCity(bodyText);

  const benefitsMatch = bodyText.match(/(?:待遇|福利|保障)[：:\s]*(.{10,500})/);
  const benefits = benefitsMatch
    ? benefitsMatch[1].split(/[、；;，,]/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 50).slice(0, 10)
    : undefined;

  return {
    title,
    organization,
    location_city: city || undefined,
    source_url: url,
    publish_date: publishMatch ? publishMatch[1].replace(/[\/\.]/g, '-') : undefined,
    deadline: deadlineMatch ? deadlineMatch[1].replace(/[\/\.]/g, '-') : undefined,
    raw_description: rawDesc.trim(),
    salary_range: salaryMatch ? salaryMatch[1].replace(/<[^>]+>/g, '').trim() : undefined,
    degree_requirement: degreeMatch ? degreeMatch[1] : undefined,
    discipline: disciplineMatch
      ? disciplineMatch[1].split(/[、，,；;\/]/).map((s) => s.trim()).filter(Boolean).slice(0, 10)
      : undefined,
    benefits,
  };
}

function extractCity(text: string): string | null {
  const cities = ['杭州', '宁波', '温州', '金华', '绍兴', '湖州', '台州', '嘉兴', '丽水', '舟山', '衢州'];
  for (const city of cities) {
    if (text.includes(city)) return city;
  }
  return null;
}

// ==================== 主逻辑 ====================

async function crawlGaoxiaojob(): Promise<RawJobData[]> {
  const allIds = new Set<string>();

  // 1. 从 SSR 列表页收集链接
  console.log(`  扫描列表页...`);
  for (const url of LIST_URLS) {
    try {
      const html = await fetchWithRetry(url);
      const ids = extractJobIds(html);
      ids.forEach((id) => allIds.add(id));
      console.log(`  ${url.split('.com')[1]} → ${ids.length} 个链接`);
    } catch (e) {
      console.log(`  列表页失败: ${(e as Error).message}`);
    }
    await delay(2000, 4000);
  }

  console.log(`  共发现 ${allIds.size} 个岗位链接`);

  if (allIds.size === 0) {
    console.log('  ⚠ 未获取到链接，跳过');
    return [];
  }

  // 2. 逐个爬取详情页（大间隔，避免触发反爬）
  const results: RawJobData[] = [];
  let count = 0;
  let failures = 0;
  const MAX_CONSECUTIVE_FAILURES = 5;

  for (const id of allIds) {
    count++;
    const url = `${BASE_URL}/job/detail/${id}.html`;

    if (count % 5 === 0 || count === 1) {
      console.log(`  详情页 [${count}/${allIds.size}] 已解析 ${results.length} 条`);
    }

    try {
      const html = await fetchWithRetry(url, { maxRetry: 1 });
      const job = parseDetailPage(html, url);

      if (job) {
        const fullText = `${job.title} ${job.raw_description} ${job.degree_requirement || ''}`;
        if (/博士|博后|研究员|教授|副教授|讲师|PI|特聘/.test(fullText)) {
          results.push(job);
        }
      }
      failures = 0; // 重置连续失败计数
    } catch {
      failures++;
      if (failures >= MAX_CONSECUTIVE_FAILURES) {
        console.log(`  连续 ${MAX_CONSECUTIVE_FAILURES} 次失败，可能被限流，停止爬取`);
        break;
      }
    }

    // 较大间隔（3-6秒），避免被封
    await delay(3000, 6000);
  }

  console.log(`  博士相关岗位: ${results.length} 条`);
  return results;
}

export const gaoxiaojobSource: CrawlerSource = {
  name: '高校人才网',
  crawl: crawlGaoxiaojob,
};

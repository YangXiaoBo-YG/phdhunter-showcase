/**
 * 浙江省人社厅事业单位招聘公告爬虫
 *
 * 数据源：rlsbt.zj.gov.cn 事业单位公开招聘专栏
 * 策略：静态 HTML 解析
 */
import { fetchWithRetry, delay } from '../crawl-client';
import type { RawJobData, CrawlerSource } from '../types';

const BASE_URL = 'http://rlsbt.zj.gov.cn';
const LIST_URL = `${BASE_URL}/col/col1443681/index.html`;

/**
 * 从列表页提取公告链接
 */
function parseListPage(html: string): Array<{ title: string; url: string; date: string }> {
  const items: Array<{ title: string; url: string; date: string }> = [];

  // 政府网站常见结构：<a href="...">标题</a> [日期]
  const patterns = [
    // 模式1: <a href="/art/YYYY/MM/DD/artID.html">标题</a>
    /<a[^>]+href="(\/art\/\d{4}\/\d{1,2}\/\d{1,2}\/art_\d+_\d+\.html)"[^>]*>([^<]+)<\/a>\s*(?:<[^>]*>)?\s*\[?(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\]?/g,
    // 模式2: 通用链接匹配
    /<a[^>]+href="([^"]+\.html)"[^>]*title="([^"]*(?:招聘|招录|引进)[^"]*)"[^>]*>/g,
  ];

  for (const regex of patterns) {
    let match;
    while ((match = regex.exec(html)) !== null) {
      const href = match[1];
      const title = (match[2] || '').trim();
      const date = (match[3] || '').trim();

      if (!title || !href) continue;
      // 只关注招聘相关
      if (!/招聘|招录|引进|选聘/.test(title)) continue;

      const url = href.startsWith('http') ? href : `${BASE_URL}${href}`;
      items.push({ title, url, date });
    }
  }

  // 去重
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

/**
 * 解析公告详情页
 */
function parseDetailPage(html: string, url: string, listTitle: string, listDate: string): RawJobData | null {
  const cleanHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  // 标题
  const titleMatch = cleanHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) ||
    cleanHtml.match(/class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\//);
  const title = titleMatch
    ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
    : listTitle;

  if (!title) return null;

  // 正文
  const bodyText = cleanHtml
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 截取描述
  const rawDesc = bodyText.length > 3000 ? bodyText.slice(0, 3000) : bodyText;

  // 必须包含博士相关
  if (!/博士|博后|研究员|高层次|高级专业技术/.test(rawDesc)) {
    return null;
  }

  // 提取单位名
  const orgMatch = bodyText.match(/(?:招聘单位|用人单位|聘用单位)[：:\s]*([^\s,，。]{2,30})/) ||
    title.match(/^(.{2,20}?)(?:公开招聘|招录|引进)/);
  const organization = orgMatch ? orgMatch[1].trim() : '浙江省事业单位';

  // 城市
  const city = extractCity(bodyText) || extractCity(title);

  // 截止日期
  const deadlineMatch = bodyText.match(/(?:截止|报名.*?至)[^\d]*([\d\-\/\.年月日]+)/);

  return {
    title,
    organization,
    location_city: city || undefined,
    source_url: url,
    publish_date: listDate || undefined,
    deadline: deadlineMatch
      ? deadlineMatch[1].replace(/[年月]/g, '-').replace(/日/, '')
      : undefined,
    raw_description: rawDesc,
    bianzhi_type: '事业编制', // 人社厅发的基本都是事业编
  };
}

function extractCity(text: string): string | null {
  const cities = ['杭州', '宁波', '温州', '金华', '绍兴', '湖州', '台州', '嘉兴', '丽水', '舟山', '衢州'];
  for (const city of cities) {
    if (text.includes(city)) return city;
  }
  return null;
}

async function crawlZjhrss(): Promise<RawJobData[]> {
  const allLinks: Array<{ title: string; url: string; date: string }> = [];

  // 1. 列表页
  console.log('  获取公告列表...');
  try {
    const html = await fetchWithRetry(LIST_URL);
    const links = parseListPage(html);
    allLinks.push(...links);
    console.log(`  获取 ${links.length} 条招聘公告链接`);
  } catch (e) {
    console.log(`  列表页失败: ${(e as Error).message}`);
  }

  if (allLinks.length === 0) {
    console.log('  未获取到链接，跳过');
    return [];
  }

  // 2. 详情页
  const results: RawJobData[] = [];
  let count = 0;
  let failures = 0;

  for (const link of allLinks) {
    count++;
    if (count % 5 === 0) {
      console.log(`  详情 [${count}/${allLinks.length}] 已解析 ${results.length} 条`);
    }

    try {
      const html = await fetchWithRetry(link.url);
      const job = parseDetailPage(html, link.url, link.title, link.date);
      if (job) results.push(job);
      failures = 0;
    } catch {
      failures++;
      if (failures >= 5) {
        console.log('  连续失败，停止');
        break;
      }
    }

    await delay(2000, 4000);
  }

  return results;
}

export const zjhrssSource: CrawlerSource = {
  name: '浙江省人社厅',
  crawl: crawlZjhrss,
};

/**
 * 中电科（CETC）招聘爬虫
 *
 * 数据源：www.cetc.com.cn 人才招聘专栏
 * 策略：静态 HTML 解析
 */
import { fetchWithRetry, delay } from '../crawl-client';
import type { RawJobData, CrawlerSource } from '../types';

const BASE_URL = 'https://www.cetc.com.cn';
const LIST_PATH = '/zgdk/1593022/1592495/index.html';
const MAX_PAGES = 5;

/**
 * 从列表页提取公告链接
 */
function parseListPage(html: string): Array<{ title: string; url: string; date: string }> {
  const items: Array<{ title: string; url: string; date: string }> = [];

  // 中电科列表结构：<a href="/zgdk/xxx/index.html">标题</a> 日期
  const patterns = [
    /<a[^>]+href="(\/zgdk\/[^"]+\/index\.html)"[^>]*>([^<]+)<\/a>\s*(?:<[^>]*>)*\s*(?:\[?(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\]?)?/g,
    /<a[^>]+href="(\/zgdk\/[^"]+\.html)"[^>]*title="([^"]*)"[^>]*>/g,
  ];

  for (const regex of patterns) {
    let match;
    while ((match = regex.exec(html)) !== null) {
      const href = match[1];
      const title = (match[2] || '').trim();
      const date = (match[3] || '').replace(/\//g, '-').trim();

      if (!title || !href) continue;

      items.push({
        title,
        url: `${BASE_URL}${href}`,
        date,
      });
    }
  }

  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

/**
 * 解析详情页
 */
function parseDetailPage(html: string, url: string, listTitle: string, listDate: string): RawJobData | null {
  const cleanHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  const titleMatch = cleanHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) ||
    cleanHtml.match(/class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\//);
  const title = titleMatch
    ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
    : listTitle;

  if (!title) return null;

  const bodyText = cleanHtml
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const rawDesc = bodyText.length > 3000 ? bodyText.slice(0, 3000) : bodyText;

  // 博士相关过滤
  if (!/博士|博后|研究员|高层次|高级工程师/.test(rawDesc)) {
    return null;
  }

  // 提取单位
  const orgMatch = bodyText.match(/(?:招聘单位|用人单位)[：:\s]*([^\s,，。]{2,30})/) ||
    title.match(/(中电科[^\s]*|中国电子科技[^\s]*)/);
  const organization = orgMatch ? orgMatch[1].trim() : '中电科（杭州）';

  const city = extractCity(bodyText) || '杭州';

  return {
    title,
    organization,
    location_city: city,
    source_url: url,
    publish_date: listDate || undefined,
    raw_description: rawDesc,
    position_type: '研发岗',
  };
}

function extractCity(text: string): string | null {
  const cities = ['杭州', '宁波', '温州', '金华', '绍兴', '湖州', '台州', '嘉兴', '丽水', '舟山', '衢州'];
  for (const city of cities) {
    if (text.includes(city)) return city;
  }
  return null;
}

async function crawlCetc(): Promise<RawJobData[]> {
  const allLinks: Array<{ title: string; url: string; date: string }> = [];

  // 列表页
  console.log('  获取中电科招聘列表...');
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1
      ? `${BASE_URL}${LIST_PATH}`
      : `${BASE_URL}${LIST_PATH.replace('index.html', `index_${page}.html`)}`;

    try {
      const html = await fetchWithRetry(url);
      const links = parseListPage(html);
      if (links.length === 0) break;
      allLinks.push(...links);
      console.log(`  第 ${page} 页: ${links.length} 条`);
    } catch (e) {
      console.log(`  第 ${page} 页失败: ${(e as Error).message}`);
      break;
    }
    await delay(2000, 4000);
  }

  console.log(`  共 ${allLinks.length} 条链接`);

  if (allLinks.length === 0) return [];

  // 详情页
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
      if (failures >= 5) break;
    }

    await delay(2000, 4000);
  }

  return results;
}

export const cetcSource: CrawlerSource = {
  name: '中电科',
  crawl: crawlCetc,
};

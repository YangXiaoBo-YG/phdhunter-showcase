/**
 * 温州大学招聘爬虫
 *
 * 数据源：rsc.wzu.edu.cn/rczp/zpxx.htm
 * 策略：静态 HTML 解析，分页 zpxx/N.htm
 */
import { fetchWithRetry, delay } from '../crawl-client';
import type { RawJobData, CrawlerSource } from '../types';

const BASE_URL = 'https://rsc.wzu.edu.cn';
const LIST_PATH = '/rczp/zpxx';
const MAX_PAGES = 8;

interface ListItem {
  title: string;
  url: string;
  date: string;
}

/**
 * 解析列表页
 */
function parseListPage(html: string): ListItem[] {
  const items: ListItem[] = [];

  // 结构: <li><a href="../../info/1096/ID.htm">标题</a>日期</li>
  // 或: <a href="/info/1096/ID.htm">标题</a>
  const patterns = [
    // 相对路径
    /<a\s+href="(?:\.\.\/)*info\/1096\/(\d+)\.htm"[^>]*>([^<]+)<\/a>\s*([\d\-]*)/g,
    // 绝对路径
    /<a\s+href="\/info\/1096\/(\d+)\.htm"[^>]*>([^<]+)<\/a>\s*([\d\-]*)/g,
  ];

  for (const regex of patterns) {
    let match;
    while ((match = regex.exec(html)) !== null) {
      const id = match[1];
      const title = match[2].trim();
      const date = match[3]?.trim() || '';

      items.push({
        title,
        url: `${BASE_URL}/info/1096/${id}.htm`,
        date,
      });
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
 * 解析详情页
 */
function parseDetailPage(html: string, url: string, listDate: string): RawJobData | null {
  const cleanHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  // 标题
  const titleMatch = cleanHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) ||
    cleanHtml.match(/class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\//);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : null;

  if (!title) return null;

  // 正文
  const bodyText = cleanHtml
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const rawDesc = bodyText.length > 3000 ? bodyText.slice(0, 3000) : bodyText;

  // 发布日期
  const publishDate = listDate ||
    (bodyText.match(/发布时间[：:\s]*([\d\-\/]+)/) || [])[1] ||
    undefined;

  // 截止日期
  const deadlineMatch = bodyText.match(/(?:截止|报名.*?至|有效期至)[^\d]*([\d\-\/\.年月日]+)/);

  // 过滤非博士岗位
  if (!/博士|博后|研究员|教授|副教授|讲师|高层次人才|学术带头人/.test(rawDesc)) {
    return null;
  }

  return {
    title,
    organization: '温州大学',
    location_city: '温州',
    source_url: url,
    publish_date: publishDate,
    deadline: deadlineMatch ? deadlineMatch[1].replace(/[年月]/g, '-').replace(/日/, '') : undefined,
    raw_description: rawDesc,
  };
}

/**
 * 主爬取逻辑
 */
async function crawlWzu(): Promise<RawJobData[]> {
  const allItems: ListItem[] = [];

  // 1. 列表页
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1
      ? `${BASE_URL}${LIST_PATH}.htm`
      : `${BASE_URL}${LIST_PATH}/${page}.htm`;

    console.log(`  列表页 ${page}/${MAX_PAGES}`);

    try {
      const html = await fetchWithRetry(url);
      const items = parseListPage(html);

      if (items.length === 0) {
        console.log(`  第 ${page} 页无数据，停止`);
        break;
      }

      allItems.push(...items);
      console.log(`  获取 ${items.length} 条`);
    } catch (e) {
      console.log(`  第 ${page} 页失败: ${(e as Error).message}`);
      break;
    }

    await delay(2000, 4000);
  }

  console.log(`  列表共 ${allItems.length} 条公告`);

  // 2. 详情页
  const results: RawJobData[] = [];
  let count = 0;
  let failures = 0;

  for (const item of allItems) {
    count++;
    if (count % 5 === 0) {
      console.log(`  详情 [${count}/${allItems.length}] 已解析 ${results.length} 条`);
    }

    try {
      const html = await fetchWithRetry(item.url);
      const job = parseDetailPage(html, item.url, item.date);
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

export const wzuSource: CrawlerSource = {
  name: '温州大学',
  crawl: crawlWzu,
};

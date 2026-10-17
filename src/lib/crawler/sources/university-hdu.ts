/**
 * 杭州电子科技大学招聘爬虫
 *
 * 数据源：renshi.hdu.edu.cn/13762/list.htm
 * 策略：静态 HTML 解析，分页 listN.htm
 */
import { fetchWithRetry, delay } from '../crawl-client';
import type { RawJobData, CrawlerSource } from '../types';

const BASE_URL = 'http://renshi.hdu.edu.cn';
const LIST_PATH = '/13762/list';
const MAX_PAGES = 9;

interface ListItem {
  title: string;
  url: string;
  date: string;
}

/**
 * 解析列表页 HTML
 */
function parseListPage(html: string): ListItem[] {
  const items: ListItem[] = [];

  // 匹配 <li> 中的链接和日期
  // 结构: <li><a href="/YYYY/MMDD/c13762aID/page.htm">标题</a><span>YYYY-MM-DD</span></li>
  const liRegex = /<li[^>]*>\s*<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>\s*<span[^>]*>([\d\-]+)<\/span>/g;
  let match;

  while ((match = liRegex.exec(html)) !== null) {
    const href = match[1];
    const title = match[2].trim();
    const date = match[3].trim();

    // 只关注招聘相关的链接
    if (href.includes('c13762a') || href.includes('/13762/')) {
      items.push({
        title,
        url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
        date,
      });
    }
  }

  // 备用模式：更宽松的匹配
  if (items.length === 0) {
    const linkRegex = /<a\s+href="(\/\d{4}\/\d{4}\/c\d+a\d+\/page\.htm)"[^>]*>([^<]+)<\/a>/g;
    while ((match = linkRegex.exec(html)) !== null) {
      items.push({
        title: match[2].trim(),
        url: `${BASE_URL}${match[1]}`,
        date: '',
      });
    }
  }

  return items;
}

/**
 * 解析详情页
 */
function parseDetailPage(html: string, url: string, listDate: string): RawJobData | null {
  // 去掉脚本和样式
  const cleanHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  // 提取标题
  const titleMatch = cleanHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) ||
    cleanHtml.match(/class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\//);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : null;

  if (!title) return null;

  // 提取正文
  const bodyText = cleanHtml
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 截取有效描述（最多3000字符）
  const rawDesc = bodyText.length > 3000
    ? bodyText.slice(0, 3000)
    : bodyText;

  // 提取发布日期
  const dateMatch = bodyText.match(/(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/) ||
    bodyText.match(/(\d{4}年\d{1,2}月\d{1,2}日)/);
  const publishDate = listDate || (dateMatch ? dateMatch[1].replace(/[年月]/g, '-').replace(/日/, '') : undefined);

  // 提取截止日期
  const deadlineMatch = bodyText.match(/(?:截止|报名时间.*?至|有效期至)[^\d]*([\d\-\/\.年月日]+)/);

  // 判断是否是博士相关
  if (!/博士|博后|研究员|教授|副教授|讲师|高层次人才|学术带头人/.test(rawDesc)) {
    return null;
  }

  return {
    title,
    organization: '杭州电子科技大学',
    location_city: '杭州',
    source_url: url,
    publish_date: publishDate,
    deadline: deadlineMatch ? deadlineMatch[1].replace(/[年月]/g, '-').replace(/日/, '') : undefined,
    raw_description: rawDesc,
  };
}

/**
 * 主爬取逻辑
 */
async function crawlHdu(): Promise<RawJobData[]> {
  const allItems: ListItem[] = [];

  // 1. 爬取列表页
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1
      ? `${BASE_URL}${LIST_PATH}.htm`
      : `${BASE_URL}${LIST_PATH}${page}.htm`;

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

  // 2. 爬取详情页
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

export const hduSource: CrawlerSource = {
  name: '杭州电子科技大学',
  crawl: crawlHdu,
};

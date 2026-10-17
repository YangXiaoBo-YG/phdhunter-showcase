/**
 * 爬虫 HTTP 客户端封装
 * 基于 fetch，自带重试、间隔、UA 轮换
 */

// UA 池
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

/** 获取随机 UA */
export function getRandomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/** 随机延迟 */
export function delay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 带重试的 fetch */
export async function fetchWithRetry(
  url: string,
  options?: {
    maxRetry?: number;
    timeout?: number;
    headers?: Record<string, string>;
  },
): Promise<string> {
  const maxRetry = options?.maxRetry ?? 2;
  const timeout = options?.timeout ?? 30000;

  for (let attempt = 0; attempt <= maxRetry; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': getRandomUA(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          ...options?.headers,
        },
      });

      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      return await res.text();
    } catch (e) {
      if (attempt === maxRetry) throw e;
      console.log(`  重试 ${attempt + 1}/${maxRetry}: ${(e as Error).message}`);
      await delay(1000, 3000);
    }
  }

  throw new Error('不应到达此处');
}

/** 带重试的 fetch JSON */
export async function fetchJsonWithRetry<T = unknown>(
  url: string,
  options?: {
    maxRetry?: number;
    timeout?: number;
    headers?: Record<string, string>;
    method?: string;
    body?: string;
  },
): Promise<T> {
  const maxRetry = options?.maxRetry ?? 2;
  const timeout = options?.timeout ?? 30000;

  for (let attempt = 0; attempt <= maxRetry; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(url, {
        method: options?.method ?? 'GET',
        signal: controller.signal,
        body: options?.body,
        headers: {
          'User-Agent': getRandomUA(),
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      return await res.json() as T;
    } catch (e) {
      if (attempt === maxRetry) throw e;
      console.log(`  重试 ${attempt + 1}/${maxRetry}: ${(e as Error).message}`);
      await delay(1000, 3000);
    }
  }

  throw new Error('不应到达此处');
}

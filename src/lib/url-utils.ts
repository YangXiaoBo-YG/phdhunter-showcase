/**
 * URL 工具：判断原始公告链接是否可公开访问
 */

// 已知需要登录或无法公开访问的域名
const BLOCKED_DOMAINS = [
  'ehr.zju.edu.cn',    // 浙大招聘系统需登录
];

/**
 * 判断 source_url 是否可以公开访问
 */
export function isPublicUrl(url: string): boolean {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname;
    return !BLOCKED_DOMAINS.some((d) => hostname.includes(d));
  } catch {
    return false;
  }
}

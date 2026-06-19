/**
 * URL 规范化工具
 *
 * 将 URL 规范化为统一格式，用于去重
 */

/**
 * 规范化 URL
 *
 * - 统一协议（https → http 去重时统一）
 * - 去除尾部斜杠
 * - 去除常见跟踪参数（utm_*, fbclid 等）
 * - 小写域名
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // 小写协议和域名
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();

    // 去除尾部斜杠
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    parsed.pathname = pathname;

    // 去除跟踪参数
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'msclkid', 'ref', 'source',
    ];
    for (const param of trackingParams) {
      parsed.searchParams.delete(param);
    }

    // 排序剩余参数（保证一致性）
    const params = new URLSearchParams(parsed.searchParams);
    const sortedParams = new URLSearchParams();
    for (const key of Array.from(params.keys()).sort()) {
      sortedParams.set(key, params.get(key) || '');
    }
    parsed.search = sortedParams.toString();

    // 去除 hash
    parsed.hash = '';

    return parsed.toString();
  } catch {
    // 如果解析失败，返回原始 URL（小写）
    return url.toLowerCase().trim();
  }
}

/**
 * 检查两个 URL 是否相同（规范化后比较）
 */
export function isSameUrl(url1: string, url2: string): boolean {
  return normalizeUrl(url1) === normalizeUrl(url2);
}

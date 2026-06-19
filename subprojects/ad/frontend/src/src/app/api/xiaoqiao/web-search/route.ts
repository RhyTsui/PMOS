import { NextRequest, NextResponse } from 'next/server';

interface SearchItem {
  title: string;
  url: string;
  snippet: string;
  siteName?: string;
  publisher?: string;
}

interface SearchRequestBody {
  query?: string;
  q?: string;
  maxResults?: number;
  locale?: string;
  freshness?: string;
}

interface SearchResponse {
  results: SearchItem[];
  query: string;
  count: number;
  provider: string;
  retrievedAt: string;
  warning?: string;
}

interface WeatherForecastRow {
  date: string;
  weather: string;
  min: unknown;
  max: unknown;
  rain: unknown;
  wind: unknown;
}

const DDG_HTML_ENDPOINT = 'https://html.duckduckgo.com/html/';
const BING_HTML_ENDPOINT = 'https://www.bing.com/search';
const WTTR_ENDPOINT = 'https://wttr.in';
const OPEN_METEO_GEOCODING_ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';
const OPEN_METEO_FORECAST_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const DEFAULT_MAX_RESULTS = 5;
const SEARCH_TIMEOUT_MS = 10000;
const DDG_TIMEOUT_MS = 3500;
const BING_TIMEOUT_MS = 10000;
const WEATHER_TIMEOUT_MS = 10000;
const WEATHER_FORECAST_DAYS = 10;

function parseDuckDuckGoHtml(html: string): SearchItem[] {
  const results: SearchItem[] = [];

  // DuckDuckGo HTML search results use <a class="result__url"> and <a class="result__snippet">
  // Each result block is wrapped in <div class="result results_links results_links_deep web-result">
  const resultBlocks = html.split(/class="result\s+results_links[^"]*web-result[^"]*"/i);

  for (let i = 1; i < resultBlocks.length && results.length < 20; i++) {
    const block = resultBlocks[i];

    // Extract URL from result__url or result__a link
    const urlMatch = block.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i)
      || block.match(/class="result__url"[^>]*href="([^"]+)"[^>]*>/i);

    // Extract title from result__a
    const titleMatch = block.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/i);

    // Extract snippet from result__snippet
    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i)
      || block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:td|div)>/i);

    if (!urlMatch && !titleMatch) continue;

    let url = urlMatch?.[1] || '';
    // DuckDuckGo wraps URLs through their redirect: //duckduckgo.com/l/?uddg=ENCODED_URL
    const ddgRedirect = url.match(/[?&]uddg=([^&]+)/i);
    if (ddgRedirect?.[1]) {
      try { url = decodeURIComponent(ddgRedirect[1]); } catch { /* keep original */ }
    }

    const title = cleanHtml(titleMatch?.[1] || url);
    const snippet = cleanHtml(snippetMatch?.[1] || '');

    if (!title && !url) continue;

    let siteName = '';
    try {
      siteName = new URL(url).hostname.replace(/^www\./, '');
    } catch { /* ignore */ }

    results.push({ title, url, snippet, siteName });
  }

  return results;
}

function cleanHtml(raw: string): string {
  return String(raw || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&#(\d+);/g, (_, value) => {
      const code = Number.parseInt(value, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseBingHtml(html: string): SearchItem[] {
  const results: SearchItem[] = [];
  const blocks = html.split(/<li\s+class="b_algo"[^>]*>/i);

  for (let i = 1; i < blocks.length && results.length < 20; i++) {
    const block = blocks[i];
    const linkMatch = block.match(/<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h2>/i);
    if (!linkMatch) continue;
    const url = cleanHtml(linkMatch[1]);
    const title = cleanHtml(linkMatch[2]);
    const snippetMatch = block.match(/<div[^>]*class="b_caption"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i)
      || block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const snippet = cleanHtml(snippetMatch?.[1] || '');
    if (!title || !url) continue;

    let siteName = '';
    try {
      siteName = new URL(url).hostname.replace(/^www\./, '');
    } catch { /* ignore */ }

    results.push({ title, url, snippet, siteName });
  }

  return results;
}

function isWeatherQuery(query: string): boolean {
  return /天气|气温|温度|降雨|下雨|晴|多云|预报|大风|湿度/.test(query);
}

function extractWeatherLocation(query: string): string {
  const cleaned = query
    .replace(/[?？!！]/g, '')
    .replace(/(今天|明天|后天|本周|这周|周一|周二|周三|周四|周五|周六|周日|星期一|星期二|星期三|星期四|星期五|星期六|星期日|最近|未来|如何|怎么样|怎么|的|天气|气温|温度|降雨|下雨|预报)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.split(' ').find(Boolean) || '';
}

function formatWeatherLocationTitle(location: string): string {
  return `${location} 天气`;
}

export function formatShanghaiDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function daysUntilWeekday(targetWeekday: number): number {
  const weekdayLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    weekday: 'short',
  }).format(new Date());
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const shanghaiWeekday = weekdayMap[weekdayLabel] ?? new Date().getDay();
  const delta = (targetWeekday - shanghaiWeekday + 7) % 7;
  return delta === 0 ? 7 : delta;
}

export function inferWeatherTargetOffsetDays(query: string): number | null {
  const normalized = query.replace(/\s+/g, '');
  const weekdayMatch = normalized.match(/(本周|这周|下周|下)?(?:周|星期)([一二三四五六日天])/);
  if (weekdayMatch?.[2]) {
    const weekdayMap: Record<string, number> = {
      日: 0,
      天: 0,
      一: 1,
      二: 2,
      三: 3,
      四: 4,
      五: 5,
      六: 6,
    };
    const baseDays = daysUntilWeekday(weekdayMap[weekdayMatch[2]] ?? 0);
    return weekdayMatch[1]?.includes('下') ? baseDays + 7 : baseDays;
  }
  if (/后天/.test(normalized)) return 2;
  if (/明天/.test(normalized)) return 1;
  if (/今天|今日/.test(normalized)) return 0;
  return null;
}

export function inferWeatherForecastDays(query: string): number {
  const normalized = query.replace(/\s+/g, '');
  const targetOffset = inferWeatherTargetOffsetDays(query);
  if (targetOffset != null) {
    return Math.min(16, Math.max(WEATHER_FORECAST_DAYS, targetOffset + 1));
  }
  if (/未来\s*(?:一)?周|7\s*天|七天/.test(normalized)) return 10;
  if (/后天/.test(normalized)) return 4;
  if (/明天/.test(normalized)) return 3;
  return WEATHER_FORECAST_DAYS;
}

export function weatherCodeText(code: unknown): string {
  if (code == null) return '暂无描述';
  const value = Number(code);
  if (!Number.isFinite(value)) return '暂无描述';
  if (value === 0) return '晴';
  if ([1, 2].includes(value)) return '少云';
  if (value === 3) return '多云';
  if ([45, 48].includes(value)) return '雾';
  if ([51, 53, 55, 56, 57].includes(value)) return '毛毛雨';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(value)) return '雨';
  if ([71, 73, 75, 77, 85, 86].includes(value)) return '雪';
  if ([95, 96, 99].includes(value)) return '雷雨';
  return `天气代码 ${value}`;
}

export async function fetchJsonWithTimeout(url: string, timeoutMs: number): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; XiaoQiao/1.0)' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return await response.json().catch(() => null);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function tryGeocode(location: string): Promise<any | null> {
  const geocodeUrl = new URL(OPEN_METEO_GEOCODING_ENDPOINT);
  geocodeUrl.searchParams.set('name', location);
  geocodeUrl.searchParams.set('count', '3');
  geocodeUrl.searchParams.set('language', 'zh');
  geocodeUrl.searchParams.set('format', 'json');
  const geocode = await fetchJsonWithTimeout(geocodeUrl.toString(), WEATHER_TIMEOUT_MS);
  const results = Array.isArray(geocode?.results) ? geocode.results : [];
  return results[0] || null;
}

function buildWeatherLocationCandidates(query: string, location: string): string[] {
  const stripped = location.replace(/[山湖河峰岭景区公园]+$/g, '').trim();
  const broader = query.replace(/(天气|气温|温度|预报|周五|本周|下周|今天|明天|后天|怎么样|如何)/g, '').trim();
  return Array.from(new Set([location, stripped, broader].map(item => item.trim()).filter(Boolean)));
}

export async function fetchOpenMeteoWeatherItems(query: string, maxResults: number): Promise<SearchItem[]> {
  const location = extractWeatherLocation(query);
  let place: any | null = null;
  for (const candidate of buildWeatherLocationCandidates(query, location)) {
    place = await tryGeocode(candidate);
    if (place) break;
  }
  if (!place || typeof place.latitude !== 'number' || typeof place.longitude !== 'number') return [];

  const forecastDays = inferWeatherForecastDays(query);
  const forecastUrl = new URL(OPEN_METEO_FORECAST_ENDPOINT);
  forecastUrl.searchParams.set('latitude', String(place.latitude));
  forecastUrl.searchParams.set('longitude', String(place.longitude));
  forecastUrl.searchParams.set('daily', [
    'weather_code',
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_probability_max',
    'wind_speed_10m_max',
  ].join(','));
  forecastUrl.searchParams.set('timezone', place.timezone || 'Asia/Shanghai');
  forecastUrl.searchParams.set('forecast_days', String(forecastDays));
  const forecast = await fetchJsonWithTimeout(forecastUrl.toString(), WEATHER_TIMEOUT_MS);
  const daily = forecast?.daily;
  const dates = Array.isArray(daily?.time) ? daily.time : [];
  if (!dates.length) return [];

  const placeName = [place.name, place.admin1, place.country].filter(Boolean).join('，') || location;
  const targetOffset = inferWeatherTargetOffsetDays(query);
  const rows: WeatherForecastRow[] = dates.map((date: string, index: number) => ({
    date,
    weather: weatherCodeText(daily.weather_code?.[index]),
    min: daily.temperature_2m_min?.[index],
    max: daily.temperature_2m_max?.[index],
    rain: daily.precipitation_probability_max?.[index],
    wind: daily.wind_speed_10m_max?.[index],
  }));
  const requestedDate = targetOffset == null ? '' : formatShanghaiDate(addDays(new Date(), targetOffset));
  const focus = rows.find(row => row.date === requestedDate) || rows[0];
  const focusPart = focus
    ? `目标日期 ${focus.date}：${focus.weather}，${focus.min ?? '-'}-${focus.max ?? '-'}°C${focus.rain == null ? '' : `，降水概率 ${focus.rain}%`}。`
    : '';
  const coveragePart = rows.length
    ? `公开天气源当前返回 ${rows[0].date} 至 ${rows[rows.length - 1].date} 的逐日预报。`
    : '';
  return [{
    title: `${placeName}天气预报 - Open-Meteo`,
    url: `https://open-meteo.com/en/docs?latitude=${encodeURIComponent(String(place.latitude))}&longitude=${encodeURIComponent(String(place.longitude))}`,
    snippet: [focusPart, coveragePart].filter(Boolean).join(' '),
    siteName: 'Open-Meteo',
    publisher: 'Open-Meteo',
  }].slice(0, maxResults);
}

export function formatWeatherSnippet(data: any, query = ''): string {
  const current = Array.isArray(data?.current_condition) ? data.current_condition[0] : null;
  const currentDesc = Array.isArray(current?.weatherDesc) ? current.weatherDesc[0]?.value : '';
  const currentPart = current
    ? `当前：${current.temp_C ?? '-'}°C，体感 ${current.FeelsLikeC ?? '-'}°C，${currentDesc || '暂无描述'}，湿度 ${current.humidity ?? '-'}%。`
    : '';
  const forecast = Array.isArray(data?.weather) ? data.weather.slice(0, 4) : [];
  const targetOffset = inferWeatherTargetOffsetDays(query);
  const requestedDate = targetOffset == null ? '' : formatShanghaiDate(addDays(new Date(), targetOffset));
  const firstDate = forecast[0]?.date;
  const lastDate = forecast[forecast.length - 1]?.date;
  const targetItem = requestedDate ? forecast.find((item: any) => item.date === requestedDate) : null;
  if (requestedDate && forecast.length && !targetItem) {
    return [
      currentPart,
      `当前公开天气源仅返回 ${firstDate} 至 ${lastDate} 的预报，无法确认目标日期 ${requestedDate} 的天气。`,
    ].filter(Boolean).join(' ');
  }
  if (targetItem) {
    const hourly = Array.isArray(targetItem.hourly) ? targetItem.hourly[Math.min(4, targetItem.hourly.length - 1)] : null;
    const desc = Array.isArray(hourly?.weatherDesc) ? hourly.weatherDesc[0]?.value : '';
    return [
      `目标日期 ${targetItem.date}：${targetItem.mintempC ?? '-'}-${targetItem.maxtempC ?? '-'}°C${desc ? `，${desc}` : ''}。`,
      firstDate && lastDate ? `公开天气源当前返回 ${firstDate} 至 ${lastDate} 的逐日预报。` : '',
    ].filter(Boolean).join(' ');
  }
  const forecastPart = forecast.map((item: any) => {
    const hourly = Array.isArray(item.hourly) ? item.hourly[Math.min(4, item.hourly.length - 1)] : null;
    const desc = Array.isArray(hourly?.weatherDesc) ? hourly.weatherDesc[0]?.value : '';
    return `${item.date}：${item.mintempC ?? '-'}-${item.maxtempC ?? '-'}°C${desc ? `，${desc}` : ''}`;
  }).filter(Boolean).join('；');
  return [currentPart, forecastPart ? `预报：${forecastPart}` : ''].filter(Boolean).join(' ');
}

async function fetchWeatherItems(query: string, maxResults: number): Promise<SearchItem[]> {
  if (!isWeatherQuery(query)) return [];
  const openMeteoItems = await fetchOpenMeteoWeatherItems(query, maxResults).catch(() => []);
  if (openMeteoItems.length) return openMeteoItems;
  const location = extractWeatherLocation(query);
  const url = `${WTTR_ENDPOINT}/${encodeURIComponent(location)}?format=j1&lang=zh`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; XiaoQiao/1.0)' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) return [];
    const data = await response.json().catch(() => null);
    const snippet = formatWeatherSnippet(data, query);
    if (!snippet) return [];
    return [{
      title: `${formatWeatherLocationTitle(location)} - 公开天气预报`,
      url: `${WTTR_ENDPOINT}/${encodeURIComponent(location)}`,
      snippet,
      siteName: 'wttr.in',
      publisher: 'wttr.in',
    }].slice(0, maxResults);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as SearchRequestBody;
  const query = String(body.query || body.q || '').trim();

  if (!query) {
    return NextResponse.json({ error: 'query_required', results: [], count: 0 }, { status: 400 });
  }

  const maxResults = Math.min(Math.max(Number(body.maxResults || DEFAULT_MAX_RESULTS), 1), 20);

  try {
    const weatherResults = await fetchWeatherItems(query, maxResults);
    if (weatherResults.length) {
      const payload: SearchResponse = {
        results: weatherResults,
        query,
        count: weatherResults.length,
        provider: weatherResults[0]?.siteName || 'weather',
        retrievedAt: new Date().toISOString(),
      };
      return NextResponse.json(payload);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DDG_TIMEOUT_MS);

    let provider = 'duckduckgo';
    let providerWarning = '';
    let results: SearchItem[] = [];
    try {
      const response = await fetch(DDG_HTML_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (compatible; XiaoQiao/1.0)',
        },
        body: `q=${encodeURIComponent(query)}`,
        signal: controller.signal,
        cache: 'no-store',
      });
      if (response.ok) {
        const html = await response.text();
        results = parseDuckDuckGoHtml(html).slice(0, maxResults);
      }
    } catch {
      // Fall through to Bing HTML search below.
    } finally {
      clearTimeout(timer);
    }

    if (!results.length) {
      provider = 'bing';
      const bingController = new AbortController();
      const bingTimer = setTimeout(() => bingController.abort(), BING_TIMEOUT_MS);
      try {
        const url = new URL(BING_HTML_ENDPOINT);
        url.searchParams.set('q', query);
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; XiaoQiao/1.0)',
            'Accept-Language': 'zh-CN,zh;q=0.9',
          },
          signal: bingController.signal,
          cache: 'no-store',
          redirect: 'follow',
        });
        if (response.ok) {
          const html = await response.text();
          results = parseBingHtml(html).slice(0, maxResults);
        } else {
          providerWarning = `bing_http_${response.status}`;
        }
      } catch (error) {
        providerWarning = error instanceof Error ? error.message : String(error);
      } finally {
        clearTimeout(bingTimer);
      }
    }

    const payload: SearchResponse = {
      results,
      query,
      count: results.length,
      provider,
      retrievedAt: new Date().toISOString(),
      warning: results.length ? undefined : providerWarning || undefined,
    };

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      error: 'search_failed',
      message,
      results: [],
      count: 0,
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || searchParams.get('query') || '';
  const maxResults = Number(searchParams.get('maxResults') || DEFAULT_MAX_RESULTS);

  if (!query) {
    return NextResponse.json({ error: 'query_required', results: [], count: 0 }, { status: 400 });
  }

  // Delegate to POST logic
  const delegatedRequest = new Request(request.url, {
    method: 'POST',
    body: JSON.stringify({ query, maxResults }),
    headers: { 'Content-Type': 'application/json' },
  });
  return POST(delegatedRequest as unknown as NextRequest);
}

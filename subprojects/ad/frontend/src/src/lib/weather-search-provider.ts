import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export interface WeatherSearchItem {
  title: string;
  url: string;
  snippet: string;
  siteName?: string;
  publisher?: string;
  updatedAt?: string;
}

interface WeatherForecastRow {
  date: string;
  weather: string;
  min: unknown;
  max: unknown;
  rain: unknown;
  wind: unknown;
}

const WTTR_ENDPOINT = 'https://wttr.in';
const OPEN_METEO_GEOCODING_ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';
const OPEN_METEO_FORECAST_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const WEATHER_TIMEOUT_MS = 10000;
const WEATHER_FORECAST_DAYS = 7;
const execFileAsync = promisify(execFile);

export function isWeatherQuery(query: string): boolean {
  return /天气|气温|温度|降雨|下雨|晴|多云|预报|大风|湿度/.test(query);
}

export function extractWeatherLocation(query: string): string {
  const cleaned = query
    .replace(/[?？!！]/g, '')
    .replace(/((?:本周|这周|下周|下)?周[一二三四五六日天]|(?:下)?星期[一二三四五六日天]|今天|明天|后天|最近|未来|如何|怎么样|怎么|的|天气|气温|温度|降雨|下雨|预报)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.split(' ').find(Boolean) || '';
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
    return daysUntilWeekday(weekdayMap[weekdayMatch[2]] ?? 0);
  }
  if (/后天/.test(normalized)) return 2;
  if (/明天/.test(normalized)) return 1;
  if (/今天|今日/.test(normalized)) return 0;
  return null;
}

export function inferWeatherForecastDays(query: string): number {
  const normalized = query.replace(/\s+/g, '');
  const targetOffset = inferWeatherTargetOffsetDays(query);
  if (targetOffset != null) return Math.min(16, Math.max(WEATHER_FORECAST_DAYS, targetOffset + 1));
  if (/未来\s*(?:一)?周|7\s*天|七天/.test(normalized)) return 7;
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

async function fetchJsonWithTimeout(url: string, timeoutMs: number): Promise<any> {
  try {
    const parsed = new URL(url);
    const isNativeFetch = typeof fetch === 'function' && /\[native code\]/.test(Function.prototype.toString.call(fetch));
    if (isNativeFetch && parsed.hostname.endsWith('open-meteo.com')) {
      const curlJson = await fetchJsonWithCurl(url, timeoutMs);
      if (curlJson) return curlJson;
    }
  } catch {
    // Fall through to fetch for non-standard URLs.
  }
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
    return await fetchJsonWithCurl(url, timeoutMs);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonWithCurl(url: string, timeoutMs: number): Promise<any> {
  try {
    const curlBin = process.platform === 'win32' ? 'curl.exe' : 'curl';
    const { stdout } = await execFileAsync(curlBin, ['-s', '--max-time', String(Math.ceil(timeoutMs / 1000)), url], {
      timeout: timeoutMs + 1000,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
    return stdout ? JSON.parse(stdout) : null;
  } catch {
    return null;
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

export async function fetchOpenMeteoWeatherItems(query: string, maxResults: number): Promise<WeatherSearchItem[]> {
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
    updatedAt: new Date().toISOString(),
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

export async function fetchWeatherSearchItems(query: string, maxResults: number): Promise<WeatherSearchItem[]> {
  if (!isWeatherQuery(query)) return [];
  const openMeteoItems = await fetchOpenMeteoWeatherItems(query, maxResults).catch(() => []);
  if (openMeteoItems.length) return openMeteoItems;
  const location = extractWeatherLocation(query);
  const url = `${WTTR_ENDPOINT}/${encodeURIComponent(location)}?format=j1&lang=zh`;
  const data = await fetchJsonWithTimeout(url, WEATHER_TIMEOUT_MS);
  const snippet = formatWeatherSnippet(data, query);
  if (!snippet) return [];
  return [{
    title: `${location} 天气 - 公开天气预报`,
    url: `${WTTR_ENDPOINT}/${encodeURIComponent(location)}`,
    snippet,
    siteName: 'wttr.in',
    publisher: 'wttr.in',
    updatedAt: new Date().toISOString(),
  }].slice(0, maxResults);
}

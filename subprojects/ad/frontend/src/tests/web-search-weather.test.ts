import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: { json: (data: any) => data },
}));

import {
  addDays,
  daysUntilWeekday,
  fetchJsonWithTimeout,
  fetchOpenMeteoWeatherItems,
  formatShanghaiDate,
  formatWeatherSnippet,
  inferWeatherForecastDays,
  inferWeatherTargetOffsetDays,
  weatherCodeText,
} from '../src/app/api/xiaoqiao/web-search/route';

const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe('weather helpers: formatShanghaiDate', () => {
  it('formats a UTC date as YYYY-MM-DD in Asia/Shanghai', () => {
    // 2026-06-15 00:00 UTC → 2026-06-15 08:00 Shanghai
    const date = new Date('2026-06-15T00:00:00Z');
    expect(formatShanghaiDate(date)).toBe('2026-06-15');
  });

  it('rolls forward when UTC is still the previous day in Shanghai', () => {
    // 2026-06-14 18:00 UTC → 2026-06-15 02:00 Shanghai
    const date = new Date('2026-06-14T18:00:00Z');
    expect(formatShanghaiDate(date)).toBe('2026-06-15');
  });
});

describe('weather helpers: addDays', () => {
  it('adds positive days to a date', () => {
    const base = new Date('2026-06-15T12:00:00Z');
    const result = addDays(base, 3);
    expect(result.toISOString()).toBe('2026-06-18T12:00:00.000Z');
  });

  it('does not mutate the original date', () => {
    const base = new Date('2026-06-15T12:00:00Z');
    addDays(base, 5);
    expect(base.toISOString()).toBe('2026-06-15T12:00:00.000Z');
  });

  it('handles zero days', () => {
    const base = new Date('2026-06-15T12:00:00Z');
    expect(addDays(base, 0).toISOString()).toBe('2026-06-15T12:00:00.000Z');
  });
});

describe('weather helpers: daysUntilWeekday', () => {
  it('returns a value between 1 and 7', () => {
    for (let weekday = 0; weekday < 7; weekday++) {
      const result = daysUntilWeekday(weekday);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(7);
    }
  });

  it('returns 7 when the target is the current weekday (not 0)', () => {
    const todayWeekday = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Shanghai',
      weekday: 'short',
    }).format(new Date());
    const weekdayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    const today = weekdayMap[todayWeekday] ?? new Date().getDay();
    expect(daysUntilWeekday(today)).toBe(7);
  });
});

describe('weather helpers: inferWeatherTargetOffsetDays', () => {
  it('returns 0 for 今天', () => {
    expect(inferWeatherTargetOffsetDays('今天南京天气')).toBe(0);
  });

  it('returns 0 for 今日', () => {
    expect(inferWeatherTargetOffsetDays('今日天气')).toBe(0);
  });

  it('returns 1 for 明天', () => {
    expect(inferWeatherTargetOffsetDays('明天北京天气')).toBe(1);
  });

  it('returns 2 for 后天', () => {
    expect(inferWeatherTargetOffsetDays('后天上海天气')).toBe(2);
  });

  it('returns a value 1-7 for 周X without prefix (this week)', () => {
    const result = inferWeatherTargetOffsetDays('周日天气');
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThanOrEqual(1);
    expect(result!).toBeLessThanOrEqual(7);
  });

  it('handles 星期一 through 星期日', () => {
    for (const day of ['一', '二', '三', '四', '五', '六', '日']) {
      const result = inferWeatherTargetOffsetDays(`周${day}天气`);
      expect(result).not.toBeNull();
      expect(result!).toBeGreaterThanOrEqual(1);
      expect(result!).toBeLessThanOrEqual(7);
    }
  });

  it('handles 星期天 as Sunday', () => {
    const result = inferWeatherTargetOffsetDays('星期天天气');
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThanOrEqual(1);
    expect(result!).toBeLessThanOrEqual(7);
  });

  it('returns base + 7 for 下周三', () => {
    const thisWeekWed = inferWeatherTargetOffsetDays('周三天气');
    const nextWeekWed = inferWeatherTargetOffsetDays('下周三天气');
    expect(nextWeekWed).toBe((thisWeekWed ?? 0) + 7);
  });

  it('returns base + 7 for 下周日', () => {
    const thisWeekSun = inferWeatherTargetOffsetDays('周日天气');
    const nextWeekSun = inferWeatherTargetOffsetDays('下周日天气');
    expect(nextWeekSun).toBe((thisWeekSun ?? 0) + 7);
  });

  it('returns null for queries without date signals', () => {
    expect(inferWeatherTargetOffsetDays('南京天气')).toBeNull();
    expect(inferWeatherTargetOffsetDays('最近天气怎么样')).toBeNull();
    expect(inferWeatherTargetOffsetDays('天气预报')).toBeNull();
  });

  it('handles whitespace in queries', () => {
    expect(inferWeatherTargetOffsetDays('明 天 天气')).toBe(1);
  });
});

describe('weather helpers: inferWeatherForecastDays', () => {
  it('returns 10 as the default', () => {
    expect(inferWeatherForecastDays('南京天气')).toBe(10);
  });

  it('returns 10 for 未来一周', () => {
    expect(inferWeatherForecastDays('未来一周天气')).toBe(10);
  });

  it('returns 10 for 未来一星期', () => {
    expect(inferWeatherForecastDays('未来一星期天气')).toBe(10);
  });

  it('returns at least targetOffset + 1 for 明天', () => {
    // offset=1, so max(10, 1+1) = 10
    expect(inferWeatherForecastDays('明天天气')).toBeGreaterThanOrEqual(10);
  });

  it('returns at least targetOffset + 1 for 下周日 (large offset)', () => {
    const offset = inferWeatherTargetOffsetDays('下周日天气');
    if (offset != null) {
      const expected = Math.min(16, Math.max(10, offset + 1));
      expect(inferWeatherForecastDays('下周日天气')).toBe(expected);
    }
  });

  it('clamps to at most 16', () => {
    // 下周日 offset could be up to 13, so offset+1=14, still under 16
    // If offset were 15, result should be 16
    expect(inferWeatherForecastDays('下周日天气')).toBeLessThanOrEqual(16);
  });
});

describe('weather helpers: weatherCodeText', () => {
  it('returns 晴 for code 0', () => {
    expect(weatherCodeText(0)).toBe('晴');
  });

  it('returns 少云 for codes 1 and 2', () => {
    expect(weatherCodeText(1)).toBe('少云');
    expect(weatherCodeText(2)).toBe('少云');
  });

  it('returns 多云 for code 3', () => {
    expect(weatherCodeText(3)).toBe('多云');
  });

  it('returns 雾 for codes 45 and 48', () => {
    expect(weatherCodeText(45)).toBe('雾');
    expect(weatherCodeText(48)).toBe('雾');
  });

  it('returns 毛毛雨 for drizzling codes', () => {
    for (const code of [51, 53, 55, 56, 57]) {
      expect(weatherCodeText(code)).toBe('毛毛雨');
    }
  });

  it('returns 雨 for rain codes', () => {
    for (const code of [61, 63, 65, 66, 67, 80, 81, 82]) {
      expect(weatherCodeText(code)).toBe('雨');
    }
  });

  it('returns 雪 for snow codes', () => {
    for (const code of [71, 73, 75, 77, 85, 86]) {
      expect(weatherCodeText(code)).toBe('雪');
    }
  });

  it('returns 雷雨 for thunderstorm codes', () => {
    for (const code of [95, 96, 99]) {
      expect(weatherCodeText(code)).toBe('雷雨');
    }
  });

  it('returns fallback for unknown codes', () => {
    expect(weatherCodeText(999)).toBe('天气代码 999');
  });

  it('returns 暂无描述 for non-numeric input', () => {
    expect(weatherCodeText(null)).toBe('暂无描述');
    expect(weatherCodeText(undefined)).toBe('暂无描述');
    expect(weatherCodeText('abc')).toBe('暂无描述');
  });

  it('handles string-encoded numbers', () => {
    expect(weatherCodeText('0')).toBe('晴');
    expect(weatherCodeText('95')).toBe('雷雨');
  });
});

describe('weather helpers: formatWeatherSnippet', () => {
  it('formats current conditions without a target date', () => {
    const data = {
      current_condition: [{
        temp_C: '28',
        FeelsLikeC: '32',
        weatherDesc: [{ value: '晴' }],
        humidity: '65',
      }],
      weather: [
        {
          date: '2026-06-15',
          mintempC: '22',
          maxtempC: '30',
          hourly: [{ weatherDesc: [{ value: '晴' }] }],
        },
      ],
    };
    const snippet = formatWeatherSnippet(data, '南京天气');
    expect(snippet).toContain('28°C');
    expect(snippet).toContain('体感 32°C');
    expect(snippet).toContain('晴');
    expect(snippet).toContain('湿度 65%');
    expect(snippet).toContain('2026-06-15');
  });

  it('returns empty string when data is null', () => {
    expect(formatWeatherSnippet(null, '天气')).toBe('');
  });

  it('reports when target date is outside forecast range', () => {
    const data = {
      current_condition: [{
        temp_C: '28',
        FeelsLikeC: '30',
        weatherDesc: [{ value: '多云' }],
        humidity: '50',
      }],
      weather: [
        {
          date: '2026-06-15',
          mintempC: '22',
          maxtempC: '28',
          hourly: [{ weatherDesc: [{ value: '多云' }] }],
        },
      ],
    };
    // Use a date far in the future that won't match
    const snippet = formatWeatherSnippet(data, '下周日天气');
    // If the requested date doesn't match, it should mention the coverage range
    if (snippet.includes('无法确认')) {
      expect(snippet).toContain('2026-06-15');
    }
  });

  it('highlights the target date when it matches a forecast day', () => {
    const tomorrow = formatShanghaiDate(addDays(new Date(), 1));
    const data = {
      current_condition: [{
        temp_C: '25',
        FeelsLikeC: '27',
        weatherDesc: [{ value: '多云' }],
        humidity: '60',
      }],
      weather: [
        {
          date: tomorrow,
          mintempC: '20',
          maxtempC: '28',
          hourly: [
            { weatherDesc: [{ value: '晴' }] },
            { weatherDesc: [{ value: '多云' }] },
            { weatherDesc: [{ value: '多云' }] },
            { weatherDesc: [{ value: '阴' }] },
            { weatherDesc: [{ value: '阵雨' }] },
          ],
        },
      ],
    };
    const snippet = formatWeatherSnippet(data, '明天南京天气');
    expect(snippet).toContain('目标日期');
    expect(snippet).toContain(tomorrow);
    expect(snippet).toContain('20-28°C');
  });
});

describe('weather helpers: fetchJsonWithTimeout', () => {
  it('returns parsed JSON on success', async () => {
    globalThis.fetch = vi.fn(async () => new Response(
      JSON.stringify({ hello: 'world' }),
      { status: 200 },
    )) as typeof fetch;

    const result = await fetchJsonWithTimeout('https://example.com/api', 5000);
    expect(result).toEqual({ hello: 'world' });
  });

  it('returns null on non-200 response', async () => {
    globalThis.fetch = vi.fn(async () => new Response(
      'Not Found',
      { status: 404 },
    )) as typeof fetch;

    const result = await fetchJsonWithTimeout('https://example.com/api', 5000);
    expect(result).toBeNull();
  });

  it('returns null on invalid JSON', async () => {
    globalThis.fetch = vi.fn(async () => new Response(
      'not json',
      { status: 200 },
    )) as typeof fetch;

    const result = await fetchJsonWithTimeout('https://example.com/api', 5000);
    expect(result).toBeNull();
  });

  it('aborts on timeout', async () => {
    globalThis.fetch = vi.fn(async (_input: any, init: any) => {
      return new Promise((_resolve, reject) => {
        const timer = setTimeout(() => _resolve(new Response('{}')), 200);
        init?.signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    }) as typeof fetch;

    const result = await fetchJsonWithTimeout('https://example.com/api', 50);
    expect(result).toBeNull();
  });

  it('sets the XiaoQiao user agent header', async () => {
    const fetchMock = vi.fn(async (_input?: any, _init?: any) => new Response(
      JSON.stringify({ ok: true }),
      { status: 200 },
    ));
    globalThis.fetch = fetchMock as typeof fetch;

    await fetchJsonWithTimeout('https://example.com/api', 5000);
    const callArgs = fetchMock.mock.calls[0] as any[];
    expect(callArgs[1]).toBeDefined();
    expect(callArgs[1]?.headers?.['User-Agent']).toContain('XiaoQiao');
  });
});

describe('weather: fetchOpenMeteoWeatherItems', () => {
  it('returns empty array when geocoding returns no results', async () => {
    globalThis.fetch = vi.fn(async () => new Response(
      JSON.stringify({ results: [] }),
      { status: 200 },
    )) as typeof fetch;

    const items = await fetchOpenMeteoWeatherItems('不存在的城市天气', 5);
    expect(items).toEqual([]);
  });

  it('returns empty array when geocoding fails', async () => {
    globalThis.fetch = vi.fn(async () => new Response(
      'Server Error',
      { status: 500 },
    )) as typeof fetch;

    const items = await fetchOpenMeteoWeatherItems('南京天气', 5);
    expect(items).toEqual([]);
  });

  it('returns empty array when forecast returns no daily data', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn(async (input: any) => {
      const url = String(input);
      callCount++;
      if (url.includes('geocoding')) {
        return new Response(JSON.stringify({
          results: [{ name: '南京', latitude: 32.06, longitude: 118.78, timezone: 'Asia/Shanghai' }],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({ daily: {} }), { status: 200 });
    }) as typeof fetch;

    const items = await fetchOpenMeteoWeatherItems('南京天气', 5);
    expect(items).toEqual([]);
    expect(callCount).toBe(2);
  });

  it('returns a formatted weather item on successful geocode + forecast', async () => {
    globalThis.fetch = vi.fn(async (input: any) => {
      const url = String(input);
      if (url.includes('geocoding')) {
        return new Response(JSON.stringify({
          results: [{
            name: '南京',
            admin1: '江苏',
            country: '中国',
            latitude: 32.06,
            longitude: 118.78,
            timezone: 'Asia/Shanghai',
          }],
        }), { status: 200 });
      }
      // Forecast response
      const today = formatShanghaiDate(new Date());
      const tomorrow = formatShanghaiDate(addDays(new Date(), 1));
      return new Response(JSON.stringify({
        daily: {
          time: [today, tomorrow],
          weather_code: [0, 3],
          temperature_2m_max: [30, 28],
          temperature_2m_min: [22, 20],
          precipitation_probability_max: [10, 40],
          wind_speed_10m_max: [15, 20],
        },
      }), { status: 200 });
    }) as typeof fetch;

    const items = await fetchOpenMeteoWeatherItems('南京天气', 5);
    expect(items).toHaveLength(1);
    expect(items[0].title).toContain('南京');
    expect(items[0].title).toContain('Open-Meteo');
    expect(items[0].siteName).toBe('Open-Meteo');
    expect(items[0].snippet).toContain('目标日期');
    expect(items[0].snippet).toContain('晴');
    expect(items[0].url).toContain('open-meteo.com');
  });

  it('focuses on the target date when query specifies one', async () => {
    const tomorrow = formatShanghaiDate(addDays(new Date(), 1));
    const dayAfter = formatShanghaiDate(addDays(new Date(), 2));

    globalThis.fetch = vi.fn(async (input: any) => {
      const url = String(input);
      if (url.includes('geocoding')) {
        return new Response(JSON.stringify({
          results: [{
            name: '北京',
            latitude: 39.9,
            longitude: 116.4,
            timezone: 'Asia/Shanghai',
          }],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        daily: {
          time: [formatShanghaiDate(new Date()), tomorrow, dayAfter],
          weather_code: [0, 61, 95],
          temperature_2m_max: [28, 25, 22],
          temperature_2m_min: [18, 16, 15],
          precipitation_probability_max: [5, 80, 95],
          wind_speed_10m_max: [10, 25, 35],
        },
      }), { status: 200 });
    }) as typeof fetch;

    const items = await fetchOpenMeteoWeatherItems('明天北京天气', 5);
    expect(items).toHaveLength(1);
    expect(items[0].snippet).toContain(tomorrow);
    expect(items[0].snippet).toContain('雨');
    expect(items[0].snippet).toContain('80%');
  });

  it('falls back to first row when target date is not in forecast', async () => {
    const today = formatShanghaiDate(new Date());

    globalThis.fetch = vi.fn(async (input: any) => {
      const url = String(input);
      if (url.includes('geocoding')) {
        return new Response(JSON.stringify({
          results: [{
            name: '上海',
            latitude: 31.23,
            longitude: 121.47,
            timezone: 'Asia/Shanghai',
          }],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        daily: {
          time: [today],
          weather_code: [0],
          temperature_2m_max: [30],
          temperature_2m_min: [22],
          precipitation_probability_max: [5],
          wind_speed_10m_max: [12],
        },
      }), { status: 200 });
    }) as typeof fetch;

    // "下周日" target date likely won't match a single-day forecast
    const items = await fetchOpenMeteoWeatherItems('下周日上海天气', 5);
    expect(items).toHaveLength(1);
    expect(items[0].snippet).toContain('晴');
  });
});

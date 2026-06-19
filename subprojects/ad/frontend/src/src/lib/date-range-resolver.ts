export interface ParsedDateRange {
  start_date: string;
  end_date: string;
  period_type: 'day' | 'week' | 'month' | 'hour';
  is_explicit: boolean;
  requested_days?: number;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeIsoDate(year: string, month: string, day: string): string {
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function normalizeCompactDate(value: string): string {
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function shiftDate(days: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

export function parseRelativeDateRange(message: string): ParsedDateRange {
  const text = String(message || '').replace(/\s+/g, '');
  const explicit = text.match(/(\d{4}-\d{1,2}-\d{1,2})(?:至|到|~|—|-)(\d{4}-\d{1,2}-\d{1,2})/);
  if (explicit) {
    return {
      start_date: explicit[1],
      end_date: explicit[2],
      period_type: 'day',
      is_explicit: true,
    };
  }
  const cnRange = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日?(?:至|到|~|—|-)(\d{4})年(\d{1,2})月(\d{1,2})日?/);
  if (cnRange) {
    const start = `${cnRange[1]}-${cnRange[2].padStart(2, '0')}-${cnRange[3].padStart(2, '0')}`;
    const end = `${cnRange[4]}-${cnRange[5].padStart(2, '0')}-${cnRange[6].padStart(2, '0')}`;
    return { start_date: start, end_date: end, period_type: 'day', is_explicit: true };
  }
  const cnSingle = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (cnSingle) {
    const day = normalizeIsoDate(cnSingle[1], cnSingle[2], cnSingle[3]);
    return { start_date: day, end_date: day, period_type: 'day', is_explicit: true, requested_days: 1 };
  }
  const isoSingle = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoSingle) {
    const day = normalizeIsoDate(isoSingle[1], isoSingle[2], isoSingle[3]);
    return { start_date: day, end_date: day, period_type: 'day', is_explicit: true, requested_days: 1 };
  }
  const compactRange = text.match(/(\d{8})(?:至|到|~|—|-)(\d{8})/);
  if (compactRange) {
    return {
      start_date: normalizeCompactDate(compactRange[1]),
      end_date: normalizeCompactDate(compactRange[2]),
      period_type: 'day',
      is_explicit: true,
    };
  }
  const compactSingle = text.match(/(?:^|[^\d])(\d{8})(?:[^\d]|$)/);
  if (compactSingle) {
    const day = normalizeCompactDate(compactSingle[1]);
    return { start_date: day, end_date: day, period_type: 'day', is_explicit: true, requested_days: 1 };
  }
  const cnMonth = text.match(/(\d{4})年(\d{1,2})月/);
  if (cnMonth) {
    const year = Number(cnMonth[1]);
    const month = Number(cnMonth[2]);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return { start_date: formatDate(start), end_date: formatDate(end), period_type: 'month', is_explicit: true, requested_days: end.getDate() };
  }
  const shortDate = text.match(/(\d{1,2})月(\d{1,2})日/);
  if (shortDate && !cnSingle && !cnMonth) {
    const now = new Date();
    const year = now.getFullYear();
    const day = `${year}-${shortDate[1].padStart(2, '0')}-${shortDate[2].padStart(2, '0')}`;
    return { start_date: day, end_date: day, period_type: 'day', is_explicit: true, requested_days: 1 };
  }
  if (/(今天|今日)/.test(text)) {
    const day = formatDate(shiftDate(0));
    return { start_date: day, end_date: day, period_type: 'day', is_explicit: true, requested_days: 1 };
  }
  if (/(昨天|昨日)/.test(text)) {
    const day = formatDate(shiftDate(-1));
    return { start_date: day, end_date: day, period_type: 'day', is_explicit: true, requested_days: 1 };
  }
  if (/(前天|前日)/.test(text)) {
    const day = formatDate(shiftDate(-2));
    return { start_date: day, end_date: day, period_type: 'day', is_explicit: true, requested_days: 1 };
  }
  const recentDays = text.match(/(?:近|最近|过去)(\d{1,3})(?:天|日)/);
  if (recentDays) {
    const days = Math.max(1, Number(recentDays[1]) || 1);
    return {
      start_date: formatDate(shiftDate(-(days - 1))),
      end_date: formatDate(shiftDate(0)),
      period_type: 'day',
      is_explicit: true,
      requested_days: days,
    };
  }
  if (/(上周|本周)/.test(text)) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const day = now.getDay() || 7;
    if (/上周/.test(text)) {
      const start = new Date(now);
      start.setDate(now.getDate() - day - 6);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start_date: formatDate(start), end_date: formatDate(end), period_type: 'week', is_explicit: true, requested_days: 7 };
    }
    const start = new Date(now);
    start.setDate(now.getDate() - day + 1);
    return { start_date: formatDate(start), end_date: formatDate(now), period_type: 'week', is_explicit: true, requested_days: 7 };
  }
  if (/(上月|本月)/.test(text)) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    if (/上月/.test(text)) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      return { start_date: formatDate(start), end_date: formatDate(end), period_type: 'month', is_explicit: true, requested_days: end.getDate() };
    }
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { start_date: formatDate(start), end_date: formatDate(end), period_type: 'month', is_explicit: true, requested_days: end.getDate() };
  }
  return { start_date: '', end_date: '', period_type: 'day', is_explicit: false };
}

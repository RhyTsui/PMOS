export const REPORT_ACTION_ENVELOPE_PREFIX = '@@report_action@@';

export interface ReportActionEnvelope {
  label: string;
  type?: string;
  intent?: string;
  action?: string;
  risk_level?: string;
  auto_executable?: boolean;
  params?: Record<string, unknown>;
}

export function encodeReportActionEnvelope(action: ReportActionEnvelope): string {
  return `${REPORT_ACTION_ENVELOPE_PREFIX}${JSON.stringify(action)}`;
}

export function decodeReportActionEnvelope(input: string): ReportActionEnvelope | null {
  if (!input.startsWith(REPORT_ACTION_ENVELOPE_PREFIX)) return null;
  const payload = input.slice(REPORT_ACTION_ENVELOPE_PREFIX.length);
  try {
    const parsed = JSON.parse(payload) as ReportActionEnvelope;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.label !== 'string' || !parsed.label.trim()) return null;
    return {
      label: parsed.label,
      type: parsed.type,
      intent: parsed.intent,
      action: parsed.action,
      params: parsed.params && typeof parsed.params === 'object' && !Array.isArray(parsed.params) ? parsed.params : undefined,
      risk_level: parsed.risk_level,
      auto_executable: parsed.auto_executable,
    };
  } catch {
    return null;
  }
}

export function reportActionLabel(input: string): string {
  return decodeReportActionEnvelope(input)?.label || input;
}

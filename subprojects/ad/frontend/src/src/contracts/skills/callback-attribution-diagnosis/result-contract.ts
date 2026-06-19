export interface CallbackAttributionDiagnosisResult {
  platform: string;
  branch: string;
  summary: string;
  evidence: Array<{
    tool_name: string;
    key_findings: string[];
    raw_data?: unknown;
  }>;
  next_actions: string[];
  risk_level?: 'low' | 'medium' | 'high';
  requires_user_confirmation?: boolean;
}

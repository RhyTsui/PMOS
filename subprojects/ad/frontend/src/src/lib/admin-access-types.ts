import type { UserPreferenceProfile } from '@/types';

export type AdminUserStatus = 'active' | 'disabled';
export type AdminUserSource = 'seed' | 'login' | 'manual';
export type DatakiKeyStatus = 'unresolved' | 'resolved' | 'failed';

export interface AdminAccessSnapshot {
  is_super_admin: boolean;
  can_view_admin: boolean;
  can_operate_admin: boolean;
  can_manage_users: boolean;
}

export interface AdminUserRecord {
  id: string;
  uid?: number;
  account: string;
  user_name: string;
  real_name?: string;
  phone?: string;
  status: AdminUserStatus;
  is_super_admin: boolean;
  can_view_admin: boolean;
  can_operate_admin: boolean;
  source: AdminUserSource;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  current_role?: string;
  zhitou_role_id?: string;
  zhitou_role_name?: string;
  mapped_role_id?: string;
  role_mapping_reason?: string;
  dataki_api_key?: string;
  dataki_masked_api_key?: string;
  dataki_tenant_id?: string;
  dataki_tenant_name?: string;
  dataki_key_status?: DatakiKeyStatus;
  dataki_key_resolved_at?: string;
  dataki_key_last_error?: string;
  preference_profile?: UserPreferenceProfile | null;
  preference_summary?: {
    defaultRole: string;
    currentRole: string;
    activePreferences: string[];
    outputStyle: string[];
    analysisFocus: string[];
    riskBias: string[];
    explanationDepth: string;
    decisionStyle: string;
    confidence: number;
    updatedAt: string;
  } | null;
}

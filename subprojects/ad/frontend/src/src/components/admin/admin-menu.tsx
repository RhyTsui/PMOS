'use client';

import { useEffect, useState } from 'react';
import {
  Activity, Shield, FileText, Plug, GitBranch, Layers3,
  Sparkles, Target, Cpu, Users, ToggleRight, Globe,
  MessageSquare, ClipboardList, Timer, Zap,
} from 'lucide-react';
import {
  type AdminTab, type AdminCenterKey, type AdminMenuItem, type AdminCenter, type RuntimeImpact,
  RUNTIME_IMPACT_LABELS, RUNTIME_IMPACT_STYLES,
} from './admin-tab-helpers';

// ---- Admin Menu Items ----

export const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  { tab: 'overview', label: '总览', description: '查看管理中心状态、重点风险和常用治理入口。', icon: Activity, center: 'home', impacts: ['display'] },
  { tab: 'orchestration', label: '请求与能力', description: '查看请求理解、能力候选和治理观测。', icon: Shield, center: 'request-understanding', impacts: ['runtime', 'display'] },
  { tab: 'intent-rules', label: '意图规则', description: '维护意图路由规则、优先级和灰度信息。', icon: GitBranch, center: 'request-understanding', impacts: ['runtime', 'high-risk'] },
  { tab: 'prompts', label: '提示词', description: '管理提示词内容、版本、绑定和生效状态。', icon: FileText, center: 'prompt-strategy', impacts: ['runtime', 'seed', 'cache', 'high-risk'] },
  { tab: 'role-profiles', label: '角色提示词', description: '维护角色视角、默认提示词和结果模板。', icon: Sparkles, center: 'prompt-strategy', impacts: ['runtime', 'seed'] },
  { tab: 'mcp-config', label: '接入管理', description: '维护外部能力接入、连接测试和可用状态。', icon: Plug, center: 'capability', impacts: ['runtime', 'test', 'high-risk'] },
  { tab: 'skills', label: '能力治理', description: '维护可用能力、能力说明和启用状态。', icon: GitBranch, center: 'capability', impacts: ['runtime'] },
  { tab: 'workflow', label: '工作流', description: '查看任务流程、运行记录和回放信息。', icon: Layers3, center: 'workflow-agent', impacts: ['runtime', 'display'] },
  { tab: 'automation-templates', label: '自动化模板', description: '维护报表、监控和定时任务模板。', icon: Timer, center: 'workflow-agent', impacts: ['runtime'] },
  { tab: 'auto-debug-config', label: '联调配置', description: '维护自动联调模板和运行参数。', icon: Zap, center: 'workflow-agent', impacts: ['test', 'high-risk'] },
  { tab: 'entity-resolution', label: '实体解析', description: '统一维护媒体、应用等实体的标准名和别名。', icon: Sparkles, center: 'domain-entity', impacts: ['runtime'] },
  { tab: 'service-config', label: '模型与观测配置', description: '管理模型服务、追踪配置和连通性测试。', icon: Cpu, center: 'model-routing', impacts: ['runtime', 'test', 'high-risk'] },
  { tab: 'users', label: '用户管理', description: '管理用户、权限、工作范围和凭据状态。', icon: Users, center: 'security', impacts: ['runtime', 'high-risk'] },
  { tab: 'feature-switches', label: '功能开关', description: '开启或关闭实验能力和关键功能。', icon: ToggleRight, center: 'observability', impacts: ['runtime', 'high-risk'] },
  { tab: 'operation-logs', label: '操作日志', description: '查看管理操作记录和审计线索。', icon: Activity, center: 'observability', impacts: ['display'] },
  { tab: 'runtime-observability', label: '运行时可观测', description: '查看任务规划、质量护栏、证据来源和可信度状态。', icon: Activity, center: 'observability', impacts: ['runtime'] },
  { tab: 'chat-display', label: '会话展示', description: '配置会话首页、入口和结果展示方式。', icon: MessageSquare, center: 'rendering', impacts: ['runtime', 'cache'] },
  { tab: 'public-web-config', label: '联网搜索', description: '配置公开网页检索来源和结果处理方式。', icon: Globe, center: 'capability', impacts: ['runtime', 'high-risk'] },
  { tab: 'demand-pool', label: '需求池', description: '沉淀待办、跟进和交接信息。', icon: ClipboardList, center: 'operations', impacts: ['display'] },
];

export const ADMIN_CENTERS: AdminCenter[] = [
  { key: 'home', label: '首页总览', description: '查看治理状态和重点入口。', icon: Activity, defaultTab: 'overview' },
  { key: 'request-understanding', label: '请求理解中心', description: '治理意图、规则和路由观测。', icon: Shield, defaultTab: 'orchestration' },
  { key: 'prompt-strategy', label: '提示词策略中心', description: '治理提示词、版本和生效来源。', icon: FileText, defaultTab: 'prompts' },
  { key: 'capability', label: '能力中心', description: '治理外部接入、能力单元和启用状态。', icon: Plug, defaultTab: 'mcp-config' },
  { key: 'workflow-agent', label: '工作流与自动任务中心', description: '治理工作流、自动任务和联调模板。', icon: Layers3, defaultTab: 'workflow' },
  { key: 'knowledge-memory', label: '知识库与记忆中心', description: '当前以实体和词表治理入口承接。', icon: Sparkles, defaultTab: 'entity-resolution' },
  { key: 'domain-entity', label: '领域 / 指标 / 实体中心', description: '治理领域、指标和实体解析。', icon: Target, defaultTab: 'entity-resolution' },
  { key: 'model-routing', label: '模型服务与路由中心', description: '治理模型服务、路由支撑配置和测试。', icon: Cpu, defaultTab: 'service-config' },
  { key: 'security', label: '安全与权限中心', description: '治理用户、权限和工作范围。', icon: Users, defaultTab: 'users' },
  { key: 'observability', label: '评估与可观测中心', description: '查看开关、操作日志和治理线索。', icon: Activity, defaultTab: 'feature-switches' },
  { key: 'rendering', label: '前端渲染治理', description: '治理会话展示和结果承接。', icon: MessageSquare, defaultTab: 'chat-display' },
  { key: 'operations', label: '运营与发布', description: '管理需求流转和发布协作信息。', icon: ClipboardList, defaultTab: 'demand-pool' },
];

export const ADMIN_MENU_BY_TAB = ADMIN_MENU_ITEMS.reduce((acc, item) => {
  acc[item.tab] = item;
  return acc;
}, {} as Record<AdminTab, AdminMenuItem>);

export const ADMIN_CENTER_BY_KEY = ADMIN_CENTERS.reduce((acc, center) => {
  acc[center.key] = center;
  return acc;
}, {} as Record<AdminCenterKey, AdminCenter>);

// ---- Shared Utility Components ----

export function getCenterMenuItems(centerKey: AdminCenterKey, visibleTabs: AdminTab[]) {
  const items = ADMIN_MENU_ITEMS.filter((item) => item.center === centerKey && visibleTabs.includes(item.tab));
  if (items.length > 0) return items;
  if (centerKey === 'knowledge-memory' && visibleTabs.includes('entity-resolution')) {
    return [{ ...ADMIN_MENU_BY_TAB['entity-resolution'], label: '实体与词表入口' }];
  }
  return [];
}

export function ClientTime({
  value,
  mode = 'datetime',
  empty = '--',
}: {
  value?: number | string | null;
  mode?: 'date' | 'datetime';
  empty?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!value) {
    return <span>{empty}</span>;
  }

  if (!mounted) {
    return <span suppressHydrationWarning>{empty}</span>;
  }

  const date = new Date(value);
  const text = mode === 'date'
    ? date.toLocaleDateString('zh-CN')
    : date.toLocaleString('zh-CN');

  return <span suppressHydrationWarning>{text}</span>;
}

export function RuntimeImpactBadge({ impact }: { impact: RuntimeImpact }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${RUNTIME_IMPACT_STYLES[impact]}`}>
      {RUNTIME_IMPACT_LABELS[impact]}
    </span>
  );
}

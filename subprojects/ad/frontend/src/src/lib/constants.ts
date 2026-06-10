import {
  Brain,
  BookOpen,
  MessageSquarePlus,
  Search,
  Wrench,
  PackageCheck,
  Activity,
  Image,
  TrendingUp,
  Globe,
  ClipboardList,
  Stethoscope,
  FileText,
  CheckSquare,
  Play,
  Code,
  Calculator,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ZHITOU_CHAT_COLORS } from './zhitou-chat-colors';

export const COLORS = {
  primary: ZHITOU_CHAT_COLORS.textPrimary,
  primaryLight: ZHITOU_CHAT_COLORS.surfaceCard,
  primaryMid: ZHITOU_CHAT_COLORS.surfaceMain,
  accent: ZHITOU_CHAT_COLORS.primary,
  accentGlow: 'rgba(46, 117, 254, 0.25)',
  accentSoft: ZHITOU_CHAT_COLORS.primarySoftBg,
  success: ZHITOU_CHAT_COLORS.success,
  warning: ZHITOU_CHAT_COLORS.warning,
  danger: ZHITOU_CHAT_COLORS.danger,
  info: ZHITOU_CHAT_COLORS.info,
  textPrimary: ZHITOU_CHAT_COLORS.textPrimary,
  textSecondary: ZHITOU_CHAT_COLORS.textSecondary,
  textMuted: ZHITOU_CHAT_COLORS.textMuted,
  border: ZHITOU_CHAT_COLORS.primaryBorderSubtle,
} as const;

export const ANIMATION = {
  breathe: 3000,
  fadeIn: 400,
  slideIn: 300,
  hover: 150,
  typing: 40,
} as const;

export const BUSINESS_FLOWS = {
  help: { name: '使用帮助', icon: 'BookOpen', color: ZHITOU_CHAT_COLORS.primary, desc: '指标解释、系统入口、规则说明' },
  demand: { name: '需求沟通', icon: 'MessageSquarePlus', color: ZHITOU_CHAT_COLORS.info, desc: '回传接入、事件映射、配置收口' },
  diagnosis: { name: '问题排查', icon: 'Search', color: ZHITOU_CHAT_COLORS.danger, desc: '证据链、结论、定位建议' },
  debugging: { name: '广告联调', icon: 'Wrench', color: ZHITOU_CHAT_COLORS.warning, desc: '准备项检查、执行状态、日志' },
  get_delivery_packages: { name: '验交付包', icon: 'PackageCheck', color: ZHITOU_CHAT_COLORS.primary, desc: '可投放包、阻塞项、交付证据' },
} as const;

export const AGENT_MAP: Record<string, { id: string; name: string; color: string; desc: string }> = {
  report: { id: 'report', name: '问数分析', color: ZHITOU_CHAT_COLORS.primary, desc: '报表取数、趋势图和数据检查' },
  hub: { id: 'hub', name: '小乔', color: ZHITOU_CHAT_COLORS.primary, desc: '统一对话入口' },
  help: { id: 'help', name: '使用帮助', color: ZHITOU_CHAT_COLORS.primary, desc: '指标解释、系统路径、规则说明' },
  demand: { id: 'demand', name: '需求沟通', color: ZHITOU_CHAT_COLORS.info, desc: '回传接入、事件映射、配置收口' },
  diagnosis: { id: 'diagnosis', name: '问题排查', color: ZHITOU_CHAT_COLORS.danger, desc: '证据链、结论、定位建议' },
  debugging: { id: 'debugging', name: '广告联调', color: ZHITOU_CHAT_COLORS.warning, desc: '准备项检查、执行状态、日志' },
  delivery: { id: 'delivery', name: '验交付包', color: ZHITOU_CHAT_COLORS.primary, desc: '可投放包、阻塞项、交付证据' },
  monitoring: { id: 'monitoring', name: '监控告警', color: ZHITOU_CHAT_COLORS.success, desc: '运行状态、告警与趋势' },
  material: { id: 'material', name: '素材分析', color: '#FF6B9D', desc: '创意脚本与素材匹配' },
  prediction: { id: 'prediction', name: '广告预测', color: ZHITOU_CHAT_COLORS.warning, desc: 'ROI 预测与回本估算' },
};

export const AGENTS = Object.values(AGENT_MAP);

export const AGENT_ICONS: Record<string, LucideIcon> = {
  report: Calculator,
  hub: Brain,
  help: BookOpen,
  demand: MessageSquarePlus,
  diagnosis: Search,
  debugging: Wrench,
  delivery: PackageCheck,
  monitoring: Activity,
  material: Image,
  prediction: TrendingUp,
};

export interface AgentTool {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const AGENT_TOOLS: Record<string, AgentTool[]> = {
  hub: [
    { id: 'knowledge_search', name: 'knowledge_search', description: '检索知识库内容', icon: 'BookOpen' },
    { id: 'web_search', name: 'web_search', description: '检索外部信息', icon: 'Globe' },
  ],
  help: [
    { id: 'knowledge_search', name: 'knowledge_search', description: '检索帮助类知识', icon: 'BookOpen' },
    { id: 'web_search', name: 'web_search', description: '检索最新说明', icon: 'Globe' },
  ],
  demand: [
    { id: 'knowledge_search', name: 'knowledge_search', description: '检索需求模板与配置', icon: 'BookOpen' },
    { id: 'web_search', name: 'web_search', description: '检索平台最新说明', icon: 'Globe' },
    { id: 'collect_demand_fields', name: 'collect_demand_fields', description: '收集需求关键字段', icon: 'ClipboardList' },
  ],
  diagnosis: [
    { id: 'knowledge_search', name: 'knowledge_search', description: '检索排查知识', icon: 'BookOpen' },
    { id: 'web_search', name: 'web_search', description: '检索已知问题与解决方案', icon: 'Globe' },
    { id: 'collect_diagnosis_context', name: 'collect_diagnosis_context', description: '收集排查上下文', icon: 'ClipboardList' },
    { id: 'diagnose_issue', name: 'diagnose_issue', description: '执行问题诊断分析', icon: 'Stethoscope' },
    { id: 'generate_diagnosis_report', name: 'generate_diagnosis_report', description: '生成排查报告', icon: 'FileText' },
  ],
  debugging: [
    { id: 'knowledge_search', name: 'knowledge_search', description: '检索联调知识', icon: 'BookOpen' },
    { id: 'web_search', name: 'web_search', description: '检索平台联调文档', icon: 'Globe' },
    { id: 'check_prerequisites', name: 'check_prerequisites', description: '检查联调前置条件', icon: 'CheckSquare' },
    { id: 'execute_debug_step', name: 'execute_debug_step', description: '执行联调步骤', icon: 'Play' },
    { id: 'generate_debug_report', name: 'generate_debug_report', description: '生成联调报告', icon: 'FileText' },
  ],
  monitoring: [
    { id: 'knowledge_search', name: 'knowledge_search', description: '检索监控指标说明', icon: 'BookOpen' },
    { id: 'query_metrics', name: 'query_metrics', description: '查询实时监控指标', icon: 'Activity' },
  ],
  material: [
    { id: 'knowledge_search', name: 'knowledge_search', description: '检索素材规范', icon: 'BookOpen' },
    { id: 'parse_creative_script', name: 'parse_creative_script', description: '解析创意脚本', icon: 'Code' },
    { id: 'match_similar_material', name: 'match_similar_material', description: '匹配相似素材', icon: 'Image' },
  ],
  prediction: [
    { id: 'knowledge_search', name: 'knowledge_search', description: '检索预测模型说明', icon: 'BookOpen' },
    { id: 'predict_roi', name: 'predict_roi', description: '预测 ROI 指标', icon: 'TrendingUp' },
    { id: 'calculate_break_even', name: 'calculate_break_even', description: '计算回本周期', icon: 'Calculator' },
  ],
};

export const AGENT_RESPONSES: Record<string, Record<string, string>> = {
  hub: {
    help: '需要我帮你做什么吗？',
    greeting: '需要我帮你做什么吗？',
  },
  help: {
    default: '你想了解哪一类内容？可以直接告诉我指标、规则、入口或常见问题。',
  },
  demand: {
    default: '我可以帮你整理需求。请先告诉我媒体、应用、事件类型和交付要求。',
  },
  diagnosis: {
    default: '我可以帮你排查问题。请尽量提供媒体、应用、时间范围和异常现象。',
  },
  debugging: {
    default: '联调相关内容可以直接发我，我先帮你确认前置条件和执行步骤。',
  },
};

export const SPECIAL_PAGES = {
  monitor: { name: '监控告警', icon: 'Activity', color: ZHITOU_CHAT_COLORS.success },
  material: { name: '素材分析', icon: 'Image', color: '#FF6B9D' },
  forecast: { name: '广告预测', icon: 'TrendingUp', color: ZHITOU_CHAT_COLORS.warning },
} as const;

export const STARTER_QUESTIONS = [
  { label: 'ROAS 是怎么计算的？', intent: 'help' as const },
  { label: '提交巨量监测回传需求', intent: 'demand' as const },
  { label: '昨天巨量激活比 BI 少 30%', intent: 'diagnosis' as const },
  { label: '发起巨量联调测试', intent: 'debugging' as const },
  { label: '回因窗口期是多少？', intent: 'help' as const },
  { label: 'TikTok 事件映射配置', intent: 'demand' as const },
];

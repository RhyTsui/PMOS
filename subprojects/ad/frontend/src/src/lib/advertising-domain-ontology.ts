/**
 * Advertising Domain Ontology Seed
 *
 * 广告域业务对象本体定义。
 * 从 advertising-domain-pack.ts 提取业务对象概念。
 *
 * 关键设计：
 * 1. 泛词（"数据"、"报表"）只作为 surfaceCues，不作为 aliases
 * 2. 具体概念（report.daily）有更高的 specificity
 * 3. workflow/package 使用独立 type，不降级为 entity
 */

import type { DomainOntology } from '@/contracts/request-understanding/domain-ontology-contract';

export const ADVERTISING_DOMAIN_ONTOLOGY_VERSION = '2026-06-17';

export const ADVERTISING_DOMAIN_ONTOLOGY: DomainOntology = {
  version: ADVERTISING_DOMAIN_ONTOLOGY_VERSION,
  domain: 'advertising',
  concepts: [
    // ═══════════════════════════════════════════════════════════════
    // 报表类概念
    // ═══════════════════════════════════════════════════════════════

    // 父概念：报表（低 specificity，aliases 为空）
    {
      conceptId: 'report',
      type: 'report',
      displayName: '报表',
      aliases: [],  // 泛词不放这里
      surfaceCues: ['报表', '数据'],  // 只作为表面线索
      priority: 50,
      specificity: 1,  // 父概念
    },

    // 日报
    {
      conceptId: 'report.daily',
      type: 'report',
      displayName: '日报',
      aliases: ['日报', '每日数据', '日报告', '每日报表'],
      parentConceptId: 'report',
      capabilityRefs: [{ type: 'tool_name', value: 'get_zt_ad_day_report' }],
      priority: 90,
      specificity: 2,  // 子概念
    },

    // ROI 报表
    {
      conceptId: 'report.roi',
      type: 'report',
      displayName: 'ROI报表',
      aliases: ['ROI报表', '投产报表', '回收报表', 'ROAS报表', '首日ROI报表'],
      parentConceptId: 'report',
      capabilityRefs: [{ type: 'tool_name', value: 'get_zt_ad_roi_report' }],
      priority: 95,
      specificity: 2,
    },

    // 留存报表
    {
      conceptId: 'report.retention',
      type: 'report',
      displayName: '留存报表',
      aliases: ['留存报表', '留存数据', '次留报表', '留存分析'],
      parentConceptId: 'report',
      capabilityRefs: [{ type: 'tool_name', value: 'get_zt_ad_retention_report' }],
      priority: 95,
      specificity: 2,
    },

    // 小时报表
    {
      conceptId: 'report.hourly',
      type: 'report',
      displayName: '小时报表',
      aliases: ['小时报表', '分时数据', '实时报表', '小时数据'],
      parentConceptId: 'report',
      capabilityRefs: [{ type: 'tool_name', value: 'get_zt_hour_report' }],
      priority: 95,
      specificity: 2,
    },

    // 素材报表
    {
      conceptId: 'report.material',
      type: 'report',
      displayName: '素材报表',
      aliases: ['素材报表', '创意报表', '素材数据', '创意数据'],
      parentConceptId: 'report',
      capabilityRefs: [{ type: 'tool_name', value: 'get_zt_ad_day_report' }],  // 素材报表通过日报工具查询
      priority: 92,
      specificity: 2,
    },

    // 周报
    {
      conceptId: 'report.weekly',
      type: 'report',
      displayName: '周报',
      aliases: ['周报', '周报告', '每周数据'],
      parentConceptId: 'report',
      capabilityRefs: [{ type: 'tool_name', value: 'get_zt_ad_day_report' }],  // 周报通过日报工具查询
      priority: 88,
      specificity: 2,
    },

    // 月报
    {
      conceptId: 'report.monthly',
      type: 'report',
      displayName: '月报',
      aliases: ['月报', '月报告', '每月数据'],
      parentConceptId: 'report',
      capabilityRefs: [{ type: 'tool_name', value: 'get_zt_ad_day_report' }],  // 月报通过日报工具查询
      priority: 88,
      specificity: 2,
    },

    // ═══════════════════════════════════════════════════════════════
    // 工作流类概念（独立 type，不降级为 entity）
    // ═══════════════════════════════════════════════════════════════

    // 联调
    {
      conceptId: 'workflow.integration',
      type: 'workflow',
      displayName: '联调',
      aliases: ['联调', '扫码联调', '自动联调', '联调状态', '联调步骤'],
      capabilityRefs: [{ type: 'tool_name', value: 'integration_run' }],
      priority: 90,
      specificity: 2,
    },

    // 配置检查
    {
      conceptId: 'workflow.config_check',
      type: 'workflow',
      displayName: '配置检查',
      aliases: ['配置检查', '检查配置', '配置检测'],
      capabilityRefs: [{ type: 'tool_name', value: 'config_check' }],
      priority: 88,
      specificity: 2,
    },

    // ═══════════════════════════════════════════════════════════════
    // 投放包类概念（独立 type）
    // ═══════════════════════════════════════════════════════════════

    // 投放包
    {
      conceptId: 'package.fetch',
      type: 'package',
      displayName: '投放包',
      aliases: ['投放包', '广告包', '可交付包', '可投放包', '包地址', '下载地址', '包详情', '包列表'],
      capabilityRefs: [{ type: 'tool_name', value: 'package_fetch' }],
      priority: 90,
      specificity: 2,
    },

    // ═══════════════════════════════════════════════════════════════
    // 时间范围类概念
    // ═══════════════════════════════════════════════════════════════

    {
      conceptId: 'time_range.today',
      type: 'time_range',
      displayName: '今天',
      aliases: ['今天', '今日'],
      priority: 80,
      specificity: 2,
    },

    {
      conceptId: 'time_range.yesterday',
      type: 'time_range',
      displayName: '昨天',
      aliases: ['昨天', '昨日'],
      priority: 80,
      specificity: 2,
    },

    {
      conceptId: 'time_range.this_week',
      type: 'time_range',
      displayName: '本周',
      aliases: ['本周', '这周'],
      priority: 80,
      specificity: 2,
    },

    {
      conceptId: 'time_range.last_week',
      type: 'time_range',
      displayName: '上周',
      aliases: ['上周', '上一周'],
      priority: 80,
      specificity: 2,
    },

    {
      conceptId: 'time_range.this_month',
      type: 'time_range',
      displayName: '本月',
      aliases: ['本月', '这个月'],
      priority: 80,
      specificity: 2,
    },

    {
      conceptId: 'time_range.last_month',
      type: 'time_range',
      displayName: '上月',
      aliases: ['上月', '上个月'],
      priority: 80,
      specificity: 2,
    },

    // ═══════════════════════════════════════════════════════════════
    // 媒体实体类概念
    // ═══════════════════════════════════════════════════════════════

    {
      conceptId: 'entity.media.oceanengine',
      type: 'entity',
      displayName: '巨量',
      aliases: ['巨量', '巨量引擎', '巨量广告', '抖音', '今日头条', '穿山甲', 'OceanEngine'],
      priority: 85,
      specificity: 2,
    },

    {
      conceptId: 'entity.media.tencent',
      type: 'entity',
      displayName: '腾讯',
      aliases: ['腾讯', '腾讯广告', '广点通', 'GDT'],
      priority: 85,
      specificity: 2,
    },

    {
      conceptId: 'entity.media.kuaishou',
      type: 'entity',
      displayName: '快手',
      aliases: ['快手', '快手广告'],
      priority: 85,
      specificity: 2,
    },

    {
      conceptId: 'entity.media.taptap',
      type: 'entity',
      displayName: 'TapTap',
      aliases: ['TapTap', 'taptap'],
      priority: 85,
      specificity: 2,
    },

    // ═══════════════════════════════════════════════════════════════
    // 指标类概念
    // ═══════════════════════════════════════════════════════════════

    {
      conceptId: 'metric.cost',
      type: 'metric',
      displayName: '消耗',
      aliases: ['消耗', '花费', '成本', 'cost', 'spend'],
      priority: 80,
      specificity: 2,
    },

    {
      conceptId: 'metric.roi',
      type: 'metric',
      displayName: 'ROI',
      aliases: ['ROI', '投产', '投入产出', '回收'],
      priority: 85,
      specificity: 2,
    },

    {
      conceptId: 'metric.d1_roi',
      type: 'metric',
      displayName: '首日ROI',
      aliases: ['首日ROI', '首日回收', '首日广告回收', 'D1 ROI', 'first day ROI'],
      priority: 88,
      specificity: 2,
    },

    {
      conceptId: 'metric.roas',
      type: 'metric',
      displayName: 'ROAS',
      aliases: ['ROAS'],
      priority: 85,
      specificity: 2,
    },

    {
      conceptId: 'metric.activation',
      type: 'metric',
      displayName: '激活',
      aliases: ['激活', 'activation'],
      priority: 80,
      specificity: 2,
    },

    {
      conceptId: 'metric.register',
      type: 'metric',
      displayName: '注册',
      aliases: ['注册', 'register'],
      priority: 80,
      specificity: 2,
    },

    {
      conceptId: 'metric.payment',
      type: 'metric',
      displayName: '付费',
      aliases: ['付费', '支付', 'payment'],
      priority: 80,
      specificity: 2,
    },

    {
      conceptId: 'metric.revenue',
      type: 'metric',
      displayName: '收入',
      aliases: ['收入', '流水', 'revenue'],
      priority: 80,
      specificity: 2,
    },

    {
      conceptId: 'metric.retention',
      type: 'metric',
      displayName: '留存',
      aliases: ['留存', '次留', 'retention'],
      priority: 80,
      specificity: 2,
    },

    {
      conceptId: 'metric.arppu',
      type: 'metric',
      displayName: 'ARPPU',
      aliases: ['ARPPU', 'arppu'],
      priority: 80,
      specificity: 2,
    },

    // ═══════════════════════════════════════════════════════════════
    // 维度类概念
    // ═══════════════════════════════════════════════════════════════

    {
      conceptId: 'dimension.media',
      type: 'dimension',
      displayName: '媒体',
      aliases: ['媒体', '渠道', 'media', 'platform'],
      priority: 75,
      specificity: 2,
    },

    {
      conceptId: 'dimension.account',
      type: 'dimension',
      displayName: '账户',
      aliases: ['账户', '账号', 'account'],
      priority: 75,
      specificity: 2,
    },

    {
      conceptId: 'dimension.campaign',
      type: 'dimension',
      displayName: '计划',
      aliases: ['计划', '广告计划', 'campaign'],
      priority: 75,
      specificity: 2,
    },

    {
      conceptId: 'dimension.material',
      type: 'dimension',
      displayName: '素材',
      aliases: ['素材', '创意', 'material', 'creative'],
      priority: 75,
      specificity: 2,
    },

    {
      conceptId: 'dimension.team',
      type: 'dimension',
      displayName: '团队',
      aliases: ['团队', 'team'],
      priority: 75,
      specificity: 2,
    },
  ],
};

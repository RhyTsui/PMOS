export const ZHITOU_CHAT_COLORS = {
  primary: '#2E75FE',
  primaryHoverBg: 'rgba(46, 117, 254, 0.14)',
  primarySoftBg: 'rgba(46, 117, 254, 0.10)',
  primaryFaintBg: 'rgba(46, 117, 254, 0.05)',
  primaryBorder: 'rgba(46, 117, 254, 0.25)',
  primaryBorderSubtle: 'rgba(46, 117, 254, 0.16)',
  success: '#00B368',
  warning: '#D49600',
  danger: '#E0204A',
  info: '#6B46E0',
  textPrimary: '#10233F',
  textBody: '#355070',
  textSecondary: '#6B7C93',
  textMuted: '#8EA0B8',
  surfaceMain: '#F8FAFC',
  surfaceCard: '#FFFFFF',
  surfaceSubtle: 'rgba(241, 245, 249, 0.70)',
  borderFaint: 'rgba(46, 117, 254, 0.08)',
} as const;

export const ZHITOU_CHAT_COLOR_USAGE = {
  primary: '主操作、输入框焦点、发送按钮、可执行建议高亮',
  success: '执行完成、复制成功、校验通过',
  warning: '待确认、可继续但有条件限制',
  danger: '失败、阻断、删除或不可逆风险',
  info: '信息提示、需求/知识/辅助说明',
  neutral: '正文、弱说明、边框、页面背景',
} as const;

export const ZHITOU_CHAT_PRESENTATION_TOKENS = {
  surface: {
    canvas: ZHITOU_CHAT_COLORS.surfaceMain,
    panel: ZHITOU_CHAT_COLORS.surfaceCard,
    panelSubtle: 'rgba(248, 250, 252, 0.76)',
    user: 'rgba(46, 117, 254, 0.10)',
    assistant: ZHITOU_CHAT_COLORS.surfaceCard,
    status: 'rgba(248, 250, 252, 0.88)',
  },
  border: {
    subtle: 'rgba(16, 35, 63, 0.08)',
    default: 'rgba(16, 35, 63, 0.12)',
    focus: ZHITOU_CHAT_COLORS.primaryBorder,
  },
  text: {
    primary: ZHITOU_CHAT_COLORS.textPrimary,
    secondary: ZHITOU_CHAT_COLORS.textSecondary,
    muted: ZHITOU_CHAT_COLORS.textMuted,
  },
  status: {
    success: ZHITOU_CHAT_COLORS.success,
    warning: ZHITOU_CHAT_COLORS.warning,
    danger: ZHITOU_CHAT_COLORS.danger,
    info: ZHITOU_CHAT_COLORS.info,
    degraded: '#8A6A00',
  },
  radius: {
    message: 16,
    panel: 14,
    section: 12,
    badge: 999,
  },
  shadow: {
    message: '0 6px 18px rgba(15, 23, 42, 0.045)',
    panel: '0 10px 28px rgba(15, 23, 42, 0.055)',
  },
  spacing: {
    messageGap: 10,
    sectionGap: 10,
    blockGap: 12,
    inlineGap: 8,
  },
  motion: {
    enterDuration: 0.22,
    expandDuration: 0.18,
    easing: [0.4, 0, 0.2, 1],
  },
} as const;

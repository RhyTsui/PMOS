const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const projectRoot = path.join(repoRoot, 'imported', 'projects');
const sourceRoots = [
  path.join(projectRoot, 'src', 'app'),
  path.join(projectRoot, 'src', 'components'),
];
const activeFrontendRoot = path.join(repoRoot, 'frontend', 'src', 'src');
const activeFrontendSourceRoots = [
  path.join(activeFrontendRoot, 'app'),
  path.join(activeFrontendRoot, 'components'),
  path.join(activeFrontendRoot, 'hooks'),
  path.join(activeFrontendRoot, 'lib'),
];
const designSystemDocRel = 'docs/review/智投Chat-前端自主渲染与色彩字体系统-2026-05-27.md';
const enterpriseOsSpecRel = 'docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md';
const architectureIndexRel = 'docs/architecture/00_SPEC_INDEX.md';
const dataVisualizationUxRel = 'docs/architecture/interaction-system/data-visualization-ux.md';
const designSystemDoc = path.join(repoRoot, ...designSystemDocRel.split('/'));
const enterpriseOsSpecDoc = path.join(repoRoot, ...enterpriseOsSpecRel.split('/'));
const architectureIndexDoc = path.join(repoRoot, ...architectureIndexRel.split('/'));
const dataVisualizationUxDoc = path.join(repoRoot, ...dataVisualizationUxRel.split('/'));
const designSystemReferenceFiles = [
  'README.md',
  'MASTER_SPEC.md',
  'NEXT_IMPLEMENTATION_PLAN.md',
  'docs/operations/ui-guardrail.md',
  'docs/小乔智投-Ant-Design-X默认规范-2026-05-09.md',
  'docs/小乔智投-设计文档-2026-05-08.md',
  'docs/review/智投Chat-主色辅助色局部定义-2026-05-24.md',
];
const enterpriseOsReferenceFiles = [
  'README.md',
  'MASTER_SPEC.md',
  'NEXT_IMPLEMENTATION_PLAN.md',
  'docs/operations/ui-guardrail.md',
  designSystemDocRel,
];
const architectureIndexReferenceFiles = [
  'README.md',
  'MASTER_SPEC.md',
  'docs/operations/ui-guardrail.md',
  designSystemDocRel,
];
const extensionSpecFiles = [
  'docs/architecture/semantic-contract/semantic-result-contract.md',
  'docs/architecture/semantic-contract/action-contract.md',
  'docs/architecture/semantic-contract/evidence-contract.md',
  'docs/architecture/semantic-contract/source-contract.md',
  'docs/architecture/runtime/runtime-display-protocol.md',
  'docs/architecture/frontend-engineering/component-registry-renderer.md',
  'docs/architecture/frontend-engineering/frontend-engineering-system.md',
  'docs/architecture/interaction-system/ai-runtime-ux.md',
  'docs/architecture/interaction-system/ai-trust-ux.md',
  'docs/architecture/interaction-system/conversation-input-feedback-ux.md',
  'docs/architecture/visual-system/visual-system-breakdown.md',
  'docs/architecture/03_DISCLOSURE_LAYER_INDEX.md',
  'docs/architecture/frontend-engineering/message-rendering-architecture.md',
  'docs/architecture/frontend-engineering/message-state-management.md',
  'docs/architecture/frontend-engineering/ui-component-registry.md',
  'frontend/src/src/contracts/semantic/semantic-result-contract.ts',
  'frontend/src/src/contracts/semantic/action-contract.ts',
  'frontend/src/src/contracts/semantic/evidence-contract.ts',
  'frontend/src/src/contracts/semantic/source-contract.ts',
  'frontend/src/src/contracts/runtime/runtime-display-protocol.ts',
  'frontend/src/src/contracts/renderer/component-registry.ts',
];
const typographyGuardrailTargets = [
  'frontend/src/src/app/globals.css',
  'frontend/src/src/components/AntdProvider.tsx',
  'frontend/src/src/hooks/useTheme.tsx',
  'frontend/src/src/components/yokaui/ProjectSelectorCombo.tsx',
  'frontend/src/src/components/cognitive/ChatContainer.tsx',
  'frontend/src/src/components/cognitive/DataVizRenderer.tsx',
  'frontend/src/src/components/cognitive/ReportQueryResultCard.tsx',
  'frontend/src/src/components/workspace/TaskSidebar.tsx',
  'frontend/src/src/components/cognitive/CallChainPanel.tsx',
  'frontend/src/src/components/cognitive/ToolBar.tsx',
  'frontend/src/src/components/workspace/SkillManager.tsx',
  'frontend/src/src/lib/zhitou-chat-colors.ts',
  'frontend/src/src/lib/constants.ts',
];
const goldenRoots = [
  path.resolve(repoRoot, '..', '..', 'golden'),
  path.join(projectRoot, 'golden'),
  path.join(activeFrontendRoot, 'contracts', 'examples', 'golden'),
];
const requiredUiScreenIds = [
  'xiaoqiao-chat-workbench',
  'xiaoqiao-runtime-disclosure',
  'xiaoqiao-task-center',
  'admin-center-navigation-workbench',
  'xiaoqiao-result-region',
];
const requiredUiSchemaFields = [
  'screenId',
  'screenType',
  'layout',
  'regions',
  'sourceRefs',
  'evidenceRefs',
  'recommendedActions',
];

const ignoredPathParts = [
  `${path.sep}src${path.sep}app${path.sep}admin${path.sep}`,
  `${path.sep}src${path.sep}app${path.sep}api${path.sep}`,
  `${path.sep}src${path.sep}components${path.sep}admin${path.sep}`,
  `${path.sep}tests${path.sep}`,
  `${path.sep}.next${path.sep}`,
  `${path.sep}dist${path.sep}`,
  `${path.sep}node_modules${path.sep}`,
];

const mustNotUse = [
  { pattern: /\bAnt Design Pro\b/iu, reason: '不要在用户工作台引入 Ant Design Pro 语义' },
  { pattern: /\bProTable\b/iu, reason: '不要把页面退回 ProTable 后台范式' },
  { pattern: /\bProLayout\b/iu, reason: '不要把页面退回 ProLayout 后台范式' },
  { pattern: /feature\s*grid/iu, reason: '不要做功能介绍墙' },
  { pattern: /hero\s*section/iu, reason: '不要做营销 hero' },
  { pattern: /glassmorphism/iu, reason: '不要使用玻璃拟态装饰风格' },
  { pattern: /后台配置/u, reason: '用户页不要暴露内部配置口径' },
  { pattern: /管理后台/u, reason: '用户页菜单统一使用“管理中心”等用户语言' },
  { pattern: /联调状态/u, reason: '用户页不要直接暴露工程状态词' },
  { pattern: /乱码/u, reason: '乱码不能作为交付状态' },
];

const visibleEngineeringWords = [
  { pattern: />[^\n<{}]*(子项目|聚合|首页聚合|主链|会话主链|全局状态|任务回看|接口|联调状态|独立子项目)[^\n<{}]*</u, reason: '用户可见 JSX 文案不要出现工程词' },
  { pattern: /title=["'][^"']*(子项目|聚合|首页聚合|主链|会话主链|全局状态|任务回看|接口|联调状态|独立子项目)[^"']*["']/u, reason: '用户可见 title 不要出现工程词' },
];
const activeVisibleEngineeringWords = [
  { pattern: />[^\n<{}]*(子项目|聚合|首页聚合|主链|会话主链|全局状态|任务回看|接口|联调状态|独立子项目|\bschema\b|\bcontract\b|\bmock\b|\bworkspace\b)[^\n<{}]*</iu, reason: '用户可见 JSX 文案不要出现工程词' },
  { pattern: /title=["'][^"']*(子项目|聚合|首页聚合|主链|会话主链|全局状态|任务回看|接口|联调状态|独立子项目|\bschema\b|\bcontract\b|\bmock\b|\bworkspace\b)[^"']*["']/iu, reason: '用户可见 title 不要出现工程词' },
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) return walk(full);
    if (!/\.(tsx|ts|jsx|js|css)$/iu.test(full)) return [];
    if (ignoredPathParts.some((part) => full.includes(part))) return [];
    return [full];
  });
}

function walkVisible(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) return walkVisible(full);
    if (!/\.(tsx|ts|jsx|js)$/iu.test(full)) return [];
    if (full.includes(`${path.sep}src${path.sep}app${path.sep}api${path.sep}`)
      || full.includes(`${path.sep}tests${path.sep}`)
      || full.includes(`${path.sep}.next${path.sep}`)
      || full.includes(`${path.sep}dist${path.sep}`)
      || full.includes(`${path.sep}node_modules${path.sep}`)
    ) {
      return [];
    }
    return [full];
  });
}

function collectGoldenSchemas() {
  const walkGolden = (dir) => {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) return walkGolden(full);
      return name.endsWith('.schema.json') ? [full] : [];
    });
  };
  return goldenRoots.flatMap(walkGolden);
}

function relative(file) {
  return path.relative(repoRoot, file).replace(/\\/gu, '/');
}

const violations = [];
const sourceFiles = sourceRoots.flatMap(walk);
const activeFrontendFiles = activeFrontendSourceRoots.flatMap(walk);
const activeUserFacingVisibleFiles = [
  path.join(activeFrontendRoot, 'app', 'page.tsx'),
  path.join(activeFrontendRoot, 'app', 'admin', 'page.tsx'),
  path.join(activeFrontendRoot, 'components', 'workspace'),
  path.join(activeFrontendRoot, 'components', 'cognitive'),
  path.join(activeFrontendRoot, 'components', 'admin'),
  path.join(activeFrontendRoot, 'renderers', 'disclosure'),
].flatMap((target) => {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  return stat.isDirectory() ? walkVisible(target) : [target];
});
const goldenSchemas = collectGoldenSchemas();
const typographyTokenFile = path.join(activeFrontendRoot, 'app', 'globals.css');
const colorTokenFile = path.join(activeFrontendRoot, 'lib', 'zhitou-chat-colors.ts');
const antdProviderFile = path.join(activeFrontendRoot, 'components', 'AntdProvider.tsx');
const constantsFile = path.join(activeFrontendRoot, 'lib', 'constants.ts');
const typographyTokenChecks = [
  { pattern: /--font-size-body:\s*14px/u, reason: 'typography token --font-size-body must stay 14px' },
  { pattern: /--font-size-label:\s*12px/u, reason: 'typography token --font-size-label must stay 12px' },
  { pattern: /--font-size-caption:\s*12px/u, reason: 'typography token --font-size-caption must stay 12px' },
  { pattern: /--font-size-micro:\s*10px/u, reason: 'typography token --font-size-micro must stay 10px for data labels and dense visualization tags' },
  { pattern: /--font-weight-regular:\s*400/u, reason: 'typography token --font-weight-regular must stay 400' },
  { pattern: /--font-weight-medium:\s*500/u, reason: 'typography token --font-weight-medium must stay 500' },
  { pattern: /--font-weight-semibold:\s*600/u, reason: 'typography token --font-weight-semibold must stay 600' },
  { pattern: /--font-weight-bold:\s*700/u, reason: 'typography token --font-weight-bold must stay 700' },
  { pattern: /\.ui-body\s*\{/u, reason: 'semantic typography class .ui-body is required' },
  { pattern: /\.ui-label\s*\{/u, reason: 'semantic typography class .ui-label is required' },
  { pattern: /\.ui-caption\s*\{/u, reason: 'semantic typography class .ui-caption is required' },
  { pattern: /\.ui-micro,\s*\n\.ui-data-label\s*\{/u, reason: 'semantic typography class .ui-micro/.ui-data-label is required' },
];
const colorTokenChecks = [
  { pattern: /primary:\s*'#2E75FE'/u, reason: 'color token primary must stay #2E75FE' },
  { pattern: /success:\s*'#00B368'/u, reason: 'color token success must stay #00B368' },
  { pattern: /warning:\s*'#D49600'/u, reason: 'color token warning must stay #D49600' },
  { pattern: /danger:\s*'#E0204A'/u, reason: 'color token danger must stay #E0204A' },
  { pattern: /info:\s*'#6B46E0'/u, reason: 'color token info must stay #6B46E0' },
  { pattern: /textPrimary:\s*'#10233F'/u, reason: 'color token textPrimary must stay #10233F' },
  { pattern: /textBody:\s*'#355070'/u, reason: 'color token textBody must stay #355070' },
  { pattern: /textSecondary:\s*'#6B7C93'/u, reason: 'color token textSecondary must stay #6B7C93' },
  { pattern: /textMuted:\s*'#8EA0B8'/u, reason: 'color token textMuted must stay #8EA0B8' },
  { pattern: /surfaceMain:\s*'#F8FAFC'/u, reason: 'color token surfaceMain must stay #F8FAFC' },
];
const designSystemDocChecks = [
  { pattern: /# 智投 Chat 前端自主渲染与色彩字体系统/u, reason: 'design system doc title is missing' },
  { pattern: /Result Protocol.*Timeline Protocol.*MessagePart Protocol/su, reason: 'design system doc must define autonomous rendering protocol basis' },
  { pattern: /ZHITOU_CHAT_COLORS/u, reason: 'design system doc must reference ZHITOU_CHAT_COLORS' },
  { pattern: /font-family:\s*'PingFang SC'/u, reason: 'design system doc must define the Chinese-first font stack' },
  { pattern: /ENTERPRISE_AI_CHAT_OS_SPEC\.md/u, reason: 'design system doc must reference Enterprise AI Chat OS' },
  { pattern: /## 11\. 执行清单/u, reason: 'design system doc must include an execution checklist' },
  { pattern: /## 12\. 当前已接管文档/u, reason: 'design system doc must list superseded/connected docs' },
];
const enterpriseOsSpecChecks = [
  { pattern: /# Enterprise AI Chat OS Architecture & Design Specification/u, reason: 'enterprise AI Chat OS spec title is missing' },
  { pattern: /Unified Semantic Contract/u, reason: 'enterprise AI Chat OS spec must define Unified Semantic Contract' },
  { pattern: /Runtime Display Protocol/u, reason: 'enterprise AI Chat OS spec must define Runtime Display Protocol' },
  { pattern: /Component Binding System/u, reason: 'enterprise AI Chat OS spec must define Component Binding System' },
  { pattern: /Data Visualization UX/u, reason: 'enterprise AI Chat OS spec must place Data Visualization UX' },
  { pattern: /不得新增平行总协议/u, reason: 'enterprise AI Chat OS spec must forbid parallel top-level protocols' },
];
const architectureIndexChecks = [
  { pattern: /# AI Chat OS Architecture Specification Index/u, reason: 'architecture spec index title is missing' },
  { pattern: /semantic-contract\/semantic-result-contract\.md/u, reason: 'architecture spec index must list SemanticResultContract' },
  { pattern: /runtime\/runtime-display-protocol\.md/u, reason: 'architecture spec index must list Runtime Display Protocol' },
  { pattern: /frontend\/src\/src\/contracts\/semantic/u, reason: 'architecture spec index must point to active frontend semantic contracts' },
  { pattern: /interaction-system\/data-visualization-ux\.md/u, reason: 'architecture spec index must include Data Visualization UX' },
];
const dataVisualizationUxChecks = [
  { pattern: /# Data Visualization UX/u, reason: 'data visualization UX doc title is missing' },
  { pattern: /componentBinding = "data-visualization"/u, reason: 'data visualization UX must be bound through componentBinding' },
  { pattern: /ActionContract/u, reason: 'data visualization UX must reuse ActionContract' },
  { pattern: /EvidenceRef \/ SourceRef/u, reason: 'data visualization UX must reuse EvidenceRef / SourceRef' },
  { pattern: /Sankey/u, reason: 'data visualization UX must cover Sankey' },
  { pattern: /AI Insight/u, reason: 'data visualization UX must cover AI Insight' },
];
const visualSystemBreakdownChecks = [
  { pattern: /docs\/review\/智投Chat-前端自主渲染与色彩字体系统-2026-05-27\.md/u, reason: 'visual breakdown must reference the current design-system source' },
  { pattern: /不得替换当前 `ZHITOU_CHAT_COLORS`/u, reason: 'visual breakdown must protect current color tokens' },
  { pattern: /不得恢复 `Inter`/u, reason: 'visual breakdown must protect current typography direction' },
];

function readRepoFile(rel) {
  const file = path.join(repoRoot, ...rel.split('/'));
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file, 'utf8');
}

function requirePatterns(file, checks) {
  if (!fs.existsSync(file)) {
    violations.push(`${relative(file)}: required design-system source file is missing`);
    return '';
  }
  const content = fs.readFileSync(file, 'utf8');
  for (const rule of checks) {
    if (!rule.pattern.test(content)) {
      violations.push(`${relative(file)}: ${rule.reason}`);
    }
  }
  return content;
}

const designSystemContent = requirePatterns(designSystemDoc, designSystemDocChecks);
requirePatterns(enterpriseOsSpecDoc, enterpriseOsSpecChecks);
requirePatterns(architectureIndexDoc, architectureIndexChecks);
requirePatterns(dataVisualizationUxDoc, dataVisualizationUxChecks);
requirePatterns(path.join(repoRoot, 'docs', 'architecture', 'visual-system', 'visual-system-breakdown.md'), visualSystemBreakdownChecks);
for (const rel of designSystemReferenceFiles) {
  const content = readRepoFile(rel);
  if (!content) {
    violations.push(`${rel}: design-system reference file is missing`);
  } else if (!content.includes(designSystemDocRel)) {
    violations.push(`${rel}: must reference ${designSystemDocRel}`);
  }
}
for (const rel of enterpriseOsReferenceFiles) {
  const content = readRepoFile(rel);
  if (!content) {
    violations.push(`${rel}: enterprise AI Chat OS reference file is missing`);
  } else if (!content.includes(enterpriseOsSpecRel)) {
    violations.push(`${rel}: must reference ${enterpriseOsSpecRel}`);
  }
}
for (const rel of architectureIndexReferenceFiles) {
  const content = readRepoFile(rel);
  if (!content) {
    violations.push(`${rel}: architecture index reference file is missing`);
  } else if (!content.includes(architectureIndexRel)) {
    violations.push(`${rel}: must reference ${architectureIndexRel}`);
  }
}
for (const rel of extensionSpecFiles) {
  const file = path.join(repoRoot, ...rel.split('/'));
  if (!fs.existsSync(file)) {
    violations.push(`${rel}: required AI Chat OS extension spec or contract source is missing`);
  }
}

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = relative(file);

  for (const rule of mustNotUse) {
    if (rule.pattern.test(content)) {
      violations.push(`${rel}: ${rule.reason}`);
    }
  }

  for (const rule of visibleEngineeringWords) {
    if (rule.pattern.test(content)) {
      violations.push(`${rel}: ${rule.reason}`);
    }
  }

  const hasDashboardTriplet =
    /<Table\b/iu.test(content)
    && /(Statistic|Card)/u.test(content)
    && /(Filter|Select|DatePicker|RangePicker)/u.test(content);

  if (hasDashboardTriplet && !rel.includes('/admin/')) {
    violations.push(`${rel}: 疑似“筛选 + 指标卡 + 表格”传统后台结构，用户工作台需改为会话/任务驱动表面`);
  }
}

for (const file of [...new Set(activeUserFacingVisibleFiles)]) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = relative(file);

  for (const rule of mustNotUse) {
    if (rule.pattern.test(content)) {
      violations.push(`${rel}: ${rule.reason}`);
    }
  }

  for (const rule of activeVisibleEngineeringWords) {
    if (rule.pattern.test(content)) {
      violations.push(`${rel}: ${rule.reason}`);
    }
  }

  const hasDashboardTriplet =
    /<Table\b/iu.test(content)
    && /(Statistic|Card)/u.test(content)
    && /(Filter|Select|DatePicker|RangePicker)/u.test(content);

  if (hasDashboardTriplet && !rel.includes('/admin/')) {
    violations.push(`${rel}: 疑似“筛选 + 指标卡 + 表格”传统后台结构，用户工作台需改为会话/任务驱动表面`);
  }
}

for (const file of activeFrontendFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = relative(file);
  const isProjectSelectorCombo = rel.endsWith('frontend/src/src/components/yokaui/ProjectSelectorCombo.tsx');
  const isProjectSelectBridge = rel.endsWith('frontend/src/src/components/yokaui/YkProjectSelect.tsx');

  if (!isProjectSelectorCombo && !isProjectSelectBridge && /components\/yokaui\/YkProjectSelect/u.test(content)) {
    violations.push(`${rel}: project selector must use ProjectSelectorCombo; do not import the low-level YkProjectSelect bridge directly`);
  }

  if (!isProjectSelectorCombo && /\/api\/xiaoqiao\/projects/u.test(content)) {
    violations.push(`${rel}: project list loading must stay inside ProjectSelectorCombo to avoid falling back to the old selector path`);
  }

  if (/fontWeight:\s*(560|620|650|740|760|800)\b/u.test(content) || /font-weight:\s*(300|560|620|650|740|760|800)\b/u.test(content)) {
    violations.push(`${rel}: typography guardrail forbids non-standard font weights; use 400/500/600/700 semantic tokens`);
  }
  if (/text-\[13\.5px\]/u.test(content)) {
    violations.push(`${rel}: typography guardrail forbids text-[13.5px]; use text-sm or a semantic typography class`);
  }
  if (/JetBrains Mono|fontFamily:\s*['"]monospace['"]|font-family:\s*monospace/u.test(content)) {
    violations.push(`${rel}: typography guardrail requires var(--font-mono) for monospace text`);
  }
  for (const match of content.matchAll(/letterSpacing:\s*([^,\n}]+)/gu)) {
    const value = match[1].trim();
    if (!/^(?:0|['"]0['"]|['"]var\(--letter-spacing-[^)]+\)['"])$/u.test(value)) {
      violations.push(`${rel}: typography guardrail forbids hard-coded letterSpacing; use 0 or var(--letter-spacing-*)`);
      break;
    }
  }
  for (const match of content.matchAll(/letter-spacing:\s*([^;\n}]+)/gu)) {
    const value = match[1].trim().replace(/\s*!important$/u, '');
    if (!/^(?:0|var\(--letter-spacing-[^)]+\))$/u.test(value)) {
      violations.push(`${rel}: typography guardrail forbids hard-coded letter-spacing; use 0 or var(--letter-spacing-*)`);
      break;
    }
  }
  if (/tracking-\[[^\]]+\]/u.test(content)) {
    violations.push(`${rel}: typography guardrail forbids arbitrary Tailwind tracking; use ui-label/ui-caption/ui-body or letter-spacing tokens`);
  }

  if (/useState(?:<[^>]+>)?\(\s*\(\s*\)\s*=>[\s\S]{0,240}(?:typeof window|localStorage|sessionStorage|URLSearchParams|Date\.now|Math\.random|readStored|getInitial)/u.test(content)
    || /useState\(\s*(?:Date\.now|Math\.random)\s*\(/u.test(content)
  ) {
    violations.push(`${rel}: hydration guardrail forbids browser/time/random reads in useState initial render; use a stable default and restore client state in useEffect`);
  }
}

if (fs.existsSync(typographyTokenFile)) {
  const content = fs.readFileSync(typographyTokenFile, 'utf8');
  for (const rule of typographyTokenChecks) {
    if (!rule.pattern.test(content)) {
      violations.push(`${relative(typographyTokenFile)}: ${rule.reason}`);
    }
  }
} else {
  violations.push('frontend/src/src/app/globals.css: typography token source file is missing');
}

const typographyContent = fs.existsSync(typographyTokenFile) ? fs.readFileSync(typographyTokenFile, 'utf8') : '';
if (/Inter/u.test(typographyContent)) {
  violations.push(`${relative(typographyTokenFile)}: design system forbids Inter as a frontend font source`);
}

const antdProviderContent = fs.existsSync(antdProviderFile) ? fs.readFileSync(antdProviderFile, 'utf8') : '';
if (antdProviderContent) {
  if (/Inter/u.test(antdProviderContent)) {
    violations.push(`${relative(antdProviderFile)}: Ant Design provider must use the Chinese-first font stack, not Inter`);
  }
  if (!/PingFang SC/u.test(antdProviderContent) || !/ZHITOU_CHAT_COLORS\.primary|accent/u.test(antdProviderContent)) {
    violations.push(`${relative(antdProviderFile)}: Ant Design provider must keep the current font stack and primary color token path`);
  }
} else {
  violations.push('frontend/src/src/components/AntdProvider.tsx: Ant Design provider token source file is missing');
}

requirePatterns(colorTokenFile, colorTokenChecks);

const constantsContent = fs.existsSync(constantsFile) ? fs.readFileSync(constantsFile, 'utf8') : '';
if (constantsContent) {
  if (!/ZHITOU_CHAT_COLORS/u.test(constantsContent)) {
    violations.push(`${relative(constantsFile)}: business flow colors must reference ZHITOU_CHAT_COLORS`);
  }
  const duplicatedSemanticColors = constantsContent.match(/['"]#(?:2E75FE|00B368|D49600|E0204A|6B46E0|10233F|355070|6B7C93|8EA0B8)['"]/giu) || [];
  if (duplicatedSemanticColors.length) {
    violations.push(`${relative(constantsFile)}: duplicated semantic colors found (${[...new Set(duplicatedSemanticColors)].join(', ')}); use ZHITOU_CHAT_COLORS`);
  }
} else {
  violations.push('frontend/src/src/lib/constants.ts: constants source file is missing');
}

if (designSystemContent && /Inter/u.test(readRepoFile('docs/小乔智投-设计文档-2026-05-08.md').split('```css')[1] || '')) {
  violations.push('docs/小乔智投-设计文档-2026-05-08.md: old Inter font stack must not remain in the active font-family example');
}

const userFacingPageFiles = sourceFiles.filter((file) => {
  const rel = relative(file);
  return rel.startsWith('imported/projects/src/app/')
    && /page\.(tsx|jsx)$/iu.test(rel)
    && !rel.includes('/admin/');
});

if (userFacingPageFiles.length && !goldenSchemas.length) {
  violations.push('缺少 golden/*.schema.json，用户页面必须先有 UISchema/golden schema');
}

const schemaText = goldenSchemas.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
if (userFacingPageFiles.length && !/ui-guardrail\.md/u.test(schemaText)) {
  violations.push('golden schema 未引用 subprojects/ad/docs/operations/ui-guardrail.md');
}

const parsedGoldenSchemas = [];
for (const file of goldenSchemas) {
  const rel = relative(file);
  let schema;
  try {
    schema = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    violations.push(`${rel}: golden schema JSON 解析失败：${error.message}`);
    continue;
  }
  parsedGoldenSchemas.push({ file, rel, schema });

  if (!requiredUiScreenIds.includes(schema.screenId)) {
    continue;
  }

  for (const field of requiredUiSchemaFields) {
    if (!(field in schema)) {
      violations.push(`${rel}: 缺少 UISchema 必填字段 ${field}`);
    }
  }
  if (!schema.layout || typeof schema.layout !== 'object' || !schema.layout.desktop || !schema.layout.mobile) {
    violations.push(`${rel}: layout 必须同时声明 desktop 和 mobile`);
  }
  for (const field of ['regions', 'sourceRefs', 'evidenceRefs', 'recommendedActions']) {
    if (!Array.isArray(schema[field]) || schema[field].length === 0) {
      violations.push(`${rel}: ${field} 必须是非空数组`);
    }
  }
  if (Array.isArray(schema.sourceRefs)) {
    const hasUiGuardrailRef = schema.sourceRefs.some((ref) => {
      if (typeof ref === 'string') return ref.includes('ui-guardrail.md');
      return ref && typeof ref === 'object' && typeof ref.path === 'string' && ref.path.includes('ui-guardrail.md');
    });
    if (!hasUiGuardrailRef) {
      violations.push(`${rel}: sourceRefs 必须引用 docs/operations/ui-guardrail.md`);
    }
  }
}

const screenIds = new Set(parsedGoldenSchemas.map(({ schema }) => schema.screenId).filter(Boolean));
for (const screenId of requiredUiScreenIds) {
  if (!screenIds.has(screenId)) {
    violations.push(`缺少必需 UISchema/golden screenId: ${screenId}`);
  }
}

if (violations.length) {
  console.error('AD UI Guardrail violations found:');
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log('AD UI Guardrail checks passed.');

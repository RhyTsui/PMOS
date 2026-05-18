const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const projectRoot = path.join(repoRoot, 'imported', 'projects');
const sourceRoots = [
  path.join(projectRoot, 'src', 'app'),
  path.join(projectRoot, 'src', 'components'),
];
const goldenRoots = [
  path.resolve(repoRoot, '..', '..', 'golden'),
  path.join(projectRoot, 'golden'),
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
  { pattern: />[^<]*(子项目|聚合|首页聚合|主链|会话主链|全局状态|任务回看|接口|联调状态|独立子项目)[^<]*</u, reason: '用户可见 JSX 文案不要出现工程词' },
  { pattern: /title=["'][^"']*(子项目|聚合|首页聚合|主链|会话主链|全局状态|任务回看|接口|联调状态|独立子项目)[^"']*["']/u, reason: '用户可见 title 不要出现工程词' },
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) return walk(full);
    if (!/\.(tsx|ts|jsx|js)$/iu.test(full)) return [];
    if (ignoredPathParts.some((part) => full.includes(part))) return [];
    return [full];
  });
}

function collectGoldenSchemas() {
  return goldenRoots.flatMap((dir) => {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter((name) => name.endsWith('.schema.json'))
      .map((name) => path.join(dir, name));
  });
}

function relative(file) {
  return path.relative(repoRoot, file).replace(/\\/gu, '/');
}

const violations = [];
const sourceFiles = sourceRoots.flatMap(walk);
const goldenSchemas = collectGoldenSchemas();

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

if (violations.length) {
  console.error('AD UI Guardrail violations found:');
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log('AD UI Guardrail checks passed.');

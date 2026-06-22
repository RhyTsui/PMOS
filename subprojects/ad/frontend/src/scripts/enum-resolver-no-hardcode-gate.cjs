#!/usr/bin/env node
/**
 * EnumResolver 硬编码业务词门禁（H8）
 *
 * 扫描范围：src/lib/**、src/tests/**、scripts/**
 *
 * 分级：
 *   ✅ 允许项：seed 数据、测试 fixture、文档注释、EnumParameterResolver 守门字段名单
 *   ❌ 禁止项：runtime 业务分支代码中出现业务词（DEVICE_RETENTION / 设备留存 / 区间ROI 等）
 *
 * 用法：
 *   cd ad/frontend/src
 *   node scripts/enum-resolver-no-hardcode-gate.cjs
 */

const fs = require('fs');
const path = require('path');

// 本脚本位于 scripts/，项目源码根目录为上一级
const ROOT = path.resolve(__dirname, '..');
const SRC_LIB = path.join(ROOT, 'src', 'lib');
const SRC_TESTS = path.join(ROOT, 'src', 'tests');
const SCRIPTS = path.join(ROOT, 'scripts');

// 业务词黑名单（enum 值 + 触发词）
const FORBIDDEN_TERMS = [
  // enum 值（大写）
  'DEVICE_RETENTION',
  'REG_RETENTION',
  'PAY_D1_RETENTION',
  // 中文触发词
  '设备留存',
  '新增设备留存',
  '设备次留',
  '新增设备次留',
  '注册留存',
  '注册用户留存',
  '付费留存',
  '付费账号留存',
  '首日付费留存',
  '首日付费账号留存',
  '区间ROI',
  '累计ROI',
];

// 允许出现业务词的文件白名单（seed 数据 / 配置 / 文档 / 守门配置 / 存量词典）
const ALLOWED_FILES = new Set([
  'advertising-domain-pack.ts',                 // seed 配置（B2）
  'enum-parameter-resolver.ts',                 // resolver 守门字段名单（field names，不是业务词）
  'enum-resolver-no-hardcode-gate.cjs',         // 本门禁脚本
  'report-query-policy-store.ts',               // policy 归一化（只读配置）
  'query-decomposer.ts',                        // 存量种子 METRIC_EXTRA_INPUTS（H7 允许的 seed fallback）
  'controlled-glossary-index.ts',               // 存量词典数据
  'multi-query-answer-summary.ts',              // 存量展示标签
  'callback-attribution-diagnosis-orchestration.ts', // 存量回传诊断（不同业务链路，后续单独治理）
]);

// 文件名模式白名单（测试 / fixture / probe 文件一律允许）
const ALLOWED_FILE_PATTERNS = [
  /[-_.](test|spec|self-test|selftest)[-.]/i,
  /[-_.]test\./i,
  /^probe-/i,                            // 探针脚本（测试 fixture）
  /[-_.]golden\./i,                      // golden 文件
];

function isAllowedFile(filePath) {
  const basename = path.basename(filePath);
  if (ALLOWED_FILES.has(basename)) return true;
  // src/tests/ 目录下一律允许
  const rel = path.relative(ROOT, filePath);
  if (rel.startsWith('src' + path.sep + 'tests' + path.sep)) return true;
  return ALLOWED_FILE_PATTERNS.some(pattern => pattern.test(basename));
}

// 允许的注释行模式（JSDoc / 行注释里出现业务词作为示例）
const COMMENT_PATTERNS = [
  /^\s*\/\//,           // 行注释
  /^\s*\*/,             // JSDoc 行
  /^\s*\/\*/,           // 块注释开始
  /\/\*.*\*\//,         // 单行块注释
];

function isCommentLine(line) {
  return COMMENT_PATTERNS.some(pattern => pattern.test(line));
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // 跳过 node_modules / dist / .git
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
      walk(fullPath, files);
    } else if (entry.isFile()) {
      if (/\.(ts|tsx|js|jsx|cjs|mjs)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function scanFile(filePath) {
  const violations = [];
  if (isAllowedFile(filePath)) return violations;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 跳过注释行
    if (isCommentLine(line)) continue;
    // 跳过 import 语句（类型导入不视为 runtime 分支）
    if (/^\s*import\s/.test(line)) continue;
    // 跳过 export type 语句
    if (/^\s*export\s+type\s/.test(line)) continue;
    // 检查是否包含业务词
    for (const term of FORBIDDEN_TERMS) {
      if (line.includes(term)) {
        violations.push({
          file: path.relative(ROOT, filePath),
          line: i + 1,
          term,
          snippet: line.trim().slice(0, 120),
        });
      }
    }
  }
  return violations;
}

function main() {
  const files = [];
  walk(SRC_LIB, files);
  walk(SRC_TESTS, files);
  walk(SCRIPTS, files);

  const allViolations = [];
  for (const file of files) {
    allViolations.push(...scanFile(file));
  }

  if (allViolations.length === 0) {
    console.log(`✅ enum-resolver-no-hardcode-gate passed (${files.length} files scanned)`);
    process.exit(0);
  }

  console.error(`❌ enum-resolver-no-hardcode-gate FAILED — ${allViolations.length} violation(s) in runtime code:`);
  for (const v of allViolations) {
    console.error(`  ${v.file}:${v.line}  [${v.term}]  ${v.snippet}`);
  }
  console.error('');
  console.error('允许出现业务词的位置：');
  console.error('  - seed 数据（advertising-domain-pack.ts）');
  console.error('  - 测试 fixture（report-query-self-test.ts）');
  console.error('  - 文档注释 / JSDoc');
  console.error('');
  console.error('runtime 业务分支代码不得硬编码业务词，应通过 policy 配置驱动。');
  process.exit(1);
}

main();

import fs from 'node:fs';
import path from 'node:path';

interface Violation {
  level: 'error' | 'warning';
  file: string;
  line: number;
  code: string;
  message: string;
}

const root = process.cwd();
const includeDirs = ['frontend/src', 'src', 'app', 'components'].filter((dir) => fs.existsSync(path.join(root, dir)));
const allowedLegacyDirs = [
  'adapters',
  'migration',
  '__tests__',
  'examples/golden',
  'legacy',
];

const privateActionPatterns = [
  'chartActions',
  'tableButtons',
  'cardCta',
  'ctaButtons',
  'localActions',
  'vizActions',
  'messageActions',
];

const privateEvidenceSourcePatterns = [
  'dataSources',
  'sourceItems',
  'citationItems',
  'evidenceItems',
  'proofs',
  'references',
];

const contractRedefinitions = [
  /interface\s+ActionContract\b/,
  /type\s+ActionType\b/,
  /interface\s+SemanticResultContract\b/,
  /interface\s+EvidenceRef\b/,
  /interface\s+SourceRef\b/,
  /interface\s+RuntimeDisplayProtocol\b/,
];

const legacyFinalRenderTypes = [
  'ResponseContract',
  'ReportQueryViewModel',
  'MetricExplainerUISchema',
  'AgentProcessEvent',
];

function shouldSkipDir(dir: string): boolean {
  return dir.includes('node_modules') || dir.includes('.next') || dir.includes('dist') || dir.includes('build');
}

function isAllowedLegacyFile(file: string): boolean {
  return allowedLegacyDirs.some((part) => file.includes(`${path.sep}${part}${path.sep}`));
}

function walk(dir: string, files: string[] = []): string[] {
  if (shouldSkipDir(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const violations: Violation[] = [];

function addViolation(level: Violation['level'], file: string, line: number, code: string, message: string) {
  violations.push({ level, file: path.relative(root, file), line, code, message });
}

for (const includeDir of includeDirs) {
  for (const file of walk(path.join(root, includeDir))) {
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);
    const allowedLegacy = isAllowedLegacyFile(file);
    const inContracts = file.includes(`${path.sep}contracts${path.sep}`);

    lines.forEach((line, idx) => {
      const lineNo = idx + 1;

      for (const pattern of privateActionPatterns) {
        if (line.includes(pattern) && !allowedLegacy) {
          addViolation('error', file, lineNo, 'private_action_field', `禁止新增私有动作字段 ${pattern}，请映射到 ActionContract。`);
        }
      }

      for (const pattern of privateEvidenceSourcePatterns) {
        if (line.includes(pattern) && !allowedLegacy) {
          addViolation('warning', file, lineNo, 'private_evidence_source_field', `疑似私有 source/evidence 字段 ${pattern}，请映射到 EvidenceRef/SourceRef。`);
        }
      }

      for (const regexp of contractRedefinitions) {
        if (regexp.test(line) && !inContracts) {
          addViolation('error', file, lineNo, 'contract_redefinition', '禁止在 contracts 真源外重新定义统一契约类型。');
        }
      }

      for (const legacyType of legacyFinalRenderTypes) {
        if (line.includes(legacyType) && !allowedLegacy) {
          addViolation('error', file, lineNo, 'legacy_schema_direct_consumption', `禁止用户页面直接消费旧 schema ${legacyType} 作为最终结果，请通过 adapter。`);
        }
      }
    });

    if (/register\s*\(\s*\{[\s\S]*binding:/.test(text) && !/fallback\s*:/.test(text)) {
      addViolation('error', file, 1, 'renderer_missing_fallback', 'Renderer 注册必须提供 fallback，或确认走全局 fallback。');
    }

    if (/insight|recommendation|risk|diagnosis|confidence/.test(text) && !/evidenceRefs|sourceRefs/.test(text) && !allowedLegacy) {
      addViolation('warning', file, 1, 'trust_content_missing_refs', '包含 insight/recommendation/risk/confidence 的代码应检查 evidenceRefs/sourceRefs。');
    }
  }
}

if (violations.length > 0) {
  console.error('\nAI Chat OS contract governance violations:\n');
  for (const violation of violations) {
    console.error(`${violation.level.toUpperCase()} ${violation.file}:${violation.line} [${violation.code}] ${violation.message}`);
  }
  const hasError = violations.some((violation) => violation.level === 'error');
  process.exit(hasError ? 1 : 0);
}

console.log('AI Chat OS contract governance check passed.');

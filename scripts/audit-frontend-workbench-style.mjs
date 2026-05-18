import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const targets = [
  'src/frontend',
  'subprojects/ad/frontend/src',
];

const bannedPatterns = [
  { label: 'hero-panel', pattern: /hero-panel/g },
  { label: 'hero hero-workbench', pattern: /hero\s+hero-workbench/g },
  { label: 'summary-card', pattern: /summary-card/g },
  { label: 'management-card', pattern: /management-card/g },
  { label: 'history-card', pattern: /history-card/g },
  { label: 'result-card', pattern: /result-card/g },
  { label: 'brand-card', pattern: /brand-card/g },
  { label: 'context-mini-card', pattern: /context-mini-card/g },
  { label: 'runtime-hero-panel', pattern: /runtime-hero-panel/g },
  { label: 'artifact-hub-card', pattern: /artifact-hub-card/g },
];

const allowedExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.md']);

async function walk(dir) {
  const result = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await walk(fullPath)));
      continue;
    }
    if (allowedExtensions.has(path.extname(entry.name))) {
      result.push(fullPath);
    }
  }
  return result;
}

async function fileExists(targetPath) {
  try {
    const fileStat = await stat(targetPath);
    return fileStat.isDirectory() || fileStat.isFile();
  } catch {
    return false;
  }
}

const violations = [];

for (const relativeTarget of targets) {
  const fullTarget = path.join(repoRoot, relativeTarget);
  if (!(await fileExists(fullTarget))) {
    continue;
  }
  const files = await walk(fullTarget);
  for (const filePath of files) {
    const content = await readFile(filePath, 'utf8');
    for (const rule of bannedPatterns) {
      const matches = content.match(rule.pattern);
      if (!matches) {
        continue;
      }
      violations.push({
        filePath: path.relative(repoRoot, filePath),
        label: rule.label,
        count: matches.length,
      });
    }
  }
}

if (violations.length === 0) {
  console.log('frontend style audit passed: no banned workbench patterns found.');
  process.exit(0);
}

console.error('frontend style audit failed: banned workbench patterns detected.');
for (const violation of violations) {
  console.error(`- ${violation.filePath}: ${violation.label} x${violation.count}`);
}
process.exit(1);

#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { TextDecoder } = require('node:util');

const repoRoot = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));
const getArg = (name, fallback) => {
  const prefix = `${name}=`;
  const match = process.argv.slice(2).find((item) => item.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
};

const explicitScope = process.argv.slice(2).some((item) => item === '--scope' || item.startsWith('--scope='));
const outputJson = args.has('--json');
const scanStdin = args.has('--stdin');
const scope = getArg('--scope', scanStdin && !explicitScope ? 'stdin' : 'tracked');
const outputPath = getArg('--out', '');
const noFail = args.has('--no-fail');

const textDecoder = new TextDecoder('utf-8', { fatal: true });
const utf8Decoder = new TextDecoder('utf-8');

const textExtensions = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs', '.json', '.md', '.html',
  '.css', '.scss', '.less', '.yaml', '.yml', '.txt', '.env', '.svg', '.xml',
  '.csv', '.toml', '.cfg', '.ini', '.sh', '.bash', '.ps1', '.py', '.sql',
  '.dockerfile',
]);

const textBasenames = new Set([
  'Dockerfile',
  'Dockerfile.backend',
  'AGENTS.md',
  'README.md',
  '.gitignore',
  '.gitattributes',
  '.editorconfig',
]);

const binaryExtensions = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.avif', '.bmp', '.pdf',
  '.docx', '.pptx', '.xlsx', '.xls', '.zip', '.gz', '.7z', '.rar', '.woff',
  '.woff2', '.ttf', '.otf', '.eot', '.mp4', '.mov', '.avi', '.bundle',
]);

const skipDirs = new Set([
  '.git',
  'node_modules',
  '.next',
  'dist',
  'coverage',
  'test-results',
  '.venv-wsl',
  '.claude',
]);

const mojibakeTokens = [
  '\u951b', '\u9428', '\u6d93', '\u7edb', '\u59dd', '\u93ba', '\u6fa7',
  '\u9225', '\u9473', '\u95c2', '\u7487', '\u59ab', '\u93cc', '\u7039',
  '\u9365', '\u6e1a', '\u9a9e', '\u9359', '\u6d7c', '\u6748', '\u9354',
  '\u5bee', '\u93c2', '\u6402', '\u3129', '\u951f', '\ufffd',
];

const denseMojibakePattern = /[\u93ba\u6fa7\u9473\u95c2\u7487\u59ab\u93cc\u7039\u9365\u6e1a\u9a9e\u9359\u6d7c\u6748\u9354\u5bee\u93c2\u9428\u6d93\u7edb\u59dd]{2,}/u;
const latinMojibakePattern = /(?:[\u00c2-\u00c3][\u0080-\u00bf]|[\u00e2][\u0080-\u009f])/u;
const privateUsePattern = /[\ue000-\uf8ff]/u;
const suspiciousQuestionPattern = /[\u4e00-\u9fff]\?[\u4e00-\u9fff]|[，。；：、]\?|\?[，。；、]/u;

function slash(value) {
  return value.replace(/\\/g, '/');
}

function relative(filePath) {
  return slash(path.relative(repoRoot, filePath));
}

function isBinaryByMagic(buffer) {
  if (buffer.length === 0) return false;
  if (buffer.includes(0)) return true;
  if (buffer.length >= 8 && buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return true;
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  if (buffer.length >= 4 && buffer.slice(0, 4).toString('ascii') === 'PK\u0003\u0004') return true;
  return false;
}

function shouldScan(filePath) {
  const rel = slash(path.relative(repoRoot, filePath));
  if (/^docs\/review\/encoding-audit-\d{4}-\d{2}-\d{2}\.json$/u.test(rel)) return false;
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath);
  if (binaryExtensions.has(ext)) return false;
  return textExtensions.has(ext) || textBasenames.has(base);
}

function classifyFile(rel) {
  const normalized = slash(rel);
  if (normalized.startsWith('docs/quarantine/')) return 'quarantine';
  if (normalized.startsWith('docs/review/') || normalized.includes('/废弃或不用/')) return 'archive';
  if (normalized.startsWith('imported/projects/')) return 'archive';
  if (
    normalized.startsWith('tmp/')
    || normalized.startsWith('frontend/src/tmp/')
    || normalized.startsWith('.runtime/')
    || normalized.includes('/.runtime/')
  ) return 'generated';
  if (normalized.startsWith('frontend/src/node_modules/') || normalized.startsWith('imported/projects/node_modules/')) return 'dependency';
  return 'active';
}

function addFinding(findings, file, line, severity, code, message, preview) {
  const rel = file || '<stdin-payload>';
  const category = rel === '<stdin-payload>' ? 'payload' : classifyFile(rel);
  const blocking = severity === 'error' && !['archive', 'generated', 'quarantine', 'dependency'].includes(category);
  findings.push({
    file: rel,
    line,
    severity,
    code,
    message,
    category,
    blocking,
    preview: preview ? preview.trim().slice(0, 180) : '',
  });
}

function scanText(text, file, findings) {
  const lines = text.split(/\r?\n/u);
  lines.forEach((line, index) => {
    if (line.includes('\ufffd')) {
      addFinding(findings, file, index + 1, 'error', 'replacement_char', 'contains replacement character U+FFFD', line);
    }
    const token = mojibakeTokens.find((item) => line.includes(item));
    if (token) {
      addFinding(findings, file, index + 1, 'error', 'known_mojibake_token', `matches suspicious token U+${token.codePointAt(0).toString(16).toUpperCase()}`, line);
    }
    if (denseMojibakePattern.test(line)) {
      addFinding(findings, file, index + 1, 'error', 'dense_cjk_mojibake', 'matches dense CJK mojibake pattern', line);
    }
    if (latinMojibakePattern.test(line)) {
      addFinding(findings, file, index + 1, 'warning', 'latin_mojibake_candidate', 'matches Latin-1/Windows-1252 mojibake candidate', line);
    }
    if (privateUsePattern.test(line)) {
      addFinding(findings, file, index + 1, 'warning', 'private_use_char', 'contains private-use Unicode character', line);
    }
    if (suspiciousQuestionPattern.test(line)) {
      addFinding(findings, file, index + 1, 'warning', 'isolated_question_mark', 'contains suspicious isolated question mark around CJK punctuation/text', line);
    }
  });
}

function scanBuffer(buffer, file) {
  const findings = [];
  if (isBinaryByMagic(buffer)) return findings;
  const ext = file && file !== '<stdin-payload>' ? path.extname(file).toLowerCase() : '';
  const allowCrlf = ext === '.bat' || ext === '.cmd' || ext === '.ps1';

  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    addFinding(findings, file, 1, 'error', 'utf8_bom', 'UTF-8 BOM detected', '');
  }

  if (buffer.length >= 2 && ((buffer[0] === 0xff && buffer[1] === 0xfe) || (buffer[0] === 0xfe && buffer[1] === 0xff))) {
    addFinding(findings, file, 1, 'error', 'utf16_bom', 'UTF-16 BOM detected; expected UTF-8 without BOM', '');
    return findings;
  }

  try {
    textDecoder.decode(buffer);
  } catch {
    addFinding(findings, file, 1, 'error', 'invalid_utf8', 'file is not valid UTF-8', '');
    return findings;
  }

  const text = utf8Decoder.decode(buffer);
  if (!allowCrlf && text.includes('\r\n')) {
    addFinding(findings, file, 1, 'error', 'crlf_line_endings', 'CRLF line endings detected; expected LF', '');
  }
  scanText(text, file, findings);
  return findings;
}

function trackedFiles() {
  const output = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', '-z'], {
    cwd: repoRoot,
    encoding: 'buffer',
  });
  return output
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map((item) => path.join(repoRoot, item));
}

function walk(dir, files) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) walk(full, files);
      continue;
    }
    files.push(full);
  }
}

function workspaceFiles() {
  const files = [];
  walk(repoRoot, files);
  return files;
}

function scanFiles(files) {
  const findings = [];
  let scanned = 0;
  let skipped = 0;
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const rel = relative(file);
    if (!shouldScan(file)) {
      skipped += 1;
      continue;
    }
    const buffer = fs.readFileSync(file);
    if (isBinaryByMagic(buffer)) {
      skipped += 1;
      continue;
    }
    scanned += 1;
    findings.push(...scanBuffer(buffer, rel));
  }
  return { findings, scanned, skipped };
}

function readStdin() {
  if (!scanStdin) return null;
  const chunks = [];
  let chunk;
  while ((chunk = fs.readFileSync(0, { flag: 'r' })).length) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function printText(report) {
  const blocking = report.findings.filter((item) => item.blocking);
  console.log(`Text encoding scan scope=${report.scope} scanned=${report.scanned} skipped=${report.skipped} findings=${report.findings.length}`);
  if (!report.findings.length) {
    console.log('OK: text encoding checks passed.');
    return;
  }
  for (const item of report.findings.slice(0, 200)) {
    const label = item.blocking ? 'BLOCK' : 'REVIEW';
    const line = item.line ? `:${item.line}` : '';
    console.log(`${label} ${item.severity} ${item.file}${line} [${item.code}] ${item.message}${item.preview ? ` :: ${item.preview}` : ''}`);
  }
  if (report.findings.length > 200) console.log(`... ${report.findings.length - 200} more`);
  if (blocking.length) console.error(`FAILED: ${blocking.length} blocking finding(s).`);
}

let files = [];
if (scope === 'stdin') {
  files = [];
} else if (scope === 'tracked') {
  files = trackedFiles();
} else if (scope === 'workspace') {
  files = workspaceFiles();
} else if (!scanStdin) {
  console.error(`Unsupported scope: ${scope}`);
  process.exit(2);
}

const result = scanFiles(files);
if (scanStdin) {
  const stdinBuffer = fs.readFileSync(0);
  result.scanned += 1;
  result.findings.push(...scanBuffer(stdinBuffer, '<stdin-payload>'));
}

const report = {
  generated_at: new Date().toISOString(),
  repo_root: repoRoot,
  scope,
  scanned: result.scanned,
  skipped: result.skipped,
  findings: result.findings,
  blocking_count: result.findings.filter((item) => item.blocking).length,
};

const rendered = outputJson ? `${JSON.stringify(report, null, 2)}\n` : '';
if (outputPath) {
  const target = path.resolve(repoRoot, outputPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, outputJson ? rendered : `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

if (outputJson) {
  if (!outputPath) process.stdout.write(rendered);
} else {
  printText(report);
}

if (!noFail && report.blocking_count > 0) process.exit(1);

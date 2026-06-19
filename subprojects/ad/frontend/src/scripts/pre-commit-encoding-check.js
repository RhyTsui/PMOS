#!/usr/bin/env node
/**
 * Pre-commit encoding check
 * Run before each commit to prevent encoding issues from being committed.
 *
 * Usage: node scripts/pre-commit-encoding-check.js
 * Or add to .husky/pre-commit: node scripts/pre-commit-encoding-check.js
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get list of staged files
let stagedFiles;
try {
  const output = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' });
  stagedFiles = output.trim().split('\n').filter(Boolean);
} catch (e) {
  // If git command fails, skip check
  process.exit(0);
}

if (stagedFiles.length === 0) {
  process.exit(0);
}

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.html', '.css', '.scss',
  '.yaml', '.yml', '.txt', '.env', '.mjs', '.cjs',
]);

const REPL_CHAR = String.fromCharCode(0xFFFD);
let hasErrors = false;

for (const file of stagedFiles) {
  const ext = path.extname(file).toLowerCase();
  if (!TEXT_EXTENSIONS.has(ext)) continue;
  if (!fs.existsSync(file)) continue;

  const buf = fs.readFileSync(file);

  // Check UTF-8 BOM
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    console.error(`[encoding] ✗ ${file}: UTF-8 BOM detected`);
    hasErrors = true;
  }

  // Check UTF-16 BOM
  if ((buf[0] === 0xFF && buf[1] === 0xFE) || (buf[0] === 0xFE && buf[1] === 0xFF)) {
    console.error(`[encoding] ✗ ${file}: UTF-16 BOM detected (should be UTF-8)`);
    hasErrors = true;
  }

  const content = buf.toString('utf-8');

  // Check replacement characters
  if (content.includes(REPL_CHAR)) {
    console.error(`[encoding] ✗ ${file}: Contains replacement character U+FFFD`);
    hasErrors = true;
  }

  // Check CRLF
  if (content.includes('\r\n')) {
    console.error(`[encoding] ⚠ ${file}: Uses CRLF line endings (should be LF)`);
    // CRLF is a warning, not an error
  }
}

if (hasErrors) {
  console.error('\n[encoding] Commit blocked: encoding issues detected.');
  console.error('[encoding] Run `npm run fix:encoding` to auto-fix BOM and CRLF issues.');
  process.exit(1);
}

console.log('[encoding] ✓ All staged files pass encoding check.');

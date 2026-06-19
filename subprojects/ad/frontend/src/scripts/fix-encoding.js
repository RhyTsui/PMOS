#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.html', '.css', '.scss',
  '.yaml', '.yml', '.txt', '.env', '.mjs', '.cjs', '.svg', '.xml',
  '.csv', '.toml', '.cfg', '.ini', '.sh', '.bash', '.bat', '.cmd', '.ps1',
]);
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', '.git', 'coverage', 'imported', 'test-results']);
const REPL_CHAR = String.fromCharCode(0xfffd);

const stats = { bomRemoved: 0, crlfFixed: 0, replacementRemoved: 0, totalFixed: 0 };

function fixFile(filePath) {
  const original = fs.readFileSync(filePath);
  let buf = original;
  let modified = false;

  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    buf = buf.slice(3);
    stats.bomRemoved += 1;
    modified = true;
  }

  let content = buf.toString('utf8');
  if (content.includes('\r\n')) {
    content = content.replace(/\r\n/g, '\n');
    stats.crlfFixed += 1;
    modified = true;
  }

  if (content.includes(REPL_CHAR)) {
    content = content.replaceAll(REPL_CHAR, '');
    stats.replacementRemoved += 1;
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    stats.totalFixed += 1;
    console.log('fixed', filePath);
  }
}

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) scanDir(full);
      continue;
    }
    if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) fixFile(full);
  }
}

for (const root of ['src', 'scripts', 'tests']) scanDir(root);
console.log('Encoding fix report:', stats);

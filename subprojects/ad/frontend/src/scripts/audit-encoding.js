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

const results = { total: 0, bom: [], utf16: [], replacementChars: [], crlf: [] };

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) scanDir(full);
      continue;
    }
    if (!TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    results.total += 1;
    const buf = fs.readFileSync(full);
    if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) results.bom.push(full);
    if ((buf[0] === 0xff && buf[1] === 0xfe) || (buf[0] === 0xfe && buf[1] === 0xff)) {
      results.utf16.push(full);
      continue;
    }
    const content = buf.toString('utf8');
    if (content.includes(REPL_CHAR)) results.replacementChars.push(full);
    if (content.includes('\r\n')) results.crlf.push(full);
  }
}

for (const root of ['src', 'scripts', 'tests']) scanDir(root);

console.log('Encoding audit report');
console.log('Total text files scanned:', results.total);
console.log('UTF-8 BOM:', results.bom.length);
for (const file of results.bom) console.log('  ', file);
console.log('UTF-16 BOM:', results.utf16.length);
for (const file of results.utf16) console.log('  ', file);
console.log('Replacement characters:', results.replacementChars.length);
for (const file of results.replacementChars) console.log('  ', file);
console.log('CRLF line endings:', results.crlf.length);
for (const file of results.crlf.slice(0, 20)) console.log('  ', file);
if (results.crlf.length > 20) console.log('  ... and', results.crlf.length - 20, 'more');

#!/usr/bin/env node
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const script = path.resolve(__dirname, '..', '..', '..', 'scripts', 'check-text-encoding.cjs');
const forwarded = process.argv.slice(2);
const hasScope = forwarded.some((item) => item === '--scope' || item.startsWith('--scope='));
const result = spawnSync(process.execPath, [script, ...(hasScope ? [] : ['--scope=tracked']), ...forwarded], {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..', '..', '..'),
});

process.exit(result.status ?? 1);

#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const { performance } = require('perf_hooks');

const projectRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(projectRoot, '..', '..');
const outputDir = path.resolve(
  process.env.PHASE0_OUTPUT_DIR || path.join(projectRoot, 'tmp', 'performance-baseline'),
);
const baseUrl = (process.env.FRONTEND_BASE_URL || 'http://127.0.0.1:8002').replace(/\/$/, '');
const routePaths = (process.env.PHASE0_ROUTES || '/,/reports,/admin')
  .split(',')
  .map(route => route.trim())
  .filter(Boolean);

const sourceRoots = [
  path.join(projectRoot, 'src', 'app'),
  path.join(projectRoot, 'src', 'components'),
  path.join(projectRoot, 'src', 'contracts'),
  path.join(projectRoot, 'src', 'lib'),
  path.join(projectRoot, 'src', 'renderers'),
];

const textExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.css']);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function walkFiles(dir, predicate, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, predicate, result);
    } else if (!predicate || predicate(fullPath)) {
      result.push(fullPath);
    }
  }
  return result;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

function requestRoute(routePath) {
  const url = new URL(routePath, `${baseUrl}/`);
  const client = url.protocol === 'https:' ? https : http;
  const startedAt = performance.now();

  return new Promise(resolve => {
    const req = client.get(url, res => {
      const firstByteAt = performance.now();
      let bytes = 0;
      res.on('data', chunk => {
        bytes += chunk.length;
      });
      res.on('end', () => {
        resolve({
          route: routePath,
          url: url.toString(),
          statusCode: res.statusCode,
          contentType: res.headers['content-type'] || null,
          bytes,
          firstByteMs: Math.round(firstByteAt - startedAt),
          totalMs: Math.round(performance.now() - startedAt),
          ok: Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 400),
        });
      });
    });

    req.setTimeout(15000, () => {
      req.destroy(new Error('request timeout'));
    });

    req.on('error', error => {
      resolve({
        route: routePath,
        url: url.toString(),
        statusCode: null,
        contentType: null,
        bytes: 0,
        firstByteMs: null,
        totalMs: Math.round(performance.now() - startedAt),
        ok: false,
        error: error.message,
      });
    });
  });
}

function collectBuildAssets() {
  const staticRoot = path.join(projectRoot, '.next', 'static');
  const files = walkFiles(staticRoot, file => ['.js', '.css'].includes(path.extname(file)));
  const assets = files
    .map(file => {
      const size = fs.statSync(file).size;
      return {
        file: path.relative(projectRoot, file).replace(/\\/g, '/'),
        type: path.extname(file).slice(1),
        bytes: size,
      };
    })
    .sort((a, b) => b.bytes - a.bytes);

  const totals = assets.reduce(
    (acc, asset) => {
      acc[asset.type] = (acc[asset.type] || 0) + asset.bytes;
      acc.total += asset.bytes;
      return acc;
    },
    { total: 0 },
  );

  return {
    available: fs.existsSync(staticRoot),
    totals,
    largestAssets: assets.slice(0, 25),
  };
}

function scanSourceModules() {
  const files = sourceRoots.flatMap(root =>
    walkFiles(root, file => textExtensions.has(path.extname(file))),
  );

  const importPattern = /^\s*import(?:\s+type)?[\s\S]*?\sfrom\s+['"]([^'"]+)['"]|^\s*import\(['"]([^'"]+)['"]\)/gm;
  const modules = files.map(file => {
    const text = fs.readFileSync(file, 'utf8');
    const imports = [];
    let match;
    while ((match = importPattern.exec(text))) {
      imports.push(match[1] || match[2]);
    }
    return {
      file: path.relative(projectRoot, file).replace(/\\/g, '/'),
      bytes: Buffer.byteLength(text),
      lines: text.split(/\r?\n/).length,
      imports: imports.length,
      externalImports: imports.filter(item => !item.startsWith('.') && !item.startsWith('@/')).length,
      dynamicImports: (text.match(/\bimport\(/g) || []).length,
      clientComponent: /(^|\n)\s*['"]use client['"]/.test(text),
    };
  });

  const totals = modules.reduce(
    (acc, moduleInfo) => {
      acc.bytes += moduleInfo.bytes;
      acc.lines += moduleInfo.lines;
      acc.imports += moduleInfo.imports;
      if (moduleInfo.clientComponent) acc.clientComponents += 1;
      if (moduleInfo.dynamicImports > 0) acc.modulesWithDynamicImports += 1;
      return acc;
    },
    { files: modules.length, bytes: 0, lines: 0, imports: 0, clientComponents: 0, modulesWithDynamicImports: 0 },
  );

  const splitCandidates = modules
    .filter(item => item.clientComponent || item.bytes >= 18000 || item.externalImports >= 8)
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 30);

  return {
    totals,
    largestModules: [...modules].sort((a, b) => b.bytes - a.bytes).slice(0, 30),
    splitCandidates,
  };
}

function writeMarkdown(report, filePath) {
  const lines = [];
  lines.push('# Phase 0 Frontend Performance Baseline');
  lines.push('');
  lines.push(`- capturedAt: ${report.capturedAt}`);
  lines.push(`- baseUrl: ${report.baseUrl}`);
  lines.push(`- routes: ${report.routes.map(item => item.route).join(', ')}`);
  lines.push(`- buildAssetsAvailable: ${report.buildAssets.available}`);
  lines.push('');
  lines.push('## Route Probe');
  lines.push('');
  lines.push('| Route | Status | First byte | Total | Bytes |');
  lines.push('|---|---:|---:|---:|---:|');
  for (const route of report.routes) {
    lines.push(
      `| ${route.route} | ${route.statusCode ?? 'ERR'} | ${route.firstByteMs ?? '-'} ms | ${route.totalMs} ms | ${formatBytes(route.bytes)} |`,
    );
  }
  lines.push('');
  lines.push('## Build Assets');
  lines.push('');
  lines.push(`- total static JS/CSS: ${formatBytes(report.buildAssets.totals.total || 0)}`);
  lines.push(`- js: ${formatBytes(report.buildAssets.totals.js || 0)}`);
  lines.push(`- css: ${formatBytes(report.buildAssets.totals.css || 0)}`);
  lines.push('');
  lines.push('| Asset | Type | Size |');
  lines.push('|---|---|---:|');
  for (const asset of report.buildAssets.largestAssets.slice(0, 15)) {
    lines.push(`| ${asset.file} | ${asset.type} | ${formatBytes(asset.bytes)} |`);
  }
  lines.push('');
  lines.push('## Source Scan');
  lines.push('');
  lines.push(`- files: ${report.source.totals.files}`);
  lines.push(`- source size: ${formatBytes(report.source.totals.bytes)}`);
  lines.push(`- client components: ${report.source.totals.clientComponents}`);
  lines.push(`- modules with dynamic imports: ${report.source.totals.modulesWithDynamicImports}`);
  lines.push('');
  lines.push('## Split Candidates');
  lines.push('');
  lines.push('| File | Size | Imports | External | Client | Dynamic |');
  lines.push('|---|---:|---:|---:|---|---:|');
  for (const item of report.source.splitCandidates.slice(0, 20)) {
    lines.push(
      `| ${item.file} | ${formatBytes(item.bytes)} | ${item.imports} | ${item.externalImports} | ${item.clientComponent ? 'yes' : 'no'} | ${item.dynamicImports} |`,
    );
  }
  lines.push('');
  lines.push('## Phase 0 Notes');
  lines.push('');
  lines.push('- This baseline is evidence for later module splitting, not a user-visible UI change.');
  lines.push('- Use `FRONTEND_BASE_URL` and `PHASE0_ROUTES` to avoid hardcoding local ports or route scope.');
  lines.push('- Re-run after every candidate split and compare JSON output before declaring improvement.');
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  ensureDir(outputDir);
  const routes = await Promise.all(routePaths.map(requestRoute));
  const report = {
    schemaVersion: 'phase0.frontend-performance-baseline.v1',
    capturedAt: new Date().toISOString(),
    baseUrl,
    routes,
    buildAssets: collectBuildAssets(),
    source: scanSourceModules(),
  };

  const jsonPath = path.join(outputDir, 'phase-0-baseline.json');
  const markdownPath = path.join(outputDir, 'phase-0-baseline.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeMarkdown(report, markdownPath);

  const failedRoutes = routes.filter(route => !route.ok);
  console.log(`Phase 0 baseline written to ${path.relative(repoRoot, markdownPath)}`);
  console.log(`Routes checked: ${routes.length}, failed: ${failedRoutes.length}`);
  console.log(`Static assets available: ${report.buildAssets.available ? 'yes' : 'no'}`);
  if (failedRoutes.length > 0) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const weknoraRoot = path.join(projectRoot, 'WeKnora');
const outputDir = path.join(projectRoot, 'docs', 'scan');

const ignoredDirs = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  '.next',
  '.turbo',
  '.idea',
  '.vscode',
]);

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const fileList = await walk(weknoraRoot);
  const extCounts = countByExtension(fileList);
  const topLevelSummary = await summarizeTopLevel(weknoraRoot);
  const backendRoutes = await extractBackendRoutes(path.join(weknoraRoot, 'internal', 'router', 'router.go'));
  const frontendRoutes = await extractFrontendRoutes(path.join(weknoraRoot, 'frontend', 'src', 'router', 'index.ts'));
  const moduleSummary = await buildModuleSummary(fileList);

  const fileTree = {
    generatedAt: new Date().toISOString(),
    root: relative(projectRoot, weknoraRoot),
    totalFiles: fileList.length,
    extensions: extCounts,
    topLevelSummary,
  };

  const routeMap = {
    generatedAt: new Date().toISOString(),
    backend: {
      source: relative(projectRoot, path.join(weknoraRoot, 'internal', 'router', 'router.go')),
      count: backendRoutes.length,
      items: backendRoutes,
    },
    frontend: {
      source: relative(projectRoot, path.join(weknoraRoot, 'frontend', 'src', 'router', 'index.ts')),
      count: frontendRoutes.length,
      items: frontendRoutes,
    },
  };

  const summary = {
    generatedAt: new Date().toISOString(),
    moduleSummary,
  };

  await writeJson(path.join(outputDir, 'weknora-file-tree.json'), fileTree);
  await writeJson(path.join(outputDir, 'weknora-route-map.json'), routeMap);
  await writeJson(path.join(outputDir, 'weknora-module-summary.json'), summary);
  await fs.writeFile(
    path.join(outputDir, 'weknora-prep-scan-report.md'),
    buildMarkdownReport({ fileTree, routeMap, moduleSummary }),
    'utf8',
  );

  console.log(JSON.stringify({
    outputDir: relative(projectRoot, outputDir),
    totalFiles: fileList.length,
    backendRoutes: backendRoutes.length,
    frontendRoutes: frontendRoutes.length,
  }, null, 2));
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(full));
      continue;
    }
    files.push(full);
  }
  return files;
}

function countByExtension(files) {
  const counts = {};
  for (const file of files) {
    const ext = path.extname(file).toLowerCase() || '<no-ext>';
    counts[ext] = (counts[ext] || 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  );
}

async function summarizeTopLevel(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || ignoredDirs.has(entry.name)) {
      continue;
    }
    const full = path.join(root, entry.name);
    const files = await walk(full);
    result.push({
      name: entry.name,
      fileCount: files.length,
    });
  }
  return result.sort((a, b) => b.fileCount - a.fileCount || a.name.localeCompare(b.name));
}

async function extractBackendRoutes(routerFile) {
  const content = await fs.readFile(routerFile, 'utf8');
  const lines = content.split(/\r?\n/);
  const routeRegex = /\b([A-Za-z_][A-Za-z0-9_]*)\.(GET|POST|PUT|DELETE|PATCH)\("([^"]+)"/;
  const routes = [];
  for (const [index, line] of lines.entries()) {
    const match = line.match(routeRegex);
    if (!match) {
      continue;
    }
    routes.push({
      line: index + 1,
      group: match[1],
      method: match[2],
      path: match[3],
    });
  }
  return routes;
}

async function extractFrontendRoutes(routerFile) {
  const content = await fs.readFile(routerFile, 'utf8');
  const lines = content.split(/\r?\n/);
  const routes = [];
  for (const [index, line] of lines.entries()) {
    const match = line.match(/path:\s*["']([^"']+)["']/);
    if (!match) {
      continue;
    }
    routes.push({
      line: index + 1,
      path: match[1],
    });
  }
  return routes;
}

async function buildModuleSummary(files) {
  const internalRoot = path.join(weknoraRoot, 'internal');
  const frontendRoot = path.join(weknoraRoot, 'frontend', 'src');

  const internalFiles = files.filter((file) => file.startsWith(internalRoot));
  const frontendFiles = files.filter((file) => file.startsWith(frontendRoot));

  const internalPackages = aggregateChildren(internalFiles, internalRoot);
  const frontendModules = aggregateChildren(frontendFiles, frontendRoot);

  return {
    internalPackages,
    frontendModules,
    keyFiles: [
      relative(projectRoot, path.join(weknoraRoot, 'internal', 'router', 'router.go')),
      relative(projectRoot, path.join(weknoraRoot, 'frontend', 'src', 'router', 'index.ts')),
      relative(projectRoot, path.join(weknoraRoot, 'docker-compose.yml')),
      relative(projectRoot, path.join(weknoraRoot, '.env')),
    ],
  };
}

function aggregateChildren(files, root) {
  const counts = new Map();
  for (const file of files) {
    const rel = path.relative(root, file);
    const first = rel.split(path.sep)[0];
    counts.set(first, (counts.get(first) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, fileCount]) => ({ name, fileCount }))
    .sort((a, b) => b.fileCount - a.fileCount || a.name.localeCompare(b.name));
}

function buildMarkdownReport({ fileTree, routeMap, moduleSummary }) {
  const topLevelLines = fileTree.topLevelSummary
    .slice(0, 12)
    .map((item) => `- ${item.name}: ${item.fileCount} files`)
    .join('\n');

  const backendLines = routeMap.backend.items
    .slice(0, 24)
    .map((item) => `- ${item.method} ${item.path} (${item.group}, line ${item.line})`)
    .join('\n');

  const frontendLines = routeMap.frontend.items
    .slice(0, 24)
    .map((item) => `- ${item.path} (line ${item.line})`)
    .join('\n');

  const internalLines = moduleSummary.internalPackages
    .slice(0, 12)
    .map((item) => `- ${item.name}: ${item.fileCount} files`)
    .join('\n');

  const frontendModuleLines = moduleSummary.frontendModules
    .slice(0, 12)
    .map((item) => `- ${item.name}: ${item.fileCount} files`)
    .join('\n');

  return `# WeKnora 二开准备扫描报告

- generatedAt: ${new Date().toISOString()}
- target: ${fileTree.root}

## 1. 文件树摘要

- totalFiles: ${fileTree.totalFiles}

### 顶层目录

${topLevelLines}

### 扩展名分布（前 12 项）

${Object.entries(fileTree.extensions)
  .slice(0, 12)
  .map(([ext, count]) => `- ${ext}: ${count}`)
  .join('\n')}

## 2. 模块摘要

### Go internal 包

${internalLines}

### 前端 src 模块

${frontendModuleLines}

### 关键切口文件

${moduleSummary.keyFiles.map((file) => `- ${file}`).join('\n')}

## 3. 后端路由样本

- total: ${routeMap.backend.count}

${backendLines}

## 4. 前端路由样本

- total: ${routeMap.frontend.count}

${frontendLines}

## 5. 当前扫描结论

1. WeKnora 不是一个轻量组件，而是带完整前后端、配置、组织、IM、Agent、MCP、数据源和存储栈的系统。
2. 后端主要切口集中在 \`internal/router/router.go\`，前端主要切口集中在 \`frontend/src/router/index.ts\`。
3. 如果直接在现有产品壳上深改，影响面会同时覆盖路由、菜单、会话、知识库、组织和设置。
4. 因此更合理的路径仍是：先能力映射，再决定是“底座裁剪”还是“临时沿用产品壳”。
`;
}

async function writeJson(file, value) {
  await fs.writeFile(file, JSON.stringify(value, null, 2), 'utf8');
}

function relative(from, to) {
  return path.relative(from, to).split(path.sep).join('/');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

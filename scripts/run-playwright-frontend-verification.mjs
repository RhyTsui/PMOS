import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = 'true';
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function toFileUrl(filePath) {
  const normalized = path.resolve(filePath).replace(/\\/gu, '/');
  return `file:///${normalized}`;
}

function getDefaultFilePath(args) {
  if (args.file) {
    return path.resolve(args.file);
  }
  if (args.subproject) {
    return path.resolve('subprojects', args.subproject, 'frontend', 'dist', 'index.html');
  }
  return path.resolve('subprojects', 'ad', 'frontend', 'dist', 'index.html');
}

async function startStaticServer(entryFilePath) {
  const rootDir = path.dirname(entryFilePath);
  const entryFileName = path.basename(entryFilePath);
  const server = http.createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url ?? '/').split('?')[0] || '/');
    const normalizedPath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/u, '');
    const absolutePath = path.join(rootDir, normalizedPath);
    if (!absolutePath.startsWith(rootDir)) {
      res.statusCode = 403;
      res.end('forbidden');
      return;
    }
    if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }

    const extension = path.extname(absolutePath).toLowerCase();
    const contentType = ({
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
    })[extension] ?? 'application/octet-stream';

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(absolutePath).pipe(res);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start static verification server.');
  }

  return {
    server,
    target: `http://127.0.0.1:${address.port}/${encodeURIComponent(entryFileName)}`,
    rootDir,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputPath = path.resolve(
    args.out ?? path.join('docs', 'review', `playwright-browser-verification-${Date.now()}.json`),
  );
  const screenshotPath = path.resolve(
    args.screenshot ?? outputPath.replace(/\.json$/u, '.png'),
  );

  ensureParent(outputPath);
  ensureParent(screenshotPath);

  let serverHandle = null;
  let target = args.url ?? null;
  if (!target) {
    const entryFilePath = getDefaultFilePath(args);
    if (!fs.existsSync(entryFilePath)) {
      throw new Error(`Frontend verification target does not exist: ${entryFilePath}`);
    }
    serverHandle = await startStaticServer(entryFilePath);
    target = serverHandle.target;
  }

  const browser = await chromium.launch({
    headless: args.headed !== 'true',
  });

  try {
    const page = await browser.newPage({
      viewport: {
        width: Number(args.width ?? 1440),
        height: Number(args.height ?? 960),
      },
    });

    const startedAt = new Date().toISOString();
    let navigationStatus = 'ok';
    let navigationError = null;
    try {
      await page.goto(target, {
        waitUntil: 'networkidle',
        timeout: Number(args.timeout ?? 30000),
      });
    } catch (error) {
      navigationStatus = 'error';
      navigationError = error instanceof Error ? error.message : String(error);
    }

    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });

    const title = await page.title().catch(() => '');
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const metrics = await page.evaluate(() => ({
      headings: document.querySelectorAll('h1,h2,h3').length,
      buttons: document.querySelectorAll('button').length,
      inputs: document.querySelectorAll('input,textarea,select').length,
      tables: document.querySelectorAll('table').length,
      sections: document.querySelectorAll('main,section,aside,header,nav').length,
      links: document.querySelectorAll('a').length,
      textLength: document.body?.innerText?.trim().length ?? 0,
    })).catch(() => ({
      headings: 0,
      buttons: 0,
      inputs: 0,
      tables: 0,
      sections: 0,
      links: 0,
      textLength: 0,
    }));

      const report = {
      kind: 'playwright-browser-verification',
      target,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: navigationStatus,
      navigationError,
      title,
      screenshotPath: path.relative(process.cwd(), screenshotPath).replace(/\\/gu, '/'),
      metrics,
      evidence: {
        visibleTextSample: bodyText.trim().slice(0, 800),
      },
      };

      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
      process.stdout.write(`${outputPath}\n`);
    } finally {
      await browser.close();
      await new Promise((resolve, reject) => {
        if (!serverHandle?.server) {
          resolve();
          return;
        }
        serverHandle.server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

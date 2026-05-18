import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

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

function runCommand(command, args, label) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'pipe',
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(
      [
        `${label} failed`,
        result.stdout?.trim() || '',
        result.stderr?.trim() || '',
      ].filter(Boolean).join('\n'),
    );
  }
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function resolveAdEntry(args) {
  return path.resolve(args.file ?? path.join('subprojects', 'ad', 'frontend', 'index.html'));
}

function buildIterationOutput(baseDir, iteration) {
  return path.join(baseDir, `playwright-browser-verification-iter-${iteration}.json`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function summarizeIterations(reports) {
  return {
    total: reports.length,
    passCount: reports.filter((report) => report.status === 'ok').length,
    failCount: reports.filter((report) => report.status !== 'ok').length,
    averageTextLength:
      reports.length > 0
        ? Math.round(
            reports.reduce((sum, report) => sum + (report.metrics?.textLength ?? 0), 0) / reports.length,
          )
        : 0,
    minimumSections:
      reports.length > 0
        ? Math.min(...reports.map((report) => report.metrics?.sections ?? 0))
        : 0,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const iterations = Math.max(Number(args.iterations ?? 3), 1);
  const outputPath = path.resolve(
    args.out ?? path.join('subprojects', 'ad', 'docs', 'review', `frontend-delivery-regression-${Date.now()}.json`),
  );
  const artifactDir = outputPath.replace(/\.json$/u, '');
  const entryFile = resolveAdEntry(args);

  if (!fs.existsSync(entryFile)) {
    throw new Error(`Frontend delivery regression target does not exist: ${entryFile}`);
  }

  ensureParent(outputPath);
  fs.mkdirSync(artifactDir, { recursive: true });

  const reports = [];
  for (let iteration = 1; iteration <= iterations; iteration += 1) {
    const reportPath = buildIterationOutput(artifactDir, iteration);
    const screenshotPath = reportPath.replace(/\.json$/u, '.png');
    runCommand(
      process.execPath,
      [
        path.resolve('scripts', 'run-playwright-frontend-verification.mjs'),
        '--file',
        entryFile,
        '--out',
        reportPath,
        '--screenshot',
        screenshotPath,
        '--width',
        args.width ?? '1440',
        '--height',
        args.height ?? '960',
        '--timeout',
        args.timeout ?? '30000',
      ],
      `playwright iteration ${iteration}`,
    );
    reports.push(readJson(reportPath));
  }

  const summary = summarizeIterations(reports);
  const verdict =
    summary.failCount === 0 && summary.averageTextLength > 200 && summary.minimumSections >= 3
      ? 'pass'
      : 'fail';

  const output = {
    kind: 'frontend-delivery-regression',
    target: path.relative(process.cwd(), entryFile).replace(/\\/gu, '/'),
    iterations,
    generatedAt: new Date().toISOString(),
    verdict,
    summary,
    iterationReports: reports.map((report, index) => ({
      iteration: index + 1,
      status: report.status,
      title: report.title,
      screenshotPath: report.screenshotPath,
      metrics: report.metrics,
      navigationError: report.navigationError,
    })),
    rules: [
      'All browser iterations must navigate successfully.',
      'The page must expose enough visible text to qualify as a real business page.',
      'The page must expose multiple structural sections instead of a blank shell.',
    ],
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  process.stdout.write(`${outputPath}\n`);

  if (verdict !== 'pass') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

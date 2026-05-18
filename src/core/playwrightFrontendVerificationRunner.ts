import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { execFile as execFileCallback } from 'node:child_process';
import type { FileStore } from './fileStore.js';

const execFile = promisify(execFileCallback);

type RunInput = {
  subprojectId?: string | null;
  url?: string | null;
  file?: string | null;
  outputPath?: string | null;
};

type BrowserVerificationReport = {
  kind: string;
  target: string;
  startedAt: string;
  finishedAt: string;
  status: string;
  navigationError: string | null;
  title: string;
  screenshotPath: string;
  metrics: Record<string, number>;
  evidence: {
    visibleTextSample: string;
  };
};

export class PlaywrightFrontendVerificationRunner {
  constructor(private readonly store: FileStore) {}

  async run(input: RunInput = {}) {
    const scriptPath = this.store.resolve('scripts/run-playwright-frontend-verification.mjs');
    const outputPath = input.outputPath?.trim()
      ? input.outputPath.trim()
      : path.join(
        'docs',
        'review',
        `playwright-browser-verification-${input.subprojectId ?? 'platform'}-${Date.now()}.json`,
      );

    const args = [scriptPath, '--out', outputPath];
    if (input.url?.trim()) {
      args.push('--url', input.url.trim());
    } else if (input.file?.trim()) {
      args.push('--file', input.file.trim());
    } else if (input.subprojectId?.trim()) {
      args.push('--subproject', input.subprojectId.trim());
    }

    const { stdout, stderr } = await execFile(process.execPath, args, {
      cwd: this.store.resolve('.'),
    });

    const resolvedOutputPath = stdout.trim().split(/\r?\n/u).filter(Boolean).at(-1) ?? this.store.resolve(outputPath);
    const absoluteOutputPath = path.isAbsolute(resolvedOutputPath)
      ? resolvedOutputPath
      : this.store.resolve(resolvedOutputPath);
    const raw = fs.readFileSync(absoluteOutputPath, 'utf8');
    const report = JSON.parse(raw) as BrowserVerificationReport;

    return {
      outputPath: path.relative(this.store.resolve('.'), absoluteOutputPath).replace(/\\/gu, '/'),
      stdout: stdout.trim() || null,
      stderr: stderr.trim() || null,
      report,
    };
  }
}

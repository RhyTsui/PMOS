import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach } from 'vitest';
import { closeDatabase, initializeDatabase } from '../src/lib/database.js';

const workerId = process.env.VITEST_WORKER_ID || process.env.VITEST_POOL_ID || '0';
const dbDir = path.join(os.tmpdir(), 'gi-vitest');
let testIndex = 0;

fs.mkdirSync(dbDir, { recursive: true });

function removeDatabaseFiles(dbPath: string): void {
  for (const suffix of ['', '-shm', '-wal', '-journal']) {
    fs.rmSync(`${dbPath}${suffix}`, { force: true });
  }
}

function databasePath(name: string): string {
  return path.join(dbDir, `gi-${process.pid}-${workerId}-${name}.db`);
}

function nextDatabasePath(): string {
  testIndex += 1;
  return databasePath(String(testIndex));
}

const bootstrapDbPath = databasePath('bootstrap');
removeDatabaseFiles(bootstrapDbPath);
process.env.DB_PATH = bootstrapDbPath;

beforeEach(() => {
  closeDatabase();

  const dbPath = nextDatabasePath();
  removeDatabaseFiles(dbPath);
  process.env.DB_PATH = dbPath;

  initializeDatabase();
});

afterEach(() => {
  const dbPath = process.env.DB_PATH;

  closeDatabase();

  if (dbPath) {
    removeDatabaseFiles(dbPath);
  }
});

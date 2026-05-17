import path from 'node:path';

const RUNTIME_DATA_ROOT = path.resolve(process.cwd(), '..', '..', '.runtime', 'zhitou-chat');
const LEGACY_DATA_ROOT = path.join(process.cwd(), 'data');

export function runtimeDataPath(fileName: string): string {
  return path.join(RUNTIME_DATA_ROOT, fileName);
}

export function legacyDataPath(fileName: string): string {
  return path.join(LEGACY_DATA_ROOT, fileName);
}

export function runtimeUploadPath(fileName = ''): string {
  return path.join(RUNTIME_DATA_ROOT, 'uploads', fileName);
}


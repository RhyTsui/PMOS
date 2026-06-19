import path from 'node:path';

const RUNTIME_DATA_NAMESPACE = 'v2';
const RUNTIME_DATA_ROOT = path.resolve(process.cwd(), '..', '..', '.runtime', 'zhitou-chat', RUNTIME_DATA_NAMESPACE);
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

export function runtimeUserDataPath(scopeKey: string, fileName: string): string {
  return path.join(RUNTIME_DATA_ROOT, 'users', scopeKey, fileName);
}

export function runtimeUserUploadPath(scopeKey: string, fileName = ''): string {
  return path.join(RUNTIME_DATA_ROOT, 'users', scopeKey, 'uploads', fileName);
}

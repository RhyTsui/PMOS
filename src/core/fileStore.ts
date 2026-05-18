import { promises as fs } from 'node:fs';
import path from 'node:path';

export class FileStore {
  constructor(private readonly rootDir: string) {}

  resolve(...segments: string[]) {
    return path.join(this.rootDir, ...segments);
  }

  async read(relativePath: string): Promise<string>;
  async read(relativePath: string, encoding: 'utf8' | 'binary'): Promise<string>;
  async read(relativePath: string, encoding = 'utf8'): Promise<string> {
    const result = await fs.readFile(this.resolve(relativePath), encoding === 'binary' ? undefined : 'utf8');
    return typeof result === 'string' ? result : result.toString('binary');
  }

  async write(relativePath: string, content: string) {
    const target = this.resolve(relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, 'utf8');
  }

  async writeBytes(relativePath: string, content: Uint8Array) {
    const target = this.resolve(relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content);
  }

  async readJson<T>(relativePath: string): Promise<T> {
    return JSON.parse(await this.read(relativePath)) as T;
  }

  async writeJson(relativePath: string, value: unknown) {
    await this.write(relativePath, JSON.stringify(value, null, 2));
  }

  async delete(relativePath: string) {
    await fs.rm(this.resolve(relativePath), { force: true });
  }

  async list(relativePath: string) {
    const target = this.resolve(relativePath);
    const entries = await fs.readdir(target, { withFileTypes: true });
    return entries.map((entry) => path.posix.join(relativePath.replace(/\\/gu, '/'), entry.name));
  }

  async exists(relativePath: string) {
    try {
      await fs.access(this.resolve(relativePath));
      return true;
    } catch {
      return false;
    }
  }
}

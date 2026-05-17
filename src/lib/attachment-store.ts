import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AttachmentKind, AttachmentRecord } from '@/types';
import { legacyDataPath, runtimeDataPath, runtimeUploadPath } from './runtime-data-path';

const STORE_PATH = runtimeDataPath('attachments.json');
const LEGACY_STORE_PATH = legacyDataPath('attachments.json');
const UPLOAD_DIR = runtimeUploadPath();
const SHOULD_PERSIST_STORE = process.env.NODE_ENV === 'production' || process.env.XIAOQIAO_PERSIST_DEV_STORE === 'true';
let memoryStore: AttachmentStoreFile | null = null;

interface AttachmentStoreFile {
  attachments: AttachmentRecord[];
}

function nowIso() {
  return new Date().toISOString();
}

function inferKind(file: File): AttachmentKind {
  const name = file.name.toLowerCase();
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) return 'table';
  if (name.endsWith('.log') || name.endsWith('.txt') || name.endsWith('.json')) return 'log';
  return 'document';
}

function formatSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function buildParseSummary(file: File, kind: AttachmentKind, contentText?: string) {
  const base = `${file.name} 已上传，大小 ${formatSize(file.size)}`;
  if (kind === 'image') return `${base}。图片已进入视觉内容识别队列，可在会话中引用。`;
  if (kind === 'table') return `${base}。表格已识别为数据文件，可用于指标核对、差异排查和报表生成。`;
  if (kind === 'log') {
    const preview = contentText?.replace(/\s+/g, ' ').trim().slice(0, 90);
    return preview ? `${base}。日志预览：${preview}` : `${base}。日志文件已解析，可用于异常定位。`;
  }
  return `${base}。文档已解析，可用于问答、需求整理和证据引用。`;
}

async function readStore(): Promise<AttachmentStoreFile> {
  if (memoryStore) {
    return { attachments: [...memoryStore.attachments] };
  }

  for (const storePath of [STORE_PATH, LEGACY_STORE_PATH]) {
    try {
      const raw = await readFile(storePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<AttachmentStoreFile>;
      memoryStore = {
        attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
      };
      return { attachments: [...memoryStore.attachments] };
    } catch {
      // 尝试下一个存储位置。
    }
  }
  memoryStore = { attachments: [] };
  return { attachments: [] };
}

async function writeStore(store: AttachmentStoreFile) {
  memoryStore = { attachments: [...store.attachments] };
  if (!SHOULD_PERSIST_STORE) {
    return;
  }
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

export async function listAttachments(conversationId: string) {
  const store = await readStore();
  return store.attachments
    .filter((item) => item.conversation_id === conversationId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function createAttachment(conversationId: string, file: File, sourceType: AttachmentRecord['source_type'] = 'click') {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const kind = inferKind(file);
  const ext = path.extname(file.name);
  const storageName = `${id}${ext}`;
  const storagePath = path.join(UPLOAD_DIR, storageName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(storagePath, buffer);

  let contentText: string | undefined;
  if (kind === 'log' && buffer.length <= 1024 * 1024) {
    contentText = buffer.toString('utf8');
  }

  const now = nowIso();
  const attachment: AttachmentRecord = {
    id,
    conversation_id: conversationId,
    name: file.name,
    filename: file.name,
    kind,
    type: kind,
    mime_type: file.type || 'application/octet-stream',
    size: file.size,
    status: 'parsed',
    source_type: sourceType,
    created_at: now,
    preview_url: `/api/xiaoqiao/attachments/${id}`,
    url: `/api/xiaoqiao/attachments/${id}`,
    summary: buildParseSummary(file, kind, contentText),
  };

  const store = await readStore();
  store.attachments = [attachment, ...store.attachments.filter((item) => item.id !== id)];
  await writeStore(store);
  return attachment;
}

export async function getAttachment(attachmentId: string) {
  const store = await readStore();
  return store.attachments.find((item) => item.id === attachmentId);
}

export async function retryAttachmentParse(attachmentId: string) {
  const store = await readStore();
  const current = store.attachments.find((item) => item.id === attachmentId);
  if (!current) return null;

  const next: AttachmentRecord = {
    ...current,
    status: 'parsed',
    summary: current.summary || `${current.name} 已重新解析，可继续在会话中引用。`,
  };
  store.attachments = store.attachments.map((item) => item.id === attachmentId ? next : item);
  await writeStore(store);
  return next;
}

export async function deleteAttachment(attachmentId: string) {
  const store = await readStore();
  const current = store.attachments.find((item) => item.id === attachmentId);
  if (!current) return false;

  const ext = path.extname(current.filename || current.name);
  await unlink(path.join(UPLOAD_DIR, `${attachmentId}${ext}`)).catch(() => undefined);
  store.attachments = store.attachments.filter((item) => item.id !== attachmentId);
  await writeStore(store);
  return true;
}

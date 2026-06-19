import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AttachmentKind, AttachmentRecord, ProjectBinding } from '@/types';
import { runtimeUserDataPath, runtimeUserUploadPath } from './runtime-data-path';
import { understandAttachmentWithLLM } from './attachment-understanding';

const STORE_FILE_NAME = 'attachments.json';
const SHOULD_PERSIST_STORE = process.env.NODE_ENV === 'production' || process.env.XIAOQIAO_PERSIST_DEV_STORE === 'true';
const MB = 1024 * 1024;

export const MAX_UPLOAD_FILES = 10;
export const MAX_DERIVED_IMAGE_SIZE = 500 * 1024;

const MAX_SIZE_BY_KIND: Record<AttachmentKind, number> = {
  image: 20 * MB,
  video: 200 * MB,
  document: 50 * MB,
  table: 50 * MB,
  log: 50 * MB,
};

let memoryStoreByScope: Record<string, AttachmentStoreFile> = {};

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

function inferIconType(fileName: string, kind: AttachmentKind): AttachmentRecord['icon_type'] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'word';
  return kind;
}

function formatSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function buildParseSummary(file: File, kind: AttachmentKind, contentText?: string) {
  const base = `${file.name} 已上传，大小 ${formatSize(file.size)}`;
  if (kind === 'image') return `${base}。图片缩略图已生成，可在会话和我的资产中引用。`;
  if (kind === 'video') return `${base}。视频封面已生成，可在会话和我的资产中引用。`;
  if (kind === 'table') return `${base}。表格已识别为数据文件，可用于指标核对、差异排查和报表生成。`;
  if (kind === 'log') {
    const preview = contentText?.replace(/\s+/g, ' ').trim().slice(0, 90);
    return preview ? `${base}。日志预览：${preview}` : `${base}。日志文件已解析，可用于异常定位。`;
  }
  return `${base}。文件已保存，可用于问答、需求整理和证据引用。`;
}

function getStorePath(scopeKey: string): string {
  return runtimeUserDataPath(scopeKey, STORE_FILE_NAME);
}

function getUploadDir(scopeKey: string): string {
  return runtimeUserUploadPath(scopeKey);
}

function getFileExt(fileName: string, mimeType?: string) {
  const ext = path.extname(fileName);
  if (ext) return ext;
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'image/png') return '.png';
  return '';
}

function getAttachmentStoragePath(scopeKey: string, attachment: AttachmentRecord) {
  const ext = path.extname(attachment.filename || attachment.name);
  return path.join(getUploadDir(scopeKey), `${attachment.id}${ext}`);
}

function validateFileSize(file: File, kind: AttachmentKind) {
  const limit = MAX_SIZE_BY_KIND[kind] || 20 * MB;
  if (file.size > limit) {
    const limitMb = Math.round(limit / MB);
    throw new Error(`文件超过 ${limitMb}MB，请压缩后再上传。`);
  }
}

function parseNumber(value: FormDataEntryValue | null): number | undefined {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : undefined;
}

function cloneStore(store: AttachmentStoreFile): AttachmentStoreFile {
  return {
    attachments: store.attachments.map((item) => ({ ...item })),
  };
}

async function readStore(scopeKey: string): Promise<AttachmentStoreFile> {
  const cached = memoryStoreByScope[scopeKey];
  if (cached) {
    return cloneStore(cached);
  }

  const storePath = getStorePath(scopeKey);
  try {
    const raw = await readFile(storePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AttachmentStoreFile>;
    const next: AttachmentStoreFile = {
      attachments: Array.isArray(parsed.attachments)
        ? parsed.attachments.map((item) => ({ ...item }))
        : [],
    };
    memoryStoreByScope[scopeKey] = next;
    return cloneStore(next);
  } catch {
    // start with an empty scoped attachment store
  }

  const store: AttachmentStoreFile = { attachments: [] };
  memoryStoreByScope[scopeKey] = store;
  return cloneStore(store);
}

async function writeStore(scopeKey: string, store: AttachmentStoreFile) {
  memoryStoreByScope[scopeKey] = cloneStore(store);
  if (!SHOULD_PERSIST_STORE) {
    return;
  }
  const storePath = getStorePath(scopeKey);
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(store, null, 2), 'utf8');
}

async function saveDerivedFile(
  scopeKey: string,
  id: string,
  file: FormDataEntryValue | null,
  type: 'thumbnail' | 'cover',
): Promise<string | undefined> {
  if (!(file instanceof File) || file.size <= 0) return undefined;
  if (file.size > MAX_DERIVED_IMAGE_SIZE) {
    throw new Error('预览图过大，请重新选择文件或稍后重试。');
  }
  const uploadDir = getUploadDir(scopeKey);
  await mkdir(uploadDir, { recursive: true });
  const ext = getFileExt(file.name, file.type) || '.jpg';
  const fileName = `${id}.${type}${ext}`;
  await writeFile(path.join(uploadDir, fileName), Buffer.from(await file.arrayBuffer()));
  return fileName;
}

export function readUploadMeta(formData: FormData) {
  return {
    mediaWidth: parseNumber(formData.get('media_width')),
    mediaHeight: parseNumber(formData.get('media_height')),
    durationMs: parseNumber(formData.get('duration_ms')),
    thumbnail: formData.get('thumbnail'),
    cover: formData.get('cover'),
  };
}

export async function listAttachments(conversationId: string, scopeKey: string) {
  const store = await readStore(scopeKey);
  return store.attachments
    .filter((item) => item.conversation_id === conversationId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function listCommittedAttachments(scopeKey: string) {
  const store = await readStore(scopeKey);
  return store.attachments
    .filter((item) => item.asset_state === 'committed' || item.message_id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function createAttachment(
  conversationId: string,
  file: File,
  scopeKey: string,
  sourceType: AttachmentRecord['source_type'] = 'click',
  options: {
    thumbnail?: FormDataEntryValue | null;
    cover?: FormDataEntryValue | null;
    mediaWidth?: number;
    mediaHeight?: number;
    durationMs?: number;
    assetState?: AttachmentRecord['asset_state'];
    summary?: string;
    projectBinding?: ProjectBinding;
  } = {},
) {
  const uploadDir = getUploadDir(scopeKey);
  await mkdir(uploadDir, { recursive: true });
  const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const kind = inferKind(file);
  validateFileSize(file, kind);
  const ext = path.extname(file.name);
  const storagePath = path.join(uploadDir, `${id}${ext}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(storagePath, buffer);

  const thumbnailName = await saveDerivedFile(scopeKey, id, options.thumbnail || null, 'thumbnail');
  const coverName = await saveDerivedFile(scopeKey, id, options.cover || null, 'cover');
  const previewImageName = kind === 'video' ? coverName : thumbnailName;
  const previewImageUrl = previewImageName ? `/api/xiaoqiao/attachments/${id}/preview` : undefined;
  const thumbnailStatus: AttachmentRecord['thumbnail_status'] =
    kind === 'image'
      ? (thumbnailName ? 'generated' : 'failed')
      : kind === 'video'
        ? (coverName ? 'generated' : 'failed')
        : 'unsupported';

  let contentText: string | undefined;
  if (kind === 'log' && buffer.length <= 1024 * 1024) {
    contentText = buffer.toString('utf8');
  }

  const insight = await understandAttachmentWithLLM({
    attachmentId: id,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    kind,
    buffer,
  });

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
    asset_state: options.assetState || 'draft',
    source_type: sourceType,
    created_at: now,
    project_binding: options.projectBinding,
    asset_url: `/api/xiaoqiao/attachments/${id}/file`,
    preview_url: previewImageUrl || `/api/xiaoqiao/attachments/${id}/file`,
    thumbnail_url: thumbnailName ? `/api/xiaoqiao/attachments/${id}/preview` : undefined,
    cover_url: coverName ? `/api/xiaoqiao/attachments/${id}/preview` : undefined,
    preview_image_url: previewImageUrl,
    thumbnail_status: thumbnailStatus,
    media_width: options.mediaWidth,
    media_height: options.mediaHeight,
    duration_ms: options.durationMs,
    icon_type: inferIconType(file.name, kind),
    url: `/api/xiaoqiao/attachments/${id}/file`,
    summary: options.summary || insight.summary || buildParseSummary(file, kind, contentText),
    insight,
  };

  const store = await readStore(scopeKey);
  store.attachments = [attachment, ...store.attachments.filter((item) => item.id !== id)];
  await writeStore(scopeKey, store);
  return attachment;
}

export async function createGeneratedAttachment(
  conversationId: string,
  scopeKey: string,
  input: {
    fileName: string;
    content: string | Buffer;
    mimeType?: string;
    sourceType?: AttachmentRecord['source_type'];
    summary?: string;
    kind?: AttachmentKind;
    assetState?: AttachmentRecord['asset_state'];
    projectBinding?: ProjectBinding;
  },
) {
  const uploadDir = getUploadDir(scopeKey);
  await mkdir(uploadDir, { recursive: true });
  const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const fileName = input.fileName || `${id}.md`;
  const kind = input.kind || (fileName.toLowerCase().endsWith('.csv') ? 'table' : 'document');
  const ext = path.extname(fileName) || '.md';
  const storagePath = path.join(uploadDir, `${id}${ext}`);
  const buffer = Buffer.isBuffer(input.content) ? input.content : Buffer.from(input.content, 'utf8');
  await writeFile(storagePath, buffer);

  const attachment: AttachmentRecord = {
    id,
    conversation_id: conversationId,
    name: fileName,
    filename: fileName,
    kind,
    type: kind,
    mime_type: input.mimeType || 'text/markdown',
    size: buffer.length,
    status: 'parsed',
    asset_state: input.assetState || 'committed',
    source_type: input.sourceType || 'automation',
    created_at: nowIso(),
    project_binding: input.projectBinding,
    asset_url: `/api/xiaoqiao/attachments/${id}/file`,
    preview_url: `/api/xiaoqiao/attachments/${id}/file`,
    icon_type: inferIconType(fileName, kind),
    url: `/api/xiaoqiao/attachments/${id}/file`,
    summary: input.summary || '自动生成的文件，已写入我的资产。',
  };

  const store = await readStore(scopeKey);
  store.attachments = [attachment, ...store.attachments.filter((item) => item.id !== id)];
  await writeStore(scopeKey, store);
  return attachment;
}

export async function getAttachment(attachmentId: string, scopeKey: string) {
  const store = await readStore(scopeKey);
  return store.attachments.find((item) => item.id === attachmentId);
}

export async function commitAttachments(
  attachmentIds: string[],
  conversationId: string,
  messageId: string,
  scopeKey: string,
) {
  if (!attachmentIds.length) return [];
  const idSet = new Set(attachmentIds);
  const store = await readStore(scopeKey);
  const committed: AttachmentRecord[] = [];
  store.attachments = store.attachments.map((item) => {
    if (!idSet.has(item.id) || item.conversation_id !== conversationId) return item;
    const next = {
      ...item,
      message_id: messageId,
      asset_state: 'committed' as const,
    };
    committed.push(next);
    return next;
  });
  await writeStore(scopeKey, store);
  return committed;
}

export async function retryAttachmentParse(attachmentId: string, scopeKey: string) {
  const store = await readStore(scopeKey);
  const current = store.attachments.find((item) => item.id === attachmentId);
  if (!current) return null;

  const next: AttachmentRecord = {
    ...current,
    status: 'parsed',
    summary: current.summary || `${current.name} 已重新解析，可继续在会话中引用。`,
  };
  store.attachments = store.attachments.map((item) => (item.id === attachmentId ? next : item));
  await writeStore(scopeKey, store);
  return next;
}

export async function deleteAttachment(attachmentId: string, scopeKey: string) {
  const store = await readStore(scopeKey);
  const current = store.attachments.find((item) => item.id === attachmentId);
  if (!current) return false;

  await unlink(getAttachmentStoragePath(scopeKey, current)).catch(() => undefined);
  for (const suffix of ['thumbnail', 'cover']) {
    for (const ext of ['.webp', '.jpg', '.jpeg', '.png']) {
      await unlink(path.join(getUploadDir(scopeKey), `${attachmentId}.${suffix}${ext}`)).catch(() => undefined);
    }
  }
  store.attachments = store.attachments.filter((item) => item.id !== attachmentId);
  await writeStore(scopeKey, store);
  return true;
}

export async function getAttachmentFilePayload(
  attachmentId: string,
  scopeKey: string,
  variant: 'file' | 'preview',
) {
  const attachment = await getAttachment(attachmentId, scopeKey);
  if (!attachment) return null;
  const uploadDir = getUploadDir(scopeKey);
  const candidates = variant === 'file'
    ? [getAttachmentStoragePath(scopeKey, attachment)]
    : ['thumbnail', 'cover'].flatMap((suffix) => (
      ['.webp', '.jpg', '.jpeg', '.png'].map((ext) => path.join(uploadDir, `${attachmentId}.${suffix}${ext}`))
    ));

  for (const filePath of candidates) {
    try {
      const buffer = await readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const contentType = variant === 'file'
        ? attachment.mime_type
        : ext === '.webp'
          ? 'image/webp'
          : ext === '.png'
            ? 'image/png'
            : 'image/jpeg';
      return {
        attachment,
        buffer,
        contentType,
        fileName: variant === 'file' ? attachment.filename || attachment.name : path.basename(filePath),
      };
    } catch {
      // try next candidate
    }
  }
  return null;
}

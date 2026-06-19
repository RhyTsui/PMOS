import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runtimeUserDataPath } from './runtime-data-path';
import type { AutomationNotification } from '@/types';

interface NotificationFile {
  notifications: AutomationNotification[];
}

function getStorePath(scopeKey: string) {
  return runtimeUserDataPath(scopeKey, 'automation-notifications.json');
}

function now() {
  return Date.now();
}

function cloneNotification(item: AutomationNotification): AutomationNotification {
  return {
    ...item,
    channels: item.channels ? [...item.channels] : undefined,
    targets: item.targets ? [...item.targets] : undefined,
  };
}

async function readStore(scopeKey: string): Promise<NotificationFile> {
  try {
    const raw = await readFile(getStorePath(scopeKey), 'utf8');
    const parsed = JSON.parse(raw) as Partial<NotificationFile>;
    return {
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications.map(cloneNotification) : [],
    };
  } catch {
    return { notifications: [] };
  }
}

async function writeStore(scopeKey: string, store: NotificationFile) {
  const storePath = getStorePath(scopeKey);
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}

export async function listAutomationNotifications(scopeKey: string): Promise<AutomationNotification[]> {
  const store = await readStore(scopeKey);
  return store.notifications
    .slice()
    .sort((a, b) => b.created_at - a.created_at)
    .map(cloneNotification);
}

export async function getUnreadAutomationNotificationCount(scopeKey: string): Promise<number> {
  const store = await readStore(scopeKey);
  return store.notifications.filter((item) => !item.read).length;
}

export async function createAutomationNotification(
  scopeKey: string,
  input: Partial<AutomationNotification> & Pick<AutomationNotification, 'type' | 'title' | 'summary'>,
): Promise<AutomationNotification> {
  const store = await readStore(scopeKey);
  const notification: AutomationNotification = {
    id: input.id || `notification-${now()}-${Math.random().toString(36).slice(2, 8)}`,
    task_id: input.task_id,
    execution_id: input.execution_id,
    type: input.type,
    title: input.title,
    summary: input.summary,
    read: input.read ?? false,
    created_at: input.created_at ?? now(),
    read_at: input.read_at,
    action_label: input.action_label,
    action_url: input.action_url,
    artifact_attachment_id: input.artifact_attachment_id,
    artifact_url: input.artifact_url,
    severity: input.severity || 'info',
    channels: input.channels ? [...input.channels] : ['in_app'],
    targets: input.targets ? [...input.targets] : [],
  };
  store.notifications = [notification, ...store.notifications.filter((item) => item.id !== notification.id)];
  await writeStore(scopeKey, store);
  return cloneNotification(notification);
}

export async function markAutomationNotificationsRead(scopeKey: string, ids?: string[]) {
  const store = await readStore(scopeKey);
  const idSet = ids && ids.length > 0 ? new Set(ids) : null;
  const updated = store.notifications.map((item) => {
    if (item.read) return item;
    if (idSet && !idSet.has(item.id)) return item;
    return { ...item, read: true, read_at: item.read_at || now() };
  });
  store.notifications = updated;
  await writeStore(scopeKey, store);
  return updated.filter((item) => item.read).map(cloneNotification);
}

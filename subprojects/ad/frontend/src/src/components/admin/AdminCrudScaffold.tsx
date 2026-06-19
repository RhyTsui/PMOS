'use client';

import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

type AdminCrudSaveState = 'idle' | 'saving' | 'saved' | 'error';

export function AdminCrudShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-auto flex h-full min-h-0 w-full max-w-[1480px] flex-1 flex-col bg-white ${className}`}>
      {children}
    </div>
  );
}

export function AdminCrudHeader({
  title,
  description,
  actions,
  saveState = 'idle',
  saveText,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  saveState?: AdminCrudSaveState;
  saveText?: string;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#e8eef7] px-5 py-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-[#10233f]">{title}</div>
        <div className="mt-1 text-xs leading-5 text-[#6b7c93]">{description}</div>
        <AdminCrudSaveState state={saveState} text={saveText} />
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminCrudSaveState({ state, text }: { state: AdminCrudSaveState; text?: string }) {
  if (state === 'idle') return null;
  const copy = text || {
    saving: '正在保存',
    saved: '已保存',
    error: '保存失败，请重试',
  }[state];
  const styles = {
    saving: 'text-[#0f6fff]',
    saved: 'text-[#087a2f]',
    error: 'text-[#b42318]',
  }[state];
  const Icon = state === 'saving' ? Loader2 : state === 'saved' ? CheckCircle2 : AlertCircle;
  return (
    <div className={`mt-2 inline-flex items-center gap-1.5 text-[11px] ${styles}`}>
      <Icon className={`h-3.5 w-3.5 ${state === 'saving' ? 'animate-spin' : ''}`} />
      {copy}
    </div>
  );
}

export function AdminCrudToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#edf2f8] px-5 py-4 md:flex-row md:items-center">
      {children}
    </div>
  );
}

export function AdminCrudEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-10 text-center">
      <div className="text-sm font-semibold text-[#10233f]">{title}</div>
      <div className="mt-2 max-w-md text-xs leading-5 text-[#6b7c93]">{description}</div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function AdminCrudErrorState({
  title = '暂时无法读取配置',
  description,
  action,
}: {
  title?: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mx-5 my-4 rounded-lg border border-[#ffc9c9] bg-[#fff7f7] px-4 py-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#b42318]" />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[#8a1f1f]">{title}</div>
          <div className="mt-1 text-xs leading-5 text-[#9f3a3a]">{description}</div>
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function AdminCrudListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-[#edf2f8]">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="px-5 py-4">
          <div className="h-4 w-1/2 animate-pulse rounded bg-[#edf3fb]" />
          <div className="mt-3 h-3 w-4/5 animate-pulse rounded bg-[#f2f6fb]" />
        </div>
      ))}
    </div>
  );
}

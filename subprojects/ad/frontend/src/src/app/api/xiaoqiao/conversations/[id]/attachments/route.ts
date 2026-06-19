import { NextRequest, NextResponse } from 'next/server';
import { createAttachment, listAttachments, readUploadMeta } from '@/lib/attachment-store';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';
import type { ProjectBinding } from '@/types';

function readProjectBinding(formData: FormData): ProjectBinding | undefined {
  const raw = formData.get('project_binding');
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  try {
    const parsed = JSON.parse(raw) as ProjectBinding;
    const projectRefs = Array.isArray(parsed.project_refs) ? parsed.project_refs.map((item) => String(item).trim()).filter(Boolean) : [];
    if (!projectRefs.length) return undefined;
    return {
      project_refs: projectRefs,
      default_project_ref: typeof parsed.default_project_ref === 'string' ? parsed.default_project_ref.trim() || undefined : undefined,
      last_active_project_ref: typeof parsed.last_active_project_ref === 'string' ? parsed.last_active_project_ref.trim() || undefined : undefined,
      source_project_refs: Array.isArray(parsed.source_project_refs) ? parsed.source_project_refs.map((item) => String(item).trim()).filter(Boolean) : undefined,
    };
  } catch {
    return undefined;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  return NextResponse.json(await listAttachments(id, scope.key));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const formData = await request.formData();
  const file = formData.get('file');
  const sourceType = formData.get('source_type');

  if (!(file instanceof File)) {
    return NextResponse.json({
      error: 'file_required',
      message: '请上传有效文件。',
    }, { status: 400 });
  }

  const attachment = await createAttachment(
    id,
    file,
    scope.key,
    sourceType === 'drag' || sourceType === 'paste' ? sourceType : 'click',
    {
      ...readUploadMeta(formData),
      projectBinding: readProjectBinding(formData),
    },
  );

  return NextResponse.json(attachment, { status: 201 });
}

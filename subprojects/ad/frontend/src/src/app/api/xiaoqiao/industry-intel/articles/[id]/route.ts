import { NextResponse } from 'next/server';
import { getIndustryArticle } from '@/lib/industry-intel-store';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await getIndustryArticle(id);
  if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  return NextResponse.json(article);
}

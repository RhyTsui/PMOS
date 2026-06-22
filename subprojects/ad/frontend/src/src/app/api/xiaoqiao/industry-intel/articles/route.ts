import { NextResponse } from 'next/server';
import { buildGiQueryFromMessage, fetchGiIntelligence, type GiQueryOptions } from '@/lib/gi-intelligence-client';
import { listIndustryArticles } from '@/lib/industry-intel-store';

function parseList(value: string | null): string[] | undefined {
  const list = (value || '').split(',').map((item) => item.trim()).filter(Boolean);
  return list.length ? list : undefined;
}

function readQuery(request: Request): GiQueryOptions | null {
  const url = new URL(request.url);
  if (!url.searchParams.size) return null;
  const message = url.searchParams.get('q') || url.searchParams.get('keyword') || '';
  const inferred = message ? buildGiQueryFromMessage(message) : null;
  return {
    mode: (url.searchParams.get('mode') as GiQueryOptions['mode']) || inferred?.mode || 'feed',
    profileId: url.searchParams.get('profileId') || inferred?.profileId,
    date: url.searchParams.get('date') || inferred?.date,
    since: url.searchParams.get('since') || inferred?.since || '30d',
    sourceType: url.searchParams.get('sourceType') || inferred?.sourceType,
    sourceId: url.searchParams.get('sourceId') || inferred?.sourceId,
    keyword: url.searchParams.get('keyword') || inferred?.keyword,
    eventType: parseList(url.searchParams.get('eventType')) || inferred?.eventType,
    priority: parseList(url.searchParams.get('priority')) || inferred?.priority,
    audienceTag: url.searchParams.get('audienceTag') || inferred?.audienceTag,
    limit: Number(url.searchParams.get('limit') || inferred?.limit || 20),
    page: url.searchParams.get('page') ? Number(url.searchParams.get('page')) : inferred?.page,
    pageSize: url.searchParams.get('pageSize') ? Number(url.searchParams.get('pageSize')) : inferred?.pageSize,
    expandSeeds: url.searchParams.get('expandSeeds') === 'true' || inferred?.expandSeeds,
  };
}

export async function GET(request: Request) {
  const query = readQuery(request);
  if (query) {
    const result = await fetchGiIntelligence(query);
    return NextResponse.json(result, { status: result.status === 'failed' ? 502 : 200 });
  }
  return NextResponse.json(await listIndustryArticles());
}

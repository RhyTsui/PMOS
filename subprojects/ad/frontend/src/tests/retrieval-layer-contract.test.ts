import { describe, expect, it } from 'vitest';
import {
  buildPublicSearchRetrievalResult,
  buildRetrievalLayerTrace,
  buildRetrievalResultFromContract,
  orderRetrievalResultsByPriority,
  priorityForRetrievalSource,
} from '../src/contracts/retrieval';

describe('retrieval layer contract', () => {
  it('keeps MCP and Dataki ahead of public search in unified retrieval priority', () => {
    expect(priorityForRetrievalSource('mcp_business_data')).toBe('system_of_record');
    expect(priorityForRetrievalSource('dataki_knowledge')).toBe('governed_knowledge');
    expect(priorityForRetrievalSource('public_search')).toBe('public_evidence');

    const publicSearch = buildPublicSearchRetrievalResult({
      sourceRefs: [{
        id: 'public-1',
        title: 'Public article',
        url: 'https://example.org/article',
      }],
      evidenceItems: [{
        evidence_id: 'public-evidence-1',
        source_ref_id: 'public-1',
        source_url: 'https://example.org/article',
        title: 'Public article',
        snippet: 'Public evidence',
        confidence: 0.66,
        provider: 'brave',
      }],
    });
    const mcp = buildRetrievalResultFromContract({
      sourceKind: 'mcp_business_data',
      sources: [{ id: 'mcp-1', title: 'ROI report tool', locator: { kind: 'tool', value: 'roi_query' } }],
      evidenceItems: [{ id: 'mcp-evidence-1', title: 'ROI query result', summary: 'Android ROI dropped 12%.' }],
    });
    const dataki = buildRetrievalResultFromContract({
      sourceKind: 'dataki_knowledge',
      sources: [{ id: 'dataki-1', title: '投放知识库 ROI 说明', locator: { kind: 'document', value: 'dataki://roi-guide' } }],
      evidenceItems: [{ id: 'dataki-evidence-1', title: 'ROI 口径说明', summary: 'ROI 需优先结合内部消耗和回收数据。' }],
    });

    const ordered = orderRetrievalResultsByPriority([publicSearch, dataki, mcp]);

    expect(ordered.map(item => item.sourceKind)).toEqual(['mcp_business_data', 'dataki_knowledge', 'public_search']);
    expect(mcp.sourceRefs[0]?.reliability?.level).toBe('verified');
    expect(dataki.sourceRefs[0]?.metadata?.retrieval_source).toBe('dataki_knowledge');
    expect(publicSearch.evidenceRefs[0]?.metadata?.retrieval_source).toBe('public_search');
  });

  it('normalizes uploaded documents and conversation memory into the shared evidence contract', () => {
    const uploaded = buildRetrievalResultFromContract({
      sourceKind: 'uploaded_document',
      sources: [{ title: '素材复盘.xlsx', locator: { kind: 'file', value: 'attachments/material-review.xlsx' } }],
      evidenceItems: [{ title: '高点击素材摘要', summary: '近 7 天竖版强反馈素材点击率更高。', confidenceScore: 0.72 }],
    });
    const memory = buildRetrievalResultFromContract({
      sourceKind: 'conversation_memory',
      sources: [{ title: '上轮对话偏好', locator: { kind: 'document', value: 'memory://conversation/latest' } }],
      evidenceItems: [{ title: '用户偏好', summary: '用户要求结论简洁并保留依据。' }],
    });
    const trace = buildRetrievalLayerTrace(['uploaded_document', 'conversation_memory', 'public_search']);

    expect(uploaded.priority).toBe('governed_knowledge');
    expect(uploaded.sourceRefs[0]?.reliability?.level).toBe('user-provided');
    expect(uploaded.evidenceRefs[0]?.confidence?.level).toBe('medium');
    expect(memory.priority).toBe('context');
    expect(memory.evidenceRefs[0]?.sourceRefIds).toEqual([memory.sourceRefs[0]?.id]);
    expect(trace.publicSearchMaySupplement).toBe(true);
  });
});

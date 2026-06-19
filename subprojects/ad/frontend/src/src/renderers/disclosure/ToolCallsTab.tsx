'use client';

import { Collapse, Tag } from 'antd';
import type { MessageDisclosureView } from '@/contracts/disclosure';
import SafeCodeBlock from '@/components/ui/SafeCodeBlock';
import { useThemeColors } from '@/hooks/useTheme';
import { EmptyState } from './EmptyState';
import { formatToolCallPayloadText } from './tool-call-payload-format';

interface ToolCallsTabProps {
  view: MessageDisclosureView;
}

function statusColor(status: string): string {
  const text = status.toLowerCase();
  if (text.includes('fail')) return 'red';
  if (text.includes('skip')) return 'default';
  if (text.includes('warn') || text.includes('partial')) return 'gold';
  if (text.includes('success') || text.includes('ok') || text.includes('done')) return 'green';
  if (text.includes('wait') || text.includes('run')) return 'blue';
  return 'default';
}

function PayloadBlock({
  title,
  value,
}: {
  title: string;
  value?: unknown;
}) {
  const content = formatToolCallPayloadText(value);

  return (
    <SafeCodeBlock
      content={content}
      language="json"
      mode="panel"
      title={title}
      showLineNumbers
    />
  );
}

export function ToolCallsTab({ view }: ToolCallsTabProps) {
  const c = useThemeColors();
  const { execution } = view;

  if (execution.toolCalls.length === 0) {
    return <EmptyState description="当前没有工具调用记录。" />;
  }

  return (
    <div style={{ display: 'grid', gap: c.chat.spacing.inlineGap }}>
      {execution.toolCalls.map((item) => {
        const requestValue = item.request?.normalized ?? item.request?.displayValue ?? item.arguments;
        const responseValue = item.response?.normalized ?? item.response?.displayValue ?? item.result;
        const responseSummary = item.response?.error?.message || item.response?.summary || item.result;

        return (
          <div
            key={item.id}
            style={{
              border: `1px solid ${c.chat.border.subtle}`,
              borderRadius: c.chat.radius.section,
              padding: 10,
              background: c.chat.surface.panel,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: c.chat.text.primary }}>{item.displayName || item.name}</div>
              <Tag color={statusColor(item.status || '')} style={{ margin: 0, borderRadius: 999 }}>{item.status || 'unknown'}</Tag>
            </div>

            <div style={{ marginTop: 6, display: 'grid', gap: 4, fontSize: 12, color: c.chat.text.secondary, lineHeight: 1.6 }}>
              {item.kind && <div>类型：{item.kind}</div>}
              {(item.request?.summary || item.arguments) && <div>请求摘要：{String(item.request?.summary || item.arguments).slice(0, 180)}</div>}
              {responseSummary && <div>返回摘要：{String(responseSummary).slice(0, 180)}</div>}
              {typeof item.response?.rowCount === 'number' && <div>返回行数：{item.response.rowCount}</div>}
              {item.providerUrl && <div>来源：{item.providerUrl}</div>}
            </div>

            {(requestValue !== undefined || responseValue !== undefined) && (
              <Collapse
                size="small"
                ghost
                style={{ marginTop: 8 }}
                items={[{
                  key: `${item.id}-payload`,
                  label: <span style={{ fontSize: 12, color: c.chat.text.primary }}>查看请求参数和返回参数</span>,
                  children: (
                    <div style={{ display: 'grid', gap: 12 }}>
                      <PayloadBlock title="请求 JSON" value={requestValue} />
                      <PayloadBlock title="返回 JSON" value={responseValue} />
                    </div>
                  ),
                }]}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ToolCallsTab;

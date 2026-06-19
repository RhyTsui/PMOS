'use client';

import { useEffect, useState } from 'react';
import FancyCodeBlock from '@/components/ui/FancyCodeBlock';

export function DebugLogPanel({ endpoint }: { endpoint?: string }) {
  const [logText, setLogText] = useState('正在同步联调日志...');

  useEffect(() => {
    if (!endpoint) {
      setLogText('暂无日志');
      return undefined;
    }
    let stopped = false;
    let timer: number | undefined;
    const shortTime = (value?: string) => {
      if (!value) return '--:--:--';
      const match = value.match(/(\d{2}):(\d{2}):(\d{2})/);
      return match ? `${match[1]}:${match[2]}:${match[3]}` : value;
    };
    const formatLogs = (payload: { steps?: Array<{ title?: string; time?: string; log?: string }> }) => {
      const rows = (payload.steps || []).flatMap((step) => {
        const lines = String(step.log || '').split('\n').map(line => line.trim()).filter(Boolean);
        return lines.map((line) => `${shortTime(step.time)}  ${step.title || '联调'}  ${line
          .replace(/^\d{4}-\d{2}-\d{2}\s+/, '')
          .replace(/\x1b\[[0-9;]*m/g, '')}`);
      });
      return rows.join('\n') || '暂无日志步骤';
    };
    const poll = async () => {
      if (stopped) return;
      try {
        const response = await fetch(endpoint, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json() as { steps?: Array<{ title?: string; time?: string; log?: string }> };
        if (!stopped) setLogText(formatLogs(payload));
      } catch (error) {
        if (!stopped) setLogText(`读取失败：${error instanceof Error ? error.message : '未知错误'}`);
      } finally {
        if (!stopped) timer = window.setTimeout(poll, 3000);
      }
    };
    void poll();
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [endpoint]);

  return (
    <FancyCodeBlock language="log" codeStyle="one-dark" showLineNumbers fontSize={12} defaultExpanded>
      {logText}
    </FancyCodeBlock>
  );
}

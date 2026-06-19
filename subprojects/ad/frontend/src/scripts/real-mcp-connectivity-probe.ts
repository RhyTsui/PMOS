type ProbeStatus = 'pass' | 'fail' | 'skip';

interface ProbeResult {
  id: string;
  name: string;
  endpoint_set: boolean;
  status: ProbeStatus;
  transport?: string;
  auth_type?: string;
  http_status?: number;
  normalized_status: 'succeeded' | 'tool_failed' | 'unavailable' | 'not_configured';
  detail: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function extractHttpStatus(value: unknown): number | undefined {
  const text = value instanceof Error ? value.message : JSON.stringify(value);
  const match = text.match(/\b(400|401|403|404|406|409|422|429|500|502|503|504)\b/);
  return match ? Number(match[1]) : undefined;
}

function normalizeMcpStatus(httpStatus?: number): ProbeResult['normalized_status'] {
  if (!httpStatus) return 'tool_failed';
  if (httpStatus === 401 || httpStatus === 403 || httpStatus === 404) return 'unavailable';
  if (httpStatus === 400 || httpStatus === 406 || httpStatus === 409 || httpStatus === 422) return 'tool_failed';
  if (httpStatus === 429 || httpStatus >= 500) return 'unavailable';
  return 'tool_failed';
}

async function main(): Promise<void> {
  console.log('validation_mode=real_mcp_no_mock');
  const { listMcpServers } = await import('../src/lib/mcp-server-store');
  const { discoverMcpServer } = await import('../src/lib/mcp-discovery');
  const servers = await listMcpServers();

  const results: ProbeResult[] = [];
  for (const server of servers) {
    const serverRecord = server as unknown as Record<string, unknown>;
    const id = String(serverRecord.id || 'unknown');
    const name = String(serverRecord.name || id);
    const endpoint = String(serverRecord.endpoint_url || '').trim();
    const base = {
      id,
      name,
      endpoint_set: Boolean(endpoint),
      transport: typeof serverRecord.transport === 'string' ? serverRecord.transport : undefined,
      auth_type: typeof serverRecord.auth_type === 'string' ? serverRecord.auth_type : undefined,
    };
    if (!endpoint) {
      results.push({
        ...base,
        status: 'skip',
        normalized_status: 'not_configured',
        detail: 'endpoint_url is empty',
      });
      continue;
    }
    try {
      const discovered = await discoverMcpServer(server);
      const discoveredRecord: Record<string, unknown> = isRecord(discovered) ? discovered : {};
      const discoveredTools = Array.isArray(discoveredRecord.tools) ? discoveredRecord.tools : [];
      results.push({
        ...base,
        status: 'pass',
        normalized_status: 'succeeded',
        detail: `discovered_tools=${discoveredTools.length}`,
      });
    } catch (error) {
      const httpStatus = extractHttpStatus(error);
      results.push({
        ...base,
        status: 'fail',
        http_status: httpStatus,
        normalized_status: normalizeMcpStatus(httpStatus),
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const result of results) {
    const mark = result.status === 'pass' ? 'PASS' : result.status === 'skip' ? 'SKIP' : 'FAIL';
    console.log(`[${mark}] ${result.id} ${JSON.stringify(result)}`);
  }

  const governanceFailures = results.filter(result => result.http_status === 401 || result.http_status === 406 || result.http_status === 400);
  if (governanceFailures.length > 0) {
    console.error(`mcp_governance_failures=${governanceFailures.length}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

export {};

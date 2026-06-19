import { listMcpServers } from '../src/lib/mcp-server-store';

async function main() {
  const servers = await listMcpServers();
  const 报表MCP = servers.find(s => s.name.includes('报表') && s.status === 'connected');
  if (!报表MCP) { console.log('报表MCP not found/not connected'); return; }
  
  const dictTool = 报表MCP.tools.find(t => t.name === 'get_dict_zt_all_media');
  if (!dictTool) { console.log('get_dict_zt_all_media not found'); return; }
  
  console.log('Endpoint:', 报表MCP.endpoint_url);
  console.log('Transport:', 报表MCP.transport);
  console.log('Calling get_dict_zt_all_media...');
  
  const startTime = Date.now();
  try {
    // Direct HTTP call to MCP endpoint
    const response = await fetch(报表MCP.endpoint_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: dictTool.name,
          arguments: { appId: 10100001 },
        },
        id: 1,
      }),
      signal: AbortSignal.timeout(15000),
    });
    
    const elapsed = Date.now() - startTime;
    console.log('Response status:', response.status, '| elapsed:', elapsed + 'ms');
    
    const text = await response.text();
    console.log('Response preview:', text.slice(0, 500));
    
    // Try to parse and find 巨量
    try {
      const json = JSON.parse(text);
      const content = json.result?.content || json.result || [];
      const contentText = Array.isArray(content) 
        ? content.map((c: any) => c.text || '').join('')
        : JSON.stringify(content);
      
      const 巨量Match = contentText.match(/巨量[^"]*/g);
      console.log('\n巨量 matches:', 巨量Match?.slice(0, 5));
      
      // Look for media_id patterns
      const idMatch = contentText.match(/(?:media_id|id|mediaId)["\s:]+["']?(\d+)["']?/g);
      console.log('ID patterns:', idMatch?.slice(0, 5));
    } catch {
      console.log('(response is not JSON)');
    }
  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.log('Call FAILED after', elapsed + 'ms:', err instanceof Error ? err.message : String(err));
  }
}
main().catch(e => console.error(e));

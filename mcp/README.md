# MCP Integration

This directory stores MCP integration contracts and examples.

## Scope
- Define how the local AI OS discovers and invokes external tools
- Keep tool transport separate from workflow logic
- Treat MCP as an integration layer, not as the workflow engine itself

## Files
- `tool-registry.schema.json` — schema for tool registration metadata
- `mcp-servers.example.json` — example server configuration

## Policy
- Tool metadata should include capability tags and risk labels
- Secrets must not be committed
- Future OpenSpec / Superpowers integrations should consume this layer rather than duplicate it

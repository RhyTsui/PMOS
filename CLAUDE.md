# PMAIOS Shared Tool Context

Claude must treat this repository as a shared workspace with Codex.

Before starting or resuming substantive work:

1. Read `docs/memory/mcp-context/session-state.json` when it exists.
2. Read recent events with `npm run cli -- mcp-context events 20`.
3. Read active tasks with `npm run cli -- mcp-context tasks --status in_progress`.

During work:

- Record task starts with `npm run cli -- mcp-context task-start "<label>" --tool claude`.
- Record important decisions with `npm run cli -- mcp-context checkpoint "<label>" --tool claude`.
- Mark completed shared tasks with `npm run cli -- mcp-context task-complete <taskId> --tool claude`.

If switching between Claude and Codex, use the shared `mcp-context` commands as the handoff source of truth. Do not rely only on the hidden conversation context of either CLI.

# Claude Design Tooling Status

## Status

- Checked on: `2026-04-19`
- `Claude Code` is installed globally.
- Global package detected before this pass: `@anthropic-ai/claude-code@2.1.89`
- No npm package named `claude-design` exists in the public npm registry.
- Installed closest matching design capability package: `claude-design-system@1.0.7`
- Installed command: `design-system`
- Working Windows command: `design-system.cmd`

## Local Setup Result

Running `design-system.cmd --help` completed setup and created local design-system assets:

- `.claude/commands/extract-it.md`
- `.claude/commands/expand-it.md`
- `.claude/commands/merge-it.md`
- `.claude/commands/design-it.md`
- `DESIGN-SYSTEM.md`
- `inspiration/`
- `generated/`

Note: `.claude/` is ignored by `.gitignore`, so the command files are local tooling state rather than tracked repository source.

## Usage

Use the `.cmd` shim on this Windows machine because PowerShell blocks the generated `.ps1` shim under the current execution policy.

```powershell
design-system.cmd --help
```

Inside Claude Code, the installed slash-command flow is:

- `/extract-it`
- `/expand-it`
- `/merge-it`
- `/design-it`

## Operational Decision

For PMAIOS planning, this closes the requested `claude design` tooling check/install item. Treat it as an external local design assistant capability, not as part of the PMAIOS runtime kernel.

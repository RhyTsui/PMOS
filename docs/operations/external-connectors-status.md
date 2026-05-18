# External Connectors Status

## Scope

Current `v0.4` connector scope is limited to connectors that directly help the project PM produce daily product outputs:

- Notion
- Figma
- Web page fetch
- DingTalk AI meeting notes
- GitHub push / CI artifact verification

Secrets are stored only in local `.env`. Do not write raw tokens into tracked docs, tests, or commits.

## Current Status

| Connector | Status | Current Capability | Blocker / Note |
| --- | --- | --- | --- |
| Notion | page-mode connected / inbox digest sync verified | API token loaded from local `.env`; connector now supports `NOTION_DATABASE_ID` or `NOTION_PAGE_ID`; inbox knowledge digests have been written into the configured Notion page target | PRD / meeting-note history queries still benefit from real database targets; a live check against Dataki `版本库` still showed `0` retrieval hits for the fresh inbox digest pages, so downstream `Notion -> Dataki` auto-refresh is not yet proven |
| Figma | team id configured / token remote check failing | `FIGMA_TEAM_ID` is configured from the provided team URL; team-project listing endpoint is implemented | Current local Figma token returns `403 Invalid token`; needs a fresh Figma API token or token with access to the team |
| Web page fetch | implemented | Fetches a URL and writes source markdown into `docs/sources/inbox/` | Network access depends on local runtime permissions |
| DingTalk AI meeting notes | implemented as manual import | Paste/export transcript into console; system writes inbox source and runs documentation normalization | Automatic extraction from logged-in DingTalk desktop is not reliable without an official export/API/source path |
| GitHub push / CI artifact | completed for artifact publication | Remote `origin` is `https://github.com/RhyTsui/pmaios.git`; `main` is pushed without force-push; GitHub Actions run `24621458060` succeeded and published `pmaios-dist` | Artifact id `6515788105`, digest `sha256:ccc33b3e4ce274f52afc855a60d4eb21dae318fafaac3ba96e3cf728d3e19938`; direct anonymous REST download returns `401`, so download requires an authenticated GitHub browser/API session |

## Implemented API

- `GET /api/connectors/status`
- `GET /api/connectors/status?checkRemote=true`
- `POST /api/connectors/web-fetch`
- `POST /api/connectors/figma/files/inspect`
- `GET /api/connectors/figma/team/projects`
- `POST /api/connectors/dingtalk/meeting-notes`

## Product Console

The frontend now exposes an `External Connectors` panel:

- shows Notion / Figma / Web / DingTalk readiness
- fetches web pages into governed inbox sources
- inspects Figma files by file key
- imports DingTalk meeting transcripts and triggers document normalization

## DingTalk UI Automation Scaffold

Windows local automation scaffold is now available for driving `DingTalk.exe` through a JSON flow file:

- `scripts/dingtalk-ui-automation.ps1`
- `scripts/dingtalk-export-flow.example.json`
- `npm run dingtalk:ui`

What it can do:

- locate or launch `DingTalk.exe`
- activate the DingTalk window
- wait for UI elements by name / automation id / class name
- click UI elements
- click relative coordinates inside the DingTalk window
- send keyboard input
- optionally show the latest files in `DINGTALK_EXPORT_ROOT`

Current limitation:

- this is a local Windows UI automation scaffold, not a guaranteed universal export flow
- actual DingTalk export still depends on the installed client language, layout, permissions, and the exact meeting-history page structure
- the flow file should be customized against the real DingTalk window on this machine

## Next Required Inputs

- Optional: dedicated Notion database IDs for PRD / meeting notes / general product decisions if you want queryable structured records instead of page-mode digest pages only.
- Fresh Figma API token or access fix for team `1627565597168043008`; then use team projects to select an active file key.
- DingTalk meeting transcript export or copied AI meeting note content.
- Internal system connectors are intentionally skipped for current v0.4 scope until concrete systems are provided.

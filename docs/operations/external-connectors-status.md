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
| Notion | configured locally | API token loaded from `.env`; backend status endpoint available | Database IDs are still missing, so database sync targets are not ready |
| Figma | configured locally | API token loaded from `.env`; file inspection endpoint available when file key is provided | Needs a Figma file key for concrete inspection |
| Web page fetch | implemented | Fetches a URL and writes source markdown into `docs/sources/inbox/` | Network access depends on local runtime permissions |
| DingTalk AI meeting notes | implemented as manual import | Paste/export transcript into console; system writes inbox source and runs documentation normalization | Automatic extraction from logged-in DingTalk desktop is not reliable without an official export/API/source path |
| GitHub push / CI artifact | completed for artifact publication | Remote `origin` is `https://github.com/RhyTsui/pmaios.git`; `main` is pushed without force-push; GitHub Actions run `24621458060` succeeded and published `pmaios-dist` | Artifact id `6515788105`, digest `sha256:ccc33b3e4ce274f52afc855a60d4eb21dae318fafaac3ba96e3cf728d3e19938`; direct anonymous REST download returns `401`, so download requires an authenticated GitHub browser/API session |

## Implemented API

- `GET /api/connectors/status`
- `GET /api/connectors/status?checkRemote=true`
- `POST /api/connectors/web-fetch`
- `POST /api/connectors/figma/files/inspect`
- `POST /api/connectors/dingtalk/meeting-notes`

## Product Console

The frontend now exposes an `External Connectors` panel:

- shows Notion / Figma / Web / DingTalk readiness
- fetches web pages into governed inbox sources
- inspects Figma files by file key
- imports DingTalk meeting transcripts and triggers document normalization

## Next Required Inputs

- Notion database IDs for PRD / meeting notes / general product decisions.
- Figma file key for the active design source.
- DingTalk meeting transcript export or copied AI meeting note content.

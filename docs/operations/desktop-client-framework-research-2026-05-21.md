# PMOS Desktop Client Framework Research

- date: 2026-05-21
- status: research
- scope: open-source desktop client framework selection and deployment integration path

## User Requirement

用户要求先调研一个开源框架，后续可以部署并对接起来，并补充倾向：最好做成桌面客户端。

当前阶段不做 PMOS 页面，不改业务代码。目标是先明确桌面客户端的技术路线、对接方式、风险和下一步验证口径。

## Product Requirement

PMOS 需要从“本地开发服务 + 浏览器访问”推进到“产品经理可双击启动的本地优先桌面客户端”。

产品侧要求：

1. 复用现有 React / Vite 前端和 Node / Express 后端，不在桌面化阶段重写 PMOS 业务页面。
2. 桌面客户端必须能托管或拉起本地 PMOS runtime，用户不需要手动开终端。
3. 运行边界应清晰：桌面壳负责窗口、生命周期、本地进程、更新、日志；PMOS 后端继续负责业务 API、文件工作区、知识库、工作流运行。
4. 后续要能支持 Windows 优先打包，逐步扩展 macOS / Linux。
5. 不把 Cloud mirror 对外发布重新拉回当前 todo；这条只处理本地桌面部署路线。

## Current PMOS Runtime Fit

仓库当前形态适合“桌面壳 + 本地后端 sidecar”的集成方式：

| Area | Current State | Desktop Implication |
| --- | --- | --- |
| Frontend | Vite + React 19，`npm run build:frontend` 输出 `dist/` | 可直接作为 WebView 页面资源 |
| Backend | Node / Express，`npm run start` 启动 `dist/backend/src/backend/server.js` | 可作为桌面 sidecar 进程 |
| Local URL | 默认 `PORT=4312` | 桌面壳可加载 `http://127.0.0.1:<port>/workspace` 或根路径 |
| Workspace root | `AI_OS_ROOT` 或 `process.cwd()` | 桌面壳需要显式传入工作区目录 |
| Static serving | 后端已服务 `dist/` 和 `/workspace` | 不需要引入第二套前端路由承载方式 |
| External services | Dataki / Notion / vector fallback 等按现有配置运行 | 桌面包不能内置 secrets，需保留本地配置机制 |

因此，桌面化优先考虑“PMOS 后端保持 Node runtime，桌面框架负责启动和监管它”，而不是把 PMOS 后端重写为 Rust / Go / C++。

## Candidate Frameworks

| Framework | Open Source Status | Fit for PMOS | Main Strength | Main Risk |
| --- | --- | --- | --- | --- |
| Tauri v2 | Apache-2.0 / MIT | high | 体积轻，使用系统 WebView，官方支持 external binary / Node sidecar / updater | 需要 Rust 工具链；Node 后端需先打成可分发 sidecar |
| Electron | MIT | medium-high | 对现有 Node / Vite / Express 最直接，生态成熟，POC 最快 | 包体和内存更重；安全面更大；需要严格 BrowserWindow / preload / CSP 约束 |
| Wails | MIT | medium-low | Go + WebView，单二进制体验好，体积轻 | 后端主语言是 Go；PMOS 当前 Node 后端会变成尴尬 sidecar 或需要重写 |
| Neutralinojs | source-available/open repo with license file | medium-low | 轻量、无需 Chromium、可跨平台 | 更适合轻应用；复杂本地 runtime、更新、进程监管、审计日志能力不如 Tauri/Electron 稳 |

## Recommendation

主路线选择 `Tauri v2`。

理由：

1. PMOS 是本地优先、文件工作区驱动、需要长时间运行的生产力客户端，适合轻量 WebView 桌面壳。
2. Tauri 官方支持 external binaries / sidecar，可把现有 Node 后端作为随包进程拉起，不要求用户安装 Node。
3. Tauri 支持 updater 插件，后续可以接入静态 JSON 或更新服务，不需要一开始设计完整发布云。
4. 与 Electron 相比，Tauri 不捆绑 Chromium，更适合长期产品化的安装体积和资源占用目标。
5. 与 Wails 相比，Tauri 不要求把 PMOS 后端迁移成 Go，迁移阻力更低。

保留 `Electron` 作为快速 POC 备选。

如果目标变成“1-2 天内先打出 Windows 可打开的 demo 包”，Electron 可以更快，因为它天然处于 Node 生态。但它不应作为默认长期路线，除非 Tauri sidecar 包装在 Windows 上被证明成本过高。

## Proposed Architecture

```text
PMOS Desktop Client
  ├─ Tauri shell
  │   ├─ window / tray / single-instance
  │   ├─ local backend lifecycle
  │   ├─ update check
  │   └─ logs / crash diagnostics
  ├─ PMOS backend sidecar
  │   ├─ Node executable or packaged Node runtime
  │   ├─ Express API
  │   ├─ AI_OS_ROOT workspace binding
  │   └─ Dataki / Notion / local memory integrations
  └─ PMOS frontend
      ├─ existing Vite build
      └─ loaded from local backend URL
```

Recommended runtime flow:

1. Tauri starts.
2. Tauri selects a local port, preferably avoiding fixed-port collision.
3. Tauri launches PMOS backend sidecar with `AI_OS_ROOT` and `PORT`.
4. Tauri waits for backend health endpoint.
5. Tauri opens `http://127.0.0.1:<port>/workspace`.
6. On quit, Tauri gracefully stops the sidecar and flushes logs.

## Required PMOS Adjustments For Spike

These are not implementation tasks in this research step, but they define the next safe technical spike.

1. Add a lightweight backend health endpoint, for example `GET /api/health`.
2. Make desktop mode able to choose a port without colliding with a developer server.
3. Make backend startup log structured enough for desktop diagnostics.
4. Add a `desktop` app folder, likely `apps/desktop/` or `desktop/tauri/`, without moving current PMOS code.
5. Package backend as a sidecar executable or a bundled Node runtime.
6. Keep secrets external: `.env`, Notion token, Dataki config, model provider keys must not be baked into installers.

## Deployment Plan

### Phase 0: Research Baseline

Output this document as the desktop framework selection truth source.

Acceptance:

- open-source framework candidates compared
- recommendation explicit
- PMOS runtime fit checked against current repo
- no business code changed

### Phase 1: Tauri Spike

Goal: prove PMOS can be launched by a desktop shell locally.

Work items:

1. Scaffold Tauri under a contained folder.
2. Dev mode loads existing Vite dev server or existing backend URL.
3. Production-like mode runs current `npm run build` output.
4. Tauri launches backend sidecar or, for the first spike only, detects an already-running backend.
5. Add health check and graceful quit behavior.

Acceptance:

- double-click / desktop command opens PMOS without manually opening browser
- current frontend route works
- existing API calls continue to work
- no PMOS page rewrite

### Phase 2: Windows Alpha Package

Goal: produce a Windows installable or portable alpha.

Work items:

1. Package backend sidecar for Windows.
2. Bundle frontend and backend into desktop artifact.
3. Add app icon, name, version, logs path.
4. Add single-instance guard.
5. Add basic update channel stub, not public release.

Acceptance:

- fresh Windows machine can install / open
- no terminal required
- app closes backend cleanly
- diagnostics are recoverable from local logs

### Phase 3: Product-Grade Desktop

Goal: desktop client becomes a supported PMOS distribution channel.

Work items:

1. Code signing.
2. Auto-update feed.
3. Settings surface for local workspace, provider keys, connector status.
4. Backup / export / repair entry.
5. Desktop release checklist in product repo release package.

## Risks And Controls

| Risk | Impact | Control |
| --- | --- | --- |
| Node backend sidecar packaging fails or becomes unstable | Desktop cannot be distributed cleanly | Spike sidecar packaging before UI polish; keep Electron fallback |
| Port conflict | Desktop opens wrong or stale backend | Desktop chooses port and passes it explicitly; add health check with PMOS version |
| Secrets leakage | Installer could contain local tokens | Never bundle `.env`; desktop settings should store local-only secrets |
| WebView compatibility | System WebView differs from Chrome | Browser acceptance should include desktop WebView smoke test |
| Long-running backend lifecycle | Zombie process or lost logs | Tauri owns child process lifecycle and writes logs to app data |
| Update trust | Unsafe update channel | Use signed updates before external distribution |

## Decision

Classify this requirement as `partial`.

User requirement status:

- `solved`: framework selection direction is clear
- `partial`: deployment is not implemented yet
- `unsolved`: desktop package has not been built or validated

Product requirement status:

- `solved`: PMOS desktop architecture direction is defined
- `partial`: integration contracts are identified but not yet implemented
- `unsolved`: release-grade desktop distribution remains future work

Recommended next safe step:

1. Start a Tauri spike in an isolated desktop folder.
2. Add only the minimal backend health/port/lifecycle changes required for the spike.
3. Validate with existing `npm run validate` plus a desktop smoke test.

## Sources

- Tauri official docs: `https://v2.tauri.app/start/`
- Tauri external binaries / sidecar docs: `https://v2.tauri.app/develop/sidecar/`
- Tauri Node.js sidecar guide: `https://v2.tauri.app/learn/sidecar-nodejs/`
- Tauri updater plugin docs: `https://v2.tauri.app/plugin/updater/`
- Tauri GitHub repository and license metadata: `https://github.com/tauri-apps/tauri`
- Electron official docs: `https://www.electronjs.org/docs/latest/`
- Electron BrowserWindow docs: `https://www.electronjs.org/docs/latest/api/browser-window`
- Electron autoUpdater docs: `https://www.electronjs.org/docs/latest/api/auto-updater`
- Electron GitHub repository and license metadata: `https://github.com/electron/electron`
- Wails architecture docs: `https://v3.wails.io/concepts/architecture/`
- Wails GitHub repository and license metadata: `https://github.com/wailsapp/wails`
- Neutralinojs official docs: `https://neutralino.js.org/docs/`
- Neutralinojs GitHub repository and license metadata: `https://github.com/neutralinojs/neutralinojs`

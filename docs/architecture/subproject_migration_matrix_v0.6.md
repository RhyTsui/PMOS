# Subproject Migration Matrix v0.6

- 日期：2026-04-17
- 状态：Current Inventory
- 目标：为 `T6 子项目目录收敛` 提供当前差距表

## 1. 盘点结果

| 项目 | subproject.json | README | docs/memory | src | frontend | tests | 当前判断 |
|---|---|---|---|---|---|---|---|
| `ad` | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | 代码仓，缺平台注册与项目记忆 |
| `ad-intelligence` | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | 代码仓，缺平台注册与项目记忆 |
| `data-service` | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | 基本接入，缺项目总说明 |
| `knowledge-base` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | 文档较多，缺测试与结构收敛 |
| `mcp` | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | 基本接入，缺项目总说明 |
| `server` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | 最接近标准 |
| `tracking-acceptance` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | 资料仓形态，需先补注册与执行入口 |

## 2. 项目级判断

### `ad`

- 优点：代码、前端、测试都在，已具备独立工程形态
- 缺口：
  - 缺 `subproject.json`
  - 缺 `docs/memory/project-memory.md`
  - 顶层还有 `ARCHITECTURE.md / CLAUDE.md` 等历史文件，尚未统一到标准职责

建议优先级：`P0`

### `ad-intelligence`

- 优点：已有 `README / docs / src / tests`
- 缺口：
  - 缺 `subproject.json`
  - 缺 `docs/memory/project-memory.md`
  - 尚未明确是否需要独立 `frontend/`

建议优先级：`P0`

### `data-service`

- 优点：已注册、已有 memory、src、tests
- 缺口：
  - 缺顶层 `README.md`
  - 建议后续补 `docs/requirements / docs/versions / docs/decisions`

建议优先级：`P1`

### `knowledge-base`

- 优点：已注册、已有 memory、README、较多领域文档
- 缺口：
  - 文档仍偏散，`docs/` 下存在大量未分层文档
  - 缺 `tests/`
  - 需要把 `PRD / TASKS / suggestion` 等逐步收敛到标准目录

建议优先级：`P1`

### `mcp`

- 优点：已注册、已有 memory、src、tests
- 缺口：
  - 缺顶层 `README.md`
  - 目录语义仍偏技术实现，业务说明不足

建议优先级：`P1`

### `server`

- 优点：已注册、已有 README / memory / src / tests
- 缺口：
  - 仍建议补齐项目级 `requirements / versions / decisions / review`

建议优先级：`P2`

### `tracking-acceptance`

- 优点：README 信息完整，已有 `docs/memory`
- 缺口：
  - 缺 `subproject.json`
  - 没有 `src/`
  - README 中仍引用 `docs/incoming/` 旧路径语义
  - 当前更像项目说明仓，不像可挂接项目

建议优先级：`P0`

## 3. 迁移顺序

### Phase A｜补最小接入面

1. `ad`
2. `ad-intelligence`
3. `tracking-acceptance`

目标：

- 补 `subproject.json`
- 补 `docs/memory/project-memory.md`
- 让平台能稳定识别这些项目

### Phase B｜补说明与结构

4. `data-service`
5. `mcp`
6. `knowledge-base`

目标：

- 补 README
- 逐步把文档收敛到标准目录

### Phase C｜细化治理

7. `server`

目标：

- 补 requirements / versions / review 等治理目录

## 4. 统一迁移原则

- 不大规模移动旧代码目录
- 先补项目注册和说明
- 再补记忆、需求、版本、决策目录
- 最后再做目录收敛

## 5. 下一步最值得直接做的事

### P0 第一批

- 为 `ad` 新增 `subproject.json`
- 为 `ad-intelligence` 新增 `subproject.json`
- 为 `tracking-acceptance` 新增 `subproject.json`

### P1 第二批

- 为 `data-service` 新增 `README.md`
- 为 `mcp` 新增 `README.md`
- 为 `tracking-acceptance` 补最小 `src/` 占位或明确“资料项目”定位

# CHANGELOG

## 2026-05-09

### Added

1. 独立 `PMOS product repo` 首版骨架
2. 对外入口与部署文档：
   - `README`
   - `docs/deployment/first-run.md`
   - `docs/deployment/environment-variables.md`
   - `docs/deployment/second-machine-verification-checklist.md`
3. 核心产品真源：
   - `docs/operations/pmaios-introduction.md`
   - `docs/operations/current-version-progress.md`
   - `docs/operations/pmaios-v1.0-direction.md`
   - `docs/operations/v1.0-acceptance-standard.md`
4. 发布辅助文档：
   - `docs/operations/github-release-readiness-checklist.md`
   - `docs/operations/release-steps.md`
   - `docs/operations/github-repo-cutover-sequence.md`
5. `cloud-mirror` 样例：
   - `runtime-status.sample.json`
   - `runtime-status.sample.md`
   - `checkpoints/latest.sample.json`
   - `review-scorecards/latest.sample.json`

### Runtime And Productization Progress

1. 独立目录下已完成 `npm install`
2. 独立目录下已完成 `npm run lint`
3. 独立目录下已完成 `npm run build`
4. 独立目录下已完成 `npm start`
5. `GET /api/health` 返回 `200`
6. `GET /` 返回 `200`

### v1.0 Truth Synced Into Product Repo

1. `specialist activation` 已同步进 `v1.0` 产品真源
2. `frontend-browser-verification / Playwright verification` 已同步进 `v1.0` 产品真源
3. `GitHub + Notion + cloud-mirror` 云端知识分层已同步进产品真源
4. “先形成首版产品仓，再继续补齐未闭环项”的策略已同步进产品真源

### Known Follow-Up Patches

1. 更完整的测试抽取
2. 更真实的 `cloud-mirror latest-state` 接线
3. 第二台真实设备上的完整部署验证
4. 面向外部操作者的更完整操作文档
5. 持续把母仓新增 `v1.0` 真源补丁同步回产品仓

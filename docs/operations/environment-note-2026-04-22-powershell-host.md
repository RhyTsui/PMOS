# 环境备注 2026-04-22

## 结论

当前桌面会话的 PowerShell 宿主异常，导致通过 Codex 的 `shell_command` 无法正常启动命令执行链。

## 现象

- `shell_command` 在最基础的 `Get-Content`、`dir` 场景下即失败
- 失败发生在 PowerShell 启动阶段，不是具体命令本身报错
- 当前会话内继续围绕 PowerShell 宿主排障的收益很低

## 影响

- 本地仓库扫描
- 本地服务启动与 UI smoke
- `npm run cli -- mcp-context ...` 共享上下文读写
- 本地依赖、测试、脚本、安装链检查

## 已知例外

- CodexCLI 本身可用
- 远端 Web / GitHub / 连接器侧能力仍可部分使用

## 建议

- 当前桌面会话默认走 CodexCLI 主路径，不再在该 PowerShell 宿主上持续排障
- 如需继续本地执行，优先切换到可正常拉起命令执行链的新终端宿主
- 在宿主恢复前，将本轮工作视为“远端信息补齐 + 阻塞清单 + 非壳层配置验证”

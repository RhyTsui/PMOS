# 微信公众号采集完整部署指南

## 📋 部署步骤

### 第一步：重启 Docker（必需）

由于修改了 Docker 镜像源配置，需要重启 Docker：

**Windows Docker Desktop：**
1. 右键点击系统托盘中的 Docker 图标
2. 选择 "Restart Docker Desktop"
3. 等待 Docker 完全启动（状态栏显示绿色）

**或命令行方式：**
```bash
# 停止 Docker 服务
net stop com.docker.service

# 启动 Docker 服务
net start com.docker.service
```

### 第二步：运行部署脚本

```bash
cd /e/AI/ai-os/subprojects/gi/scripts

# 赋予执行权限
chmod +x deploy-wewe-rss.sh

# 运行部署脚本
./deploy-wewe-rss.sh
```

脚本会自动：
- ✅ 检查 Docker 状态
- ✅ 清理旧容器
- ✅ 拉取 WeWe RSS 镜像（尝试多个镜像源）
- ✅ 创建数据卷
- ✅ 启动 WeWe RSS 容器
- ✅ 验证服务状态

### 第三步：配置 WeWe RSS

1. **访问 WeWe RSS**
   - 打开浏览器访问：http://10.236.14.27:4000
   - 或 http://localhost:4000

2. **微信扫码登录**
   - 使用微信扫码登录（需要微信读书账号）
   - 如果没有微信读书，需要先下载并注册

3. **添加公众号**
   在"公众号源"中添加以下公众号：
   - 游戏那点事Gamez
   - 游戏葡萄
   - 游戏陀螺
   - 触乐
   - 游研社
   - 游戏茶馆
   - 竞核
   - 游戏干线
   - 手游那点事
   - 罗斯基
   - 等其他您关注的公众号

4. **获取 RSS 地址**
   每个公众号会生成一个 RSS 地址，格式如：
   ```
   http://10.236.14.27:4000/feeds/游戏那点事Gamez.xml
   ```

### 第四步：添加到 GI 系统

```bash
cd /e/AI/ai-os/subprojects/gi/scripts

# 赋予执行权限
chmod +x add-wechat-sources.sh

# 运行添加脚本
./add-wechat-sources.sh
```

脚本会自动将预定义的公众号列表添加到 GI 系统。

### 第五步：验证采集

```bash
# 查看所有微信公众号源
curl http://10.236.14.27:8003/api/v1/sources | jq '.data[] | select(.sourceType == "wechat_mp")'

# 手动触发采集
curl -X POST http://10.236.14.27:8003/api/v1/collection/collect-all

# 查看采集结果
curl http://10.236.14.27:8003/api/v1/evidence | jq '.data | length'
```

---

## 🔧 故障排查

### 问题 1：Docker 镜像拉取失败

**症状：**
```
Error response from daemon: unknown: failed to resolve reference ...
```

**解决方案：**

1. **检查网络连接**
   ```bash
   ping docker.io
   ```

2. **尝试其他镜像源**
   编辑 `~/.docker/daemon.json`，尝试以下镜像源：
   ```json
   {
     "registry-mirrors": [
       "https://dockerhub.icu",
       "https://hub.rat.dev",
       "https://docker.1panel.live",
       "https://doh.baidubce.com",
       "https://docker.mirrors.ustc.edu.cn"
     ]
   }
   ```

3. **手动拉取**
   在有网络的机器上：
   ```bash
   docker pull cooderl/wewe-rss:latest
   docker save cooderl/wewe-rss > wewe-rss.tar
   ```
   
   传输到目标机器后：
   ```bash
   docker load < wewe-rss.tar
   ```

### 问题 2：WeWe RSS 无法登录

**症状：**
- 二维码无法显示
- 扫码后无法登录

**解决方案：**
1. 检查微信读书账号是否正常
2. 查看 WeWe RSS 日志：
   ```bash
   docker logs -f wewe-rss
   ```
3. 重启 WeWe RSS：
   ```bash
   docker restart wewe-rss
   ```

### 问题 3：公众号文章采集不到

**症状：**
- GI 系统中没有采集到公众号文章

**解决方案：**
1. **检查 WeWe RSS 中是否已添加公众号**
   - 访问 http://10.236.14.27:4000
   - 确认公众号已添加并有文章

2. **检查 RSS 地址是否正确**
   ```bash
   curl http://10.236.14.27:4000/feeds/游戏那点事Gamez.xml
   ```

3. **检查 GI 系统中的源配置**
   ```bash
   curl http://10.236.14.27:8003/api/v1/sources | jq '.data[] | select(.name == "游戏那点事Gamez")'
   ```

4. **手动触发采集**
   ```bash
   curl -X POST http://10.236.14.27:8003/api/v1/collection/collect-all
   ```

5. **查看 GI 系统日志**
   查看后端服务的日志输出

---

## 📊 验证清单

部署完成后，检查以下项目：

- [ ] Docker 服务正常运行
- [ ] WeWe RSS 容器运行正常 (`docker ps | grep wewe-rss`)
- [ ] WeWe RSS 服务可访问 (http://10.236.14.27:4000)
- [ ] 微信扫码登录成功
- [ ] 公众号已添加到 WeWe RSS
- [ ] RSS 地址可访问
- [ ] 公众号源已添加到 GI 系统
- [ ] GI 系统可以采集到公众号文章

---

## 🎯 预期结果

部署成功后，您应该能够：

1. ✅ 在 WeWe RSS 中管理微信公众号
2. ✅ 在 GI 系统中看到微信公众号源
3. ✅ GI 系统自动采集公众号文章
4. ✅ 在情报看板中看到公众号文章
5. ✅ 对公众号文章进行 LLM 抽取和分析

---

## 📞 获取帮助

如果遇到问题：

1. 查看 WeWe RSS 官方文档：https://github.com/cooderl/wewe-rss
2. 查看 GI 系统日志
3. 检查 Docker 日志：`docker logs wewe-rss`
4. 查看本文档的故障排查部分

---

## 🔐 安全提示

- WeWe RSS 使用微信读书账号登录，请保护好自己的账号安全
- 建议在内网环境使用，避免公网暴露
- 定期备份 WeWe RSS 数据卷：
  ```bash
  docker run --rm -v wewe-data:/data -v $(pwd):/backup alpine tar czf /backup/wewe-data-backup.tar.gz /data
  ```

---

## 📝 备注

- WeWe RSS 依赖微信读书的接口，如果微信读书接口变化，可能需要更新 WeWe RSS
- 建议定期更新 WeWe RSS 到最新版本：
  ```bash
  docker pull cooderl/wewe-rss:latest
  docker stop wewe-rss
  docker rm wewe-rss
  # 然后重新运行部署脚本
  ```

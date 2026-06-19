# 编码治理规范

## 项目编码标准

本项目统一使用 **UTF-8 without BOM** 编码，**LF** 换行符。

### 适用范围

- 所有源码文件：`.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.md`, `.html`, `.css`, `.scss`, `.yaml`, `.yml`
- 配置文件：`.env`, `.env.example`, `.toml`, `.cfg`, `.ini`
- 脚本文件：`.sh`, `.bash`, `.ps1`
- 架构文档、fixture、golden schema、Prompt seed、Trace/review 文本资产

### 不适用

- Windows 批处理：`.bat`, `.cmd`（保持 CRLF）
- PowerShell：`.ps1`（保持 CRLF）
- 二进制文件：图片、字体、压缩包等

---

## UTF-8 规范

### 禁止

- UTF-8 BOM（`EF BB BF`）
- GBK / GB2312 / GB18030 编码
- ANSI 编码
- UTF-16 编码

### 检查

```bash
npm run check:encoding
```

等价根级命令：

```bash
node ../../scripts/check-text-encoding.cjs --scope=tracked
```

全工作区审计使用：

```bash
node ../../scripts/check-text-encoding.cjs --scope=workspace --json --no-fail
```

API、SSE、DOM、Network payload 等运行态文本可以通过 stdin 扫描：

```bash
curl -s http://127.0.0.1:8002/api/example | node ../../scripts/check-text-encoding.cjs --stdin
```

### 自动修复

```bash
npm run fix:encoding
```

自动修复只允许处理 BOM、CRLF/LF、替换字符等机械问题。真实错码必须按上下文或历史来源人工恢复，不能靠猜测转码。

---

## Windows Terminal 配置

### PowerShell

在 `$PROFILE` 中添加：

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
```

### CMD

在启动脚本或 `package.json` scripts 中使用：

```cmd
chcp 65001 >nul
```

### npm scripts

项目的 `dev` 和 `start` 脚本已内置 `chcp 65001`：

```json
{
  "dev": "chcp 65001 >nul 2>&1 & set NODE_ENV=development&& tsx src/server.ts",
  "start": "chcp 65001 >nul 2>&1 & set NODE_ENV=development&& node dist/server.js"
}
```

---

## VSCode 配置

在 `.vscode/settings.json` 中推荐：

```json
{
  "files.encoding": "utf8",
  "files.eol": "\n",
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true
}
```

---

## Git 配置

仓库根目录配置 `.gitattributes`：

- 文本文件：`text=auto eol=lf working-tree-encoding=UTF-8`
- Windows 脚本：`text eol=crlf`
- 二进制文件：`binary`

防止 Git 自动转换破坏中文文件编码。

仓库根目录配置 `.editorconfig`：

- 默认 `charset = utf-8`
- 默认 `end_of_line = lf`
- 默认 `insert_final_newline = true`
- `.bat`、`.cmd`、`.ps1` 使用 CRLF

---

## Node 文件读写规范

### 必须指定编码

```typescript
// ✅ 正确
const content = await readFile(path, 'utf8');
await writeFile(path, data, 'utf8');

// ❌ 错误
const content = await readFile(path); // 返回 Buffer，后续可能忘记转码
```

### Buffer 转字符串

```typescript
// ✅ 正确
const text = buffer.toString('utf8');

// ❌ 错误
const text = buffer.toString(); // 默认 utf8 但不明确
```

### child_process

```typescript
// ✅ 正确
const { stdout } = await exec('command', { encoding: 'utf8' });

// ✅ 正确
const child = spawn('cmd', [], { stdio: ['pipe', 'pipe', 'pipe'] });
child.stdout.setEncoding('utf8');
```

---

## CSV / Excel 导入规范

### 外部输入编码处理

所有外部输入（CSV、Excel、TXT）只在 **Adapter 层** 处理编码：

```typescript
// ✅ 正确：在 Adapter 层统一转码
function parseCSV(buffer: Buffer): string[] {
  // 尝试检测编码
  const encoding = detectEncoding(buffer); // UTF-8 | GBK | GB18030
  const text = iconv.decode(buffer, encoding);
  return text.split('\n');
}

// ❌ 错误：在业务层处理编码
function processOrder(row: string) {
  const fixed = iconv.decode(Buffer.from(row, 'binary'), 'utf8'); // 不应在业务层
}
```

### 统一转换

进入业务链路前必须统一转换为 **UTF-8**：

```
外部输入 → Adapter 层（检测+转码） → UTF-8 → 业务层 → LLM → UI → Trace
```

---

## API 返回规范

### Content-Type

```typescript
// JSON
return NextResponse.json(data); // 默认 application/json; charset=utf-8

// SSE
return new Response(stream, {
  headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
});

// 文本
return new Response(text, {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});
```

### 禁止

- 重复 encode/decode
- 把乱码字符串再次转码

---

## 常见乱码排查手册

### 症状 1：中文显示为 GBK 错读样式

**原因**：UTF-8 字节被当作 GBK 解读后存回 UTF-8

**修复**：先用根级扫描器定位文件和行号，再根据 Git 历史、相邻规格真源或原始材料恢复中文。不能把已经写坏的字符串再次盲目转码。

### 症状 2：中文显示为 Latin-1/Windows-1252 错读样式

**原因**：UTF-8 字节被当作 Latin-1/Windows-1252 解读

**修复**：重新以 UTF-8 读取原始字节

### 症状 3：文件开头有不可见字符

**原因**：UTF-8 BOM（`EF BB BF`）

**修复**：
```bash
npm run fix:encoding
```

### 症状 4：Git diff 显示整文件变更

**原因**：CRLF/LF 混用

**修复**：
```bash
npm run fix:encoding
```

### 症状 5：PowerShell 输出中文乱码

**原因**：终端编码不是 UTF-8

**修复**：
```powershell
chcp 65001
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

---

## 工具脚本

| 脚本 | 用途 |
|------|------|
| `npm run check:encoding` | 检查已跟踪文件编码问题（CI 用） |
| `npm run check:mojibake` | 兼容入口，同样调用根级扫描器 |
| `npm run fix:encoding` | 自动修复前端范围内 BOM + CRLF + 替换字符 |
| `node ../../scripts/check-text-encoding.cjs --scope=tracked` | 根级提交门禁 |
| `node ../../scripts/check-text-encoding.cjs --scope=workspace --json --no-fail` | 全工作区审计报告 |
| `node ../../scripts/check-text-encoding.cjs --stdin` | 运行态 payload 扫描 |

历史 `fix-all-encoding.js`、`fix-garbled-segments.js` 不属于当前仓库真源脚本。若需要修复真实错码，必须先生成审计报告，再按上下文人工恢复。

---

## CI 集成

在 CI Pipeline 中添加：

```yaml
encoding_guardrail:
  stage: quality
  script:
    - node scripts/check-text-encoding.cjs --scope=tracked
```

确保新增文件不会引入编码问题。

---

## 判断口径

- 终端显示错读不等于文件本体乱码；以字节级 UTF-8 校验和扫描器报告为准。
- 二进制响应、图片、字体、Office 文档不按文本扫描。
- `docs/review`、`tmp`、`.runtime`、`docs/quarantine` 可进入审计报告，但不得作为运行真源。
- 生效规格、源码、配置、fixture、golden schema、Prompt、ResponseContract、Trace 和用户可见文案出现阻断级乱码时，不得上线。

# Agent调用MCP Tools说明

## 一、MCP配置

### 1.1 Claude Code配置

在Claude Code的MCP配置中添加：

**配置文件位置：**
- Windows: `%USERPROFILE%\.claude\settings.json`
- macOS: `~/.claude/settings.json`

**配置示例：**
```json
{
  "mcpServers": {
    "ad-expert-v2": {
      "command": "python",
      "args": ["你的路径/ad_mcp_v2.py"],
      "env": {
        "PYTHONIOENCODING": "utf-8"
      }
    }
  }
}
```

### 1.2 验证配置

配置后重启Claude Code，输入：
```
/mcp
```
应能看到 `ad-expert-v2` 服务及其Tools列表。

---

## 二、Tools调用方式

### 2.1 查询类Tool

**调用格式：**
```
Tool: {tool_name}
参数: {"param1": "value1", "param2": "value2"}
```

**示例：查询点击表**
```
Tool: es_attr_click_query
参数: {"idfa": "C4B493ECF3AA4D46B7419945DCFB2791"}
```

**示例：查询设备表**
```
Tool: es_attr_device_query
参数: {"device_id": "f5a0751b7df24da9"}
```

### 2.2 诊断类Tool

**示例：全链路诊断**
```
Tool: diagnose_full_funnel
参数: {"device_id": "f5a0751b7df24da9", "app_id": "40100001"}
```

---

## 三、常用查询场景

### 3.1 通过case_id查询测试数据

```
# 查询点击数据
Tool: es_attr_click_query
参数: {"case_id": "SUCCESS_001"}

# 查询设备数据
Tool: es_attr_device_query
参数: {"case_id": "SUCCESS_001"}

# 查询激活数据
Tool: es_attr_res_activation_query
参数: {"case_id": "SUCCESS_001"}
```

### 3.2 排查用户归因问题

**步骤1：获取用户设备信息**
```
Tool: es_attr_device_query
参数: {"idfa": "用户提供的IDFA"}
```

**步骤2：查询点击记录**
```
Tool: es_attr_click_query
参数: {"idfa": "用户提供的IDFA"}
```

**步骤3：全链路诊断**
```
Tool: diagnose_full_funnel
参数: {"device_id": "步骤1获取的device_id", "app_id": "对应的app_id"}
```

### 3.3 查询异常用例

```
# 时序倒挂
Tool: diagnose_full_funnel
参数: {"case_id": "ABNORMAL_000"}

# 自然量
Tool: es_attr_res_activation_query
参数: {"case_id": "ABNORMAL_001"}
```

---

## 四、返回结果解读

### 4.1 查询结果

```json
{
  "success": true,
  "db_type": "es",
  "table_name": "attr_click",
  "table_name_cn": "媒体点击表",
  "total": 1,
  "returned": 1,
  "data": [
    {
      "click_uuid": "20260411102700_5508E2F9_1",
      "idfa": "C4B493ECF3AA4D46B7419945DCFB2791",
      "app_id": 40100001,
      "data_time": "2026-04-11 10:27:00"
    }
  ]
}
```

### 4.2 诊断结果

```json
{
  "success": true,
  "diagnosis_code": "FULL_SUCCESS",
  "diagnosis": [
    "✅ 全链路归因成功",
    "  → 点击: 2026-04-11 10:27:00",
    "  → 激活: 2026-04-11 10:32:00",
    "  → 注册: 2026-04-11 10:45:00",
    "  → 付费: 2026-04-11 11:00:00 (金额: 68.0)"
  ],
  "funnel": {
    "click": {"found": true, "time": "2026-04-11 10:27:00"},
    "activation": {"found": true, "time": "2026-04-11 10:32:00"},
    "register": {"found": true, "time": "2026-04-11 10:45:00"},
    "pay": {"found": true, "time": "2026-04-11 11:00:00", "amount": 68.0}
  }
}
```

### 4.3 诊断码含义

| 诊断码 | 含义 | 处理建议 |
|--------|------|---------|
| FULL_SUCCESS | 全链路成功 | 无需处理 |
| NO_DATA | 无任何数据 | 检查设备ID是否正确 |
| CLICK_NO_ACTIVATION | 有点击无激活 | 检查SDK集成 |
| NATURAL | 自然量用户 | 正常情况 |
| ACTIVATION_NO_REGISTER | 有激活无注册 | 检查注册流程 |
| REGISTER_NO_PAY | 有注册无付费 | 用户未付费 |
| TIME_SEQUENCE_ERROR | 时序异常 | 可能存在作弊 |

---

## 五、Prompt模板

### 5.1 归因排查Agent Prompt

```
你是广告归因问题排查专家。用户会提供设备标识（IDFA/OAID/device_id），你需要：

1. 首先查询设备信息，确认设备存在
2. 查询点击记录（注意：点击表无device_id，需用idfa/oaid查询）
3. 使用全链路诊断工具分析归因漏斗
4. 根据诊断结果给出问题原因和解决建议

可用的MCP Tools:
- es_attr_click_query: 点击表查询（参数：idfa/oaid/android_id/case_id）
- es_attr_device_query: 设备表查询（参数：device_id/idfa/case_id）
- es_attr_res_activation_query: 激活结果查询
- diagnose_full_funnel: 全链路诊断（参数：device_id, app_id）

重要提示：点击表没有device_id字段，必须通过idfa或oaid查询！
```

### 5.2 数据验证Agent Prompt

```
你需要验证广告归因Mock数据的完整性。对于给定的case_id：

1. 依次查询各表数据是否存在
2. 检查ID关联是否正确
3. 验证时序是否符合约束（点击<激活<注册<付费）
4. 输出验证报告

使用以下Tools按顺序查询:
1. es_attr_click_query(case_id=xxx) - 获取idfa
2. es_attr_device_query(case_id=xxx) - 获取device_id
3. es_attr_res_activation_query(case_id=xxx)
4. es_attr_res_register_query(case_id=xxx)
5. es_attr_res_pay_query(case_id=xxx)
```

---

## 六、测试用例快速参考

### 正常用例

| case_id | idfa | app_id | 说明 |
|---------|------|--------|------|
| SUCCESS_001 | C4B493ECF3AA4D46B7419945DCFB2791 | 40100001 | iOS完整链路 |
| SUCCESS_005 | - (用oaid) | 10100001 | Android完整链路 |

### 异常用例

| case_id | 异常类型 | 预期诊断码 |
|---------|---------|-----------|
| ABNORMAL_000 | 时序倒挂 | TIME_SEQUENCE_ERROR |
| ABNORMAL_001 | 自然量 | NATURAL |
| ABNORMAL_002 | 无注册 | ACTIVATION_NO_REGISTER |
| ABNORMAL_003 | 无付费 | REGISTER_NO_PAY |

---

**文档版本**: v1.0  
**创建日期**: 2026-05-09

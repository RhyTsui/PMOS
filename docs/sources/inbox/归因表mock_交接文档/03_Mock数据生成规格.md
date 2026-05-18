# Mock数据生成规格

## 一、数据生成要求

### 1.1 数据量
- 总计 **20条** 归因链路
- 15条正常链路：SUCCESS_000 ~ SUCCESS_014
- 5条异常链路：ABNORMAL_000 ~ ABNORMAL_004

### 1.2 核心约束

**时序约束（正常链路必须满足）：**
```
点击时间 < 激活时间 < 注册时间 < 付费时间
```

**ID关联约束：**
```
每条链路使用相同的 case_id 贯穿所有表
点击表.idfa = 设备表.idfa
设备表.device_id = 激活表.device_id = 注册表.device_id = 付费表.device_id
```

---

## 二、正常链路数据规格 (15条)

### 2.1 设备类型分布

| case_id | 设备类型 | 标识符 |
|---------|---------|--------|
| SUCCESS_000 | iOS | idfa |
| SUCCESS_001 | iOS | idfa |
| SUCCESS_002 | iOS | idfa |
| SUCCESS_003 | iOS | idfa |
| SUCCESS_004 | iOS | idfa |
| SUCCESS_005 | Android | oaid + android_id |
| SUCCESS_006 | iOS | idfa |
| SUCCESS_007 | Android | oaid + android_id |
| SUCCESS_008 | 鸿蒙 | idfa |
| SUCCESS_009 | iOS | idfa |
| SUCCESS_010 | iOS | idfa |
| SUCCESS_011 | iOS | idfa |
| SUCCESS_012 | Android | oaid + android_id |
| SUCCESS_013 | Android | oaid + android_id |
| SUCCESS_014 | 鸿蒙 | idfa |

### 2.2 媒体分布

覆盖以下媒体：
- 10001: 巨量引擎
- 10002: 广点通
- 10003: 快手
- 10004: 百度
- 10005: 头条

### 2.3 时间规格

- 日期范围：2026-04-10 ~ 2026-04-24
- 每条链路间隔约1天
- 点击到激活间隔：5~60分钟
- 激活到注册间隔：5~30分钟
- 注册到付费间隔：10~60分钟

### 2.4 金额规格

付费金额范围：6 ~ 648 元

---

## 三、异常链路数据规格 (5条)

### 3.1 ABNORMAL_000 - 时序倒挂

```
场景：激活时间早于点击时间（防作弊检测）
数据：
  - 点击时间: 2026-04-25 10:00:00
  - 激活时间: 2026-04-25 08:00:00  ← 早于点击
期望诊断码：TIME_SEQUENCE_ERROR
```

### 3.2 ABNORMAL_001 - 自然量无点击

```
场景：自然量用户，无广告点击记录
数据：
  - 点击表: 无记录
  - 设备表: 有记录
  - 激活表: attr_source = 'natural'
期望诊断码：NATURAL
```

### 3.3 ABNORMAL_002 - 转化中断

```
场景：有激活但无注册
数据：
  - 点击表: 有记录
  - 激活表: 有记录
  - 注册表: 无记录
期望诊断码：ACTIVATION_NO_REGISTER
```

### 3.4 ABNORMAL_003 - 付费流失

```
场景：有注册但无付费
数据：
  - 点击表: 有记录
  - 激活表: 有记录
  - 注册表: 有记录
  - 付费表: 无记录
期望诊断码：REGISTER_NO_PAY
```

### 3.5 ABNORMAL_004 - 回推失败

```
场景：回调失败，需要重试
数据：
  - 完整链路数据
  - retry表: retry_status = 'WAITING'
期望诊断码：包含回推等待提示
```

---

## 四、各表数据量

| 表名 | 记录数 | 说明 |
|------|--------|------|
| attr_click | 19 | ABNORMAL_001无点击 |
| attr_device | 20 | 全量 |
| attr_user | 19 | ABNORMAL_001无用户 |
| attr_res_activation | 20 | 全量 |
| attr_res_register | 17 | ABNORMAL_001/002无注册 |
| attr_res_pay | 15 | 只有SUCCESS有付费 |
| ods_uba_base_event_rt | 57 | 每链路3条事件 |
| retry | 1 | ABNORMAL_004 |

---

## 五、测试用例索引文件

生成 `test_case_index.csv` 索引文件：

| 字段 | 说明 |
|------|------|
| case_id | 用例ID |
| case_type | 类型 (normal/abnormal) |
| description | 用例描述 |
| idfa | iOS标识符 |
| oaid | Android标识符 |
| android_id | Android设备ID |
| app_id | 应用ID |
| os_type | 操作系统 |
| media_id | 媒体ID |
| channel_id | 渠道ID |
| click_time | 点击时间 |
| activation_time | 激活时间 |
| expected_result | 期望结果 |
| note | 备注 |

---

## 六、ID生成规则

### 6.1 device_id
格式：16位十六进制小写
示例：`f5a0751b7df24da9`

### 6.2 idfa
格式：32位十六进制大写
示例：`C4B493ECF3AA4D46B7419945DCFB2791`

### 6.3 oaid
格式：UUID格式
示例：`d2b7df82-95d1-4a79-a324-1d4bd2446700`

### 6.4 click_uuid
格式：时间戳_随机数_序号
示例：`20260411102700_5508E2F9_1`

### 6.5 user_id
格式：U + 12位数字
示例：`U202604110001`

### 6.6 order_id
格式：ORD + 时间戳 + 序号
示例：`ORD20260411110000_001`

---

## 七、应用ID列表

| app_id | 应用名称 |
|--------|---------|
| 10100001 | 三国杀 |
| 10100002 | 一将成名 |
| 40100001 | 测试应用 |

---

**文档版本**: v1.0  
**创建日期**: 2026-05-09

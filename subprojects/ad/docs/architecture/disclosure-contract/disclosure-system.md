# Disclosure System

Disclosure System 是 Enterprise AI Chat OS 中“过程与依据”层的规范总览。

## 目标

- 让用户知道结果来自哪里
- 让用户知道这次执行过程发生了什么
- 让用户知道字段、证据、来源、质量检查分别是什么
- 让原始信息只在受控区域披露

## 组成

- `Disclosure Contract`
- `Disclosure Projection`
- `Disclosure Projection Builder`
- `Legacy Runtime Adapter`
- `Disclosure Renderer`
- `Disclosure Permission Policy`
- `Disclosure Redaction Policy`

## 不做的事

- 不重新定义业务结果协议
- 不重新定义运行态协议
- 不把原始工具返回直接铺到主页面
- 不在 renderer 里硬编码字段口径


---

## v0.2 总纲一致性补充

Disclosure System 的边界升级为 Disclosure Plane：主消息负责用户可消费结果，右侧披露负责 resolver 决策、工具调用、Evidence Ledger 明细、raw data、quality check 与 trace。右侧披露不得替代主消息答案，主消息不得塞入完整调试过程。

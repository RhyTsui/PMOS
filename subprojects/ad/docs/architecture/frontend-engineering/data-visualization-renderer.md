# Data Visualization Renderer

> Scope: `data-visualization`

## 目标

统一承接表格、图表、指标卡、路径分析等结果视图。

## 当前实现约束

- 表格：优先使用可排序、可筛选、可导出的表格引擎
- 图表：优先使用已部署的图表库
- 大数据：支持虚拟化和降级

## 规则

1. renderer 不私有定义导出、下钻、来源、证据结构。
2. 视图选择由 region.data 和绑定规则决定。
3. 大表格、大图表必须可降级。


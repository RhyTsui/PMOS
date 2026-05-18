# 智投chat v0.2 小版本：项目筛选

日期：2026-05-17

## 这个小版本做什么

只做一件事：把项目筛选先打通。

范围包括：

- 顶部增加项目关键字搜索
- 支持按项目 ID / 名称查找
- 项目列表默认空态
- 项目列表不再回退到假项目

## 这次不做什么

这次不碰：

- 联调步骤展示
- 思维链结构
- 报表编排
- agent / skill 编排
- 监控 / 定时任务入口
- 包列表 / 包状态页面

## 已改动文件

- `imported/projects/src/app/page.tsx`
- `imported/projects/src/app/api/xiaoqiao/projects/route.ts`
- `imported/projects/src/lib/report-template-store.ts`

## 改动内容

### 1. 项目筛选入口

- 顶部增加了一个项目搜索框。
- 支持输入项目 ID 或名称进行查找。
- 默认不预选项目，保持空态。
- 项目列表只展示符合条件的项目。

### 2. 项目列表数据

- 项目接口不再回退到假项目。
- 过滤掉非游戏项目和烽火工作室相关项目。
- 当没有符合条件的项目时，返回空列表。

### 3. 报表模板兜底

- 报表模板文件为空时，不再自动生成样例模板。
- 只返回空列表，避免样例数据混入真实流程。

## 回退方式

如果这次小版本要回退，只需要恢复这三个文件：

```bash
git restore imported/projects/src/app/page.tsx
git restore imported/projects/src/app/api/xiaoqiao/projects/route.ts
git restore imported/projects/src/lib/report-template-store.ts
```

## 风险说明

- 这是低风险版本，只改项目筛选和数据兜底。
- 没有碰联调和报表的主流程。
- 如果后续要继续做入口层或编排层，建议另开一个小版本，不要和这次混在一起。

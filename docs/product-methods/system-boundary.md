# System Boundary 方法卡

- method id: `system-boundary`
- category: `solution-architecture`
- priority: `P1`
- status: integrated
- linked skill: `system-boundary`

## 1. 解决什么问题

当产品方向已经有了，但团队还分不清什么该做、什么不该做、哪些要集成、哪些不归自己时，`System Boundary` 用来冻结边界。

## 2. 适用场景

- 方案涉及多系统
- 责任归属不清
- 容易无限扩 scope
- 需要在设计或研发前先定清非目标

## 3. 不适用场景

- 仍处在产品是什么的定义阶段
- 只是局部交互细化

## 4. 输入

- 产品定义
- 需求范围
- 系统关系
- 集成对象

## 5. 输出

- ownership boundary
- integration seam
- non-goals
- capability scope

## 6. 产物挂点

- 架构边界说明
- 方案评审结论
- 研发接手说明

## 7. 推荐后续方法

- `schema-driven-ui-design`
- `rice`

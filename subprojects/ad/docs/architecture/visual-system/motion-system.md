# Motion System

## 1. 职责

Motion System 统一 AI Chat OS 中所有动效：消息进入、流式输出、工具调用、Timeline、Toast、Skeleton、图表渐进展示。

## 2. Token 分类

```txt
motion.duration.instant
motion.duration.fast
motion.duration.normal
motion.duration.slow
motion.easing.standard
motion.easing.enter
motion.easing.exit
motion.easing.emphasized
motion.pattern.fade
motion.pattern.slide
motion.pattern.expand
motion.pattern.stream
motion.pattern.skeleton
```

## 3. 使用规则

```txt
1. Streaming token append 不做大面积 layout shift。
2. 长消息折叠/展开必须保持滚动锚点。
3. Runtime Timeline 状态变化使用轻量动效，不阻塞主线程。
4. 大图表加载使用 skeleton + lazy render，不做昂贵动画。
5. reduced-motion 开启时必须禁用非必要动效。
```

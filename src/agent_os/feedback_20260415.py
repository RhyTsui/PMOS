"""
PMAIOS v0.3.5 用户反馈记录

这是第 11 点用户反馈的原始记录，已同步写入需求池 Excel。
反馈时间：2026-04-15
"""

FEEDBACK_11_POINTS = """
1. 多任务并行，效率目前很慢，即使只指挥一个。
2. 原来的 workspace 会话空间的 webui 很难用，是否有相关插件，或者 hermes agent v0.9 带有对话界面直接部署？我需要可视化很多东西。比如产品 agent 可视化运行，比如大模型实际调用。比如语音交互。
3. 实际产品 agent 的执行过程中并没有按 agent 的 workflow 运行，还是按我的指令在运行。
4. 产品 agent 并没有各个项目统一输出模板。
5. 各个新建项目生成的文件目录和规格文档不一致，也导致经常找不到路径需要我告知。我希望所有的文件夹都是你生成的。
6. 目前有很多是中文的文件夹或者名称，帮我统一改成英文，自主翻译可以是英文简称。这也经常导致命令行语法不能理解异构格式的文字，比如特殊符号什么的，很多任务都卡在 utf-8 不统一上，请自动统一。本质还是减少各种低效卡壳。
7. 部署了 v0.3.3 的目的是支持自主长任务模式，但是每个项目都还需要人工反复确认，授权类的确认能否直接默认同意，只要是 E 盘的，只要是 ai 文件夹下的，都默认最大权限。
8. 经常卡住反复需要问现在的进展，能否主动 push 任务进展，颗粒度更细，并且每生成一个产品文档，更新一个文档，都打印出来地址。然后前面说的可视化页面有一个更新记录日志流。
9. 不知道现在有没有 plan 这个任务？应该每个项目都有一个 plan，通过 plan 来对齐任务，待办，已办，在办。我更新指令你就更新 plan。我之前叫 task，可以看看现在部署的机制里有没有这个 plan，或者是不是这么用的，要用起来。
10. 之前 v0.3 有很多任务事项，都还只完成很少的部分的 mvp 部分，很多都没做，我不停的告知你去看去加任务，如何按规划版本自主去更新计划，确认执行计划，永动机，而不是推一步走一步。
11. 我昨天加了需求池，今天早上才完成，一个需求池，完成了也没有告知我展示给我路径。其次过程分析都没有。再就是需求池里的项目划分我需要确认的，比如 pmaios 作为主操作系统也是一个产品，各个子项目里创建的项目都是一个产品。
"""

# 11 点反馈整理为需求格式
FEEDBACK_REQUIREMENTS = [
    {
        "id": "FB-001",
        "title": "多任务并行效率优化",
        "description": "当前多任务并行执行效率很低，即使只指挥一个任务也很慢。需要优化并行执行机制，提升 Worker 池的并发处理能力。",
        "product_line": "PMAIOS-Core",
        "priority": "P0",
        "source": "user_feedback_20260415",
    },
    {
        "id": "FB-002",
        "title": "可视化界面升级需求",
        "description": "当前 workspace WebUI 难用，需要更好的可视化界面：产品 agent 可视化运行、大模型调用可视化、语音交互界面。考虑 Hermes Agent v0.9 对话界面或新插件。",
        "product_line": "PMAIOS-Frontend",
        "priority": "P0",
        "source": "user_feedback_20260415",
    },
    {
        "id": "FB-003",
        "title": "Agent Workflow 执行修复",
        "description": "产品 agent 执行时没有按 agent 的 workflow 运行，而是按用户指令运行。需要修复确保 agent 严格按照预定义 workflow 执行。",
        "product_line": "PMAIOS-Core",
        "priority": "P0",
        "source": "user_feedback_20260415",
    },
    {
        "id": "FB-004",
        "title": "统一输出模板",
        "description": "产品 agent 没有各个项目统一输出模板。需要为各产品线定义标准化输出模板，确保产物格式一致。",
        "product_line": "PMAIOS-Core",
        "priority": "P1",
        "source": "user_feedback_20260415",
    },
    {
        "id": "FB-005",
        "title": "统一文件目录结构",
        "description": "各新建项目生成的文件目录和规格文档不一致，导致找不到路径。需要统一文件夹生成规则，所有文件夹由系统自动生成。",
        "product_line": "PMAIOS-Core",
        "priority": "P1",
        "source": "user_feedback_20260415",
    },
    {
        "id": "FB-006",
        "title": "中文路径统一转英文",
        "description": "中文文件夹/名称导致 UTF-8 编码问题和命令行卡壳。需要统一改为英文（或英文简称），自主翻译，减少低效卡壳。",
        "product_line": "PMAIOS-Core",
        "priority": "P1",
        "source": "user_feedback_20260415",
    },
    {
        "id": "FB-007",
        "title": "自主长任务默认授权",
        "description": "v0.3.3 支持自主长任务但需要反复人工确认。需要默认授权机制：E 盘、ai 文件夹下默认最大权限，减少确认中断。",
        "product_line": "PMAIOS-Core",
        "priority": "P0",
        "source": "user_feedback_20260415",
    },
    {
        "id": "FB-008",
        "title": "主动推送任务进展",
        "description": "需要主动 push 任务进展，颗粒度更细。每生成/更新一个文档都打印路径。可视化页面增加更新记录日志流。",
        "product_line": "PMAIOS-Frontend",
        "priority": "P1",
        "source": "user_feedback_20260415",
    },
    {
        "id": "FB-009",
        "title": "Plan 任务管理机制",
        "description": "需要 Plan 机制来对齐任务（待办/在办/已办）。每个项目一个 plan，用户更新指令就更新 plan。需要确认当前机制是否有 plan 并正确使用。",
        "product_line": "PMAIOS-Core",
        "priority": "P1",
        "source": "user_feedback_20260415",
    },
    {
        "id": "FB-010",
        "title": "自主版本规划执行",
        "description": "v0.3 很多任务只完成 MVP 部分，需要按规划版本自主更新计划和执行计划，实现永动机模式，而不是推一步走一步。",
        "product_line": "PMAIOS-Core",
        "priority": "P0",
        "source": "user_feedback_20260415",
    },
    {
        "id": "FB-011",
        "title": "需求池完成通知和过程分析",
        "description": "需求池完成后没有告知路径，缺少过程分析。需求池项目划分需要确认：PMAIOS 作为主操作系统是一个产品，各子项目创建的项目都是独立产品。",
        "product_line": "PMAIOS-RequirementPool",
        "priority": "P1",
        "source": "user_feedback_20260415",
    },
]

if __name__ == "__main__":
    import json
    print(json.dumps(FEEDBACK_REQUIREMENTS, indent=2, ensure_ascii=False))

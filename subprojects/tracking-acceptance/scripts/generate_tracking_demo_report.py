from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import duckdb


DB_PATH = Path(r"E:\AI\ai-os\subprojects\tracking-acceptance\docs\sources\index\inbox.duckdb")
OUT_DIR = Path(r"E:\AI\ai-os\subprojects\tracking-acceptance\docs\demo")


@dataclass(frozen=True)
class ChainConfig:
    title: str
    summary: str
    keywords: tuple[str, ...]
    risk_keywords: tuple[str, ...]
    impact: str


CHAINS = [
    ChainConfig(
        title="新手引导漏斗链",
        summary="关注客户端 SDK 引导步骤定义、后端自定义事件映射、步骤口径一致性。",
        keywords=("新手引导", "TutorialStep", "Tutorial", "stepId", "step_name"),
        risk_keywords=("推荐", "确认", "必须", "递增"),
        impact="步骤缺失、顺序不稳定或名称不一致，会直接导致新手引导漏斗失真，后续 BI 转化分析不可比。",
    ),
    ChainConfig(
        title="支付与订单关联链",
        summary="关注订单号、渠道订单号、支付渠道、发货通知等支付链核心字段。",
        keywords=("PayFlow", "order_id", "channel_order_id", "pay_channel", "recharge_channel", "发货通知"),
        risk_keywords=("未获取", "不发送", "失败", "缺失"),
        impact="订单关联点缺失会影响支付归因、订单串联和付费分析，严重时会让支付链无法回查。",
    ),
    ChainConfig(
        title="渠道分包与设备透传链",
        summary="关注客户端到服务端透传的渠道分包与设备标识闭环。",
        keywords=("cpsid", "device_id", "c_oneid", "s_oneid", "getTrackingInfo", "渠道分包ID"),
        risk_keywords=("保持一致", "回调", "透传", "未获取"),
        impact="渠道分包和设备标识不一致，会影响分包效果分析、归因回查和服务端关键行为串联。",
    ),
]


def query_rows(conn: duckdb.DuckDBPyConnection, keyword: str, limit: int = 8) -> list[tuple[str, str, int, str]]:
    return conn.execute(
        """
        select d.file_name, r.sheet_name, r.row_number, left(r.row_text, 220)
        from row_chunks r
        join documents d on d.doc_id = r.doc_id
        where r.row_text like ?
        order by d.file_name, r.sheet_name, r.row_number
        limit ?
        """,
        [f"%{keyword}%", limit],
    ).fetchall()


def count_rows(conn: duckdb.DuckDBPyConnection, keyword: str) -> int:
    return conn.execute(
        """
        select count(*)
        from row_chunks
        where row_text like ?
        """,
        [f"%{keyword}%"],
    ).fetchone()[0]


def generate_chain_section(conn: duckdb.DuckDBPyConnection, config: ChainConfig) -> str:
    lines: list[str] = [f"## {config.title}", "", config.summary, ""]

    lines.append("命中情况：")
    for keyword in config.keywords:
        lines.append(f"- `{keyword}`: {count_rows(conn, keyword)} 条")
    lines.append("")

    evidence: list[tuple[str, str, int, str, str]] = []
    for keyword in config.keywords[:3]:
        for file_name, sheet_name, row_number, row_text in query_rows(conn, keyword, limit=4):
            evidence.append((keyword, file_name, sheet_name, row_number, row_text))

    deduped: list[tuple[str, str, str, int, str]] = []
    seen: set[tuple[str, str, int, str]] = set()
    for item in evidence:
        key = item[1:]
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)

    lines.append("关键证据：")
    for keyword, file_name, sheet_name, row_number, row_text in deduped[:8]:
        lines.append(f"- `{keyword}` -> `{file_name}` / `{sheet_name}` / 第 {row_number} 行：{row_text}")
    lines.append("")

    risk_hits: list[str] = []
    for keyword in config.risk_keywords:
        hits = count_rows(conn, keyword)
        if hits:
            risk_hits.append(f"`{keyword}` {hits} 条")
    lines.append("风险信号：")
    if risk_hits:
        for item in risk_hits:
            lines.append(f"- {item}")
    else:
        lines.append("- 当前未命中预设风险词")
    lines.append("")

    lines.append("业务影响：")
    lines.append(f"- {config.impact}")
    lines.append("")
    return "\n".join(lines)


def generate_global_section(conn: duckdb.DuckDBPyConnection) -> str:
    documents = conn.execute("select count(*) from documents").fetchone()[0]
    sheets = conn.execute("select count(*) from sheets").fetchone()[0]
    rows = conn.execute("select count(*) from row_chunks").fetchone()[0]
    cells = conn.execute("select count(*) from cell_chunks").fetchone()[0]
    elements = conn.execute("select count(*) from elements").fetchone()[0]

    top_risks = [
        ("未获取", count_rows(conn, "未获取")),
        ("不发送", count_rows(conn, "不发送")),
        ("推荐", count_rows(conn, "推荐")),
        ("对应原", count_rows(conn, "对应原")),
        ("变更日志", count_rows(conn, "变更日志")),
    ]

    lines = [
        "# AI 埋点文档 Demo 报告",
        "",
        f"生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        "## 数据范围",
        "",
        f"- 文档数：{documents}",
        f"- Sheet 数：{sheets}",
        f"- 行级记录：{rows}",
        f"- 非空单元格：{cells}",
        f"- 结构化元素：{elements}",
        "",
        "## 总结论",
        "",
        "- 当前这批文档已经足够支撑一个真实可跑的 AI 埋点协作 demo。",
        "- 文档不是静态最终稿，而是跨产品、研发、SDK、数分协作过程的中间产物。",
        "- 最突出的风险不是“有没有埋点”，而是未获取、不发送、推荐项、事件迁移、端到端透传不稳定。",
        "- 最适合先跑闭环的就是新手引导、支付订单、渠道分包与设备透传三条链。",
        "",
        "## 全局风险词命中",
        "",
    ]
    for keyword, hits in top_risks:
        lines.append(f"- `{keyword}`: {hits} 条")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    conn = duckdb.connect(str(DB_PATH), read_only=True)

    parts = [generate_global_section(conn)]
    for chain in CHAINS:
        parts.append(generate_chain_section(conn, chain))

    parts.append(
        "\n".join(
            [
                "## Demo 结论",
                "",
                "- 这套 demo 已经证明可以不靠手工逐份阅读，直接从多份 Excel 文档里抽出业务链、灰区和版本迁移信号。",
                "- 下一步不该再停在文档检索，而是把这三条链继续压成统一规格对象、自动规则和业务影响报告。",
                "",
            ]
        )
    )

    out_path = OUT_DIR / "埋点文档AI-demo报告-2026-04-22.md"
    out_path.write_text("\n\n".join(parts) + "\n", encoding="utf-8")
    print(out_path)


if __name__ == "__main__":
    main()

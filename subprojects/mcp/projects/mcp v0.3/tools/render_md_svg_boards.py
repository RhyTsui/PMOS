from __future__ import annotations

import html
import math
import re
import textwrap
from datetime import datetime
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(r"E:\AI\ai-os\subprojects\mcp\projects\mcp v0.3")
DOCS_DIR = ROOT / "docs"
OUTPUT_DIR = DOCS_DIR / "svg-boards"

WIDTH = 1440
LEFT = 72
TOP = 56
GAP = 24
CARD_WIDTH = 400
CARD_PADDING = 24
CARD_RADIUS = 24
COLS = 3

EXCLUDE = {"README.md"}


@dataclass
class Section:
    title: str
    level: int
    lines: list[str]


def esc(value: str) -> str:
    return html.escape(value, quote=True)


def slugify(name: str) -> str:
    name = Path(name).stem
    name = re.sub(r"[^\w\u4e00-\u9fff-]+", "-", name)
    name = re.sub(r"-{2,}", "-", name).strip("-")
    return name or "doc"


def clean_line(line: str) -> str:
    text = line.strip()
    if text.startswith("|") and text.endswith("|"):
        cells = [cell.strip() for cell in text.strip("|").split("|")]
        cells = [cell for cell in cells if cell and set(cell) != {"-"}]
        text = " · ".join(cells[:4])
    text = re.sub(r"^\s*[-*+]\s+", "", text)
    text = re.sub(r"^\s*\d+\.\s+", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def summarize_lines(lines: list[str], limit: int = 5) -> list[str]:
    out: list[str] = []
    for raw in lines:
        text = clean_line(raw)
        if not text:
            continue
        if text in {"---", "***"}:
            continue
        if set(text) <= {"-", "|", " "}:
            continue
        if text.startswith("#"):
            continue
        out.append(text)
        if len(out) >= limit:
            break
    return out


def parse_markdown(path: Path) -> tuple[str, list[str], list[Section]]:
    lines = path.read_text(encoding="utf-8").splitlines()
    title = path.stem
    intro: list[str] = []
    sections: list[Section] = []
    current: Section | None = None

    for line in lines:
        heading = re.match(r"^(#{1,3})\s+(.*)$", line.strip())
        if heading:
            level = len(heading.group(1))
            text = heading.group(2).strip()
            if level == 1 and title == path.stem:
                title = text
                continue
            if current:
                sections.append(current)
            current = Section(text, level, [])
            continue

        if current is None:
            if line.strip():
                intro.append(line)
        else:
            current.lines.append(line)

    if current:
        sections.append(current)

    return title, summarize_lines(intro, 4), sections


def wrap_lines(text: str, width: int) -> list[str]:
    return textwrap.wrap(text, width=width, break_long_words=False, break_on_hyphens=False) or [text]


def card_height(lines: list[str]) -> int:
    wrapped = 0
    for line in lines:
        wrapped += len(wrap_lines(line, 28))
    return 88 + wrapped * 22


def render_text_block(x: int, y: int, text: str, css: str, wrap: int) -> tuple[list[str], int]:
    svg: list[str] = []
    current_y = y
    for row in wrap_lines(text, wrap):
        svg.append(f'<text x="{x}" y="{current_y}" class="{css}">{esc(row)}</text>')
        current_y += 22
    return svg, current_y


def build_doc_svg(md_path: Path, svg_path: Path) -> dict[str, str | int]:
    title, intro, sections = parse_markdown(md_path)
    summaries: list[tuple[str, list[str]]] = []
    for section in sections:
        lines = summarize_lines(section.lines, 5)
        if lines:
            summaries.append((section.title, lines))

    if not summaries:
        summaries.append(("内容摘要", intro or ["该文档以补充说明为主，建议结合原 Markdown 查看细节。"]))

    cards = []
    for name, lines in summaries[:12]:
        cards.append((name, lines, card_height(lines)))

    row_heights: list[int] = []
    for idx in range(0, len(cards), COLS):
        row_heights.append(max(card[2] for card in cards[idx : idx + COLS]))

    content_height = sum(row_heights) + GAP * max(0, len(row_heights) - 1)
    height = max(980, TOP + 220 + content_height + 120)

    updated_at = datetime.fromtimestamp(md_path.stat().st_mtime).strftime("%Y-%m-%d %H:%M")

    svg: list[str] = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{height}" viewBox="0 0 {WIDTH} {height}" fill="none">',
        "  <defs>",
        '    <linearGradient id="bg" x1="80" y1="32" x2="1360" y2="940" gradientUnits="userSpaceOnUse">',
        '      <stop stop-color="#F8FBFF"/>',
        '      <stop offset="1" stop-color="#EEF4FF"/>',
        "    </linearGradient>",
        '    <linearGradient id="hero" x1="72" y1="120" x2="1368" y2="220" gradientUnits="userSpaceOnUse">',
        '      <stop stop-color="#165DFF"/>',
        '      <stop offset="1" stop-color="#36CFC9"/>',
        "    </linearGradient>",
        '    <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%">',
        '      <feDropShadow dx="0" dy="10" stdDeviation="18" flood-color="#B7C7E6" flood-opacity="0.28"/>',
        "    </filter>",
        "    <style>",
        '      text { font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }',
        "      .title { font-size: 34px; font-weight: 700; fill: #1F2A44; }",
        "      .subtitle { font-size: 16px; font-weight: 500; fill: #5F6F8F; }",
        "      .hero-title { font-size: 24px; font-weight: 700; fill: #FFFFFF; }",
        "      .hero-body { font-size: 14px; font-weight: 500; fill: #DDF3FF; }",
        "      .card-title { font-size: 18px; font-weight: 700; fill: #1F2A44; }",
        "      .body { font-size: 13px; font-weight: 500; fill: #566780; }",
        "      .meta { font-size: 12px; font-weight: 600; fill: #6B7B95; }",
        "      .chip { font-size: 12px; font-weight: 700; fill: #165DFF; }",
        "      .link { font-size: 12px; font-weight: 700; fill: #165DFF; text-decoration: underline; }",
        "    </style>",
        "  </defs>",
        f'  <rect width="{WIDTH}" height="{height}" fill="url(#bg)"/>',
        f'  <text x="{LEFT}" y="{TOP}" class="title">{esc(title)}</text>',
        f'  <text x="{LEFT}" y="{TOP + 30}" class="subtitle">Markdown 文档板：按章节提炼核心内容，供快速评审和沟通</text>',
        f'  <rect x="{LEFT}" y="{TOP + 62}" width="{WIDTH - LEFT * 2}" height="118" rx="28" fill="url(#hero)" filter="url(#shadow)"/>',
        f'  <text x="{LEFT + 28}" y="{TOP + 102}" class="hero-title">{esc(md_path.name)}</text>',
        f'  <text x="{LEFT + 28}" y="{TOP + 132}" class="hero-body">源文件：docs/{esc(md_path.name)}</text>',
        f'  <text x="{LEFT + 28}" y="{TOP + 156}" class="hero-body">更新时间：{esc(updated_at)}</text>',
    ]

    intro_lines = intro or ["该文档主体以结构化章节为主，以下卡片展示各章节的提炼内容。"]
    intro_text = " / ".join(intro_lines[:3])
    intro_wrapped, _ = render_text_block(LEFT + 28, TOP + 182, intro_text, "hero-body", 72)
    svg.extend(["  " + line for line in intro_wrapped])

    x_positions = [LEFT + idx * (CARD_WIDTH + GAP) for idx in range(COLS)]
    y = TOP + 220
    card_idx = 0
    for row_height in row_heights:
        for col in range(COLS):
            if card_idx >= len(cards):
                break
            name, lines, _ = cards[card_idx]
            x = x_positions[col]
            svg.append(f'  <rect x="{x}" y="{y}" width="{CARD_WIDTH}" height="{row_height}" rx="{CARD_RADIUS}" fill="#FFFFFF" stroke="#D7E3F7" filter="url(#shadow)"/>')
            svg.append(f'  <text x="{x + CARD_PADDING}" y="{y + 34}" class="card-title">{esc(name)}</text>')
            ly = y + 64
            for line in lines:
                wrapped = wrap_lines(line, 28)
                bullet = True
                for row in wrapped:
                    prefix = "• " if bullet else "  "
                    svg.append(f'  <text x="{x + CARD_PADDING}" y="{ly}" class="body">{esc(prefix + row)}</text>')
                    ly += 22
                    bullet = False
            card_idx += 1
        y += row_height + GAP

    svg.extend(
        [
            f'  <a href="../{esc(md_path.name)}">',
            f'    <text x="{LEFT}" y="{height - 34}" class="link">打开原 Markdown</text>',
            "  </a>",
            "</svg>",
        ]
    )
    svg_path.write_text("\n".join(svg), encoding="utf-8")
    return {
        "title": title,
        "svg_name": svg_path.name,
        "md_name": md_path.name,
        "sections": len(cards),
    }


def build_index_svg(items: list[dict[str, str | int]]) -> None:
    height = max(980, 240 + len(items) * 108)
    svg: list[str] = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{height}" viewBox="0 0 {WIDTH} {height}" fill="none">',
        "  <defs>",
        '    <linearGradient id="bg" x1="80" y1="32" x2="1360" y2="940" gradientUnits="userSpaceOnUse">',
        '      <stop stop-color="#FFFDF8"/>',
        '      <stop offset="1" stop-color="#F4F8FF"/>',
        "    </linearGradient>",
        '    <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%">',
        '      <feDropShadow dx="0" dy="10" stdDeviation="18" flood-color="#C9D4EA" flood-opacity="0.26"/>',
        "    </filter>",
        "    <style>",
        '      text { font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }',
        "      .title { font-size: 36px; font-weight: 700; fill: #1F2A44; }",
        "      .subtitle { font-size: 16px; font-weight: 500; fill: #5F6F8F; }",
        "      .card-title { font-size: 18px; font-weight: 700; fill: #1F2A44; }",
        "      .body { font-size: 13px; font-weight: 500; fill: #566780; }",
        "      .meta { font-size: 12px; font-weight: 700; fill: #165DFF; }",
        "    </style>",
        "  </defs>",
        f'  <rect width="{WIDTH}" height="{height}" fill="url(#bg)"/>',
        f'  <text x="{LEFT}" y="{TOP}" class="title">广告聚合 MCP 文档 SVG 目录</text>',
        f'  <text x="{LEFT}" y="{TOP + 30}" class="subtitle">以后优先看这套 SVG 板；Markdown 只作为原始详细稿保留</text>',
    ]

    y = TOP + 74
    for idx, item in enumerate(items, 1):
        svg.append(f'  <a href="./{esc(str(item["svg_name"]))}">')
        svg.append(f'    <rect x="{LEFT}" y="{y}" width="{WIDTH - LEFT * 2}" height="84" rx="24" fill="#FFFFFF" stroke="#DDE7F8" filter="url(#shadow)"/>')
        svg.append(f'    <text x="{LEFT + 28}" y="{y + 32}" class="meta">0{idx}</text>')
        svg.append(f'    <text x="{LEFT + 90}" y="{y + 32}" class="card-title">{esc(str(item["title"]))}</text>')
        svg.append(f'    <text x="{LEFT + 90}" y="{y + 56}" class="body">源文件：{esc(str(item["md_name"]))}</text>')
        svg.append(f'    <text x="{WIDTH - 280}" y="{y + 32}" class="meta">章节卡片 {item["sections"]}</text>')
        svg.append(f'    <text x="{WIDTH - 280}" y="{y + 56}" class="body">点击进入对应 SVG 文档板</text>')
        svg.append("  </a>")
        y += 108

    svg.append("</svg>")
    (OUTPUT_DIR / "index.svg").write_text("\n".join(svg), encoding="utf-8")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    items = []
    md_files = sorted(
        [p for p in DOCS_DIR.glob("*.md") if p.name not in EXCLUDE],
        key=lambda p: p.name,
    )
    for md_path in md_files:
        svg_name = f"{slugify(md_path.name)}.svg"
        item = build_doc_svg(md_path, OUTPUT_DIR / svg_name)
        items.append(item)
    build_index_svg(items)


if __name__ == "__main__":
    main()

from __future__ import annotations

import argparse
import json
from pathlib import Path

import duckdb


DB_PATH = Path(r"E:\AI\ai-os\subprojects\tracking-acceptance\docs\sources\index\inbox.duckdb")


def main() -> None:
    parser = argparse.ArgumentParser(description="Search inbox document index")
    parser.add_argument("keyword", help="Keyword to search in row_text")
    parser.add_argument("--limit", type=int, default=20, help="Max rows to return")
    args = parser.parse_args()

    conn = duckdb.connect(str(DB_PATH), read_only=True)
    rows = conn.execute(
        """
        select
          d.file_name,
          r.sheet_name,
          r.row_number,
          r.row_text
        from row_chunks r
        join documents d on d.doc_id = r.doc_id
        where r.row_text like ?
        order by d.file_name, r.sheet_name, r.row_number
        limit ?
        """,
        [f"%{args.keyword}%", args.limit],
    ).fetchall()

    print(
        json.dumps(
            [
                {
                    "file_name": row[0],
                    "sheet_name": row[1],
                    "row_number": row[2],
                    "row_text": row[3],
                }
                for row in rows
            ],
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()

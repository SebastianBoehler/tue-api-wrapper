from __future__ import annotations

import argparse
import sys

from .client import AlmaClient
from .config import AlmaError
from .credentials import read_uni_credentials


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Request-based Alma readers for enrollments, exams, course catalog, and module descriptions."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("enrollments", help="Print the current enrollment overview.")

    exams = subparsers.add_parser("exams", help="Print the current exam overview tree.")
    exams.add_argument("--limit", type=int, default=50, help="Maximum number of exam rows to print.")

    catalog = subparsers.add_parser("catalog", help="Print the visible course catalog nodes.")
    catalog.add_argument("--limit", type=int, default=25, help="Maximum number of catalog rows to print.")

    module_search = subparsers.add_parser("module-search", help="Search in module descriptions.")
    module_search.add_argument("--query", required=True, help="Module search query.")
    module_search.add_argument("--limit", type=int, default=25, help="Maximum number of module search hits to print.")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    username, password = read_uni_credentials()
    if not username or not password:
        parser.error(
            "Set UNI_USERNAME and UNI_PASSWORD in the environment first. "
            "Legacy ALMA_* and ILIAS_* env vars are still supported as fallbacks."
        )

    client = AlmaClient()
    try:
        client.login(username=username, password=password)
        if args.command == "enrollments":
            page = client.fetch_enrollment_page()
            print(f"Selected term: {page.selected_term or '-'}")
            if page.message:
                print(f"Message: {page.message}")
            print("Terms:")
            for label, value in page.available_terms.items():
                print(f"- {label} | {value}")
            return 0

        if args.command == "exams":
            rows = client.fetch_exam_overview()
            for row in rows[: args.limit]:
                print(
                    f"- L{row.level} | {row.kind or '-'} | {row.title} | "
                    f"{row.number or '-'} | {row.status or '-'} | {row.grade or '-'}"
                )
            return 0

        if args.command == "catalog":
            rows = client.fetch_course_catalog()
            for row in rows[: args.limit]:
                description = f" | {row.description}" if row.description else ""
                print(
                    f"- L{row.level} | {row.kind or '-'} | {row.title}{description} | "
                    f"{row.permalink or '-'}"
                )
            return 0

        if args.command == "module-search":
            page = client.search_module_descriptions(args.query)
            for result in page.results[: args.limit]:
                print(
                    f"- {result.number or '-'} | {result.title} | {result.element_type or '-'} | "
                    f"{result.detail_url or '-'}"
                )
            if not page.results:
                print("No module-description results.")
            return 0
    except AlmaError as exc:
        print(f"alma error: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import argparse
import os
import sys

from .config import AlmaError
from .ilias_client import IliasClient


def _read_credential(*names: str) -> str | None:
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return None


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Request-based Ovidius ILIAS client that prints first-level contents for a repository object."
    )
    parser.add_argument(
        "--target",
        default="grp/5289871",
        help="ILIAS goto target such as 'grp/5289871', 'crs/5289869', or a full URL.",
    )
    parser.add_argument("--limit", type=int, default=50, help="Maximum number of items to print in total.")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    username = _read_credential("ILIAS_USERNAME", "UNI_USERNAME", "ALMA_USERNAME")
    password = _read_credential("ILIAS_PASSWORD", "UNI_PASSWORD", "ALMA_PASSWORD")
    if not username or not password:
        parser.error("Set ILIAS_USERNAME/ILIAS_PASSWORD, UNI_USERNAME/UNI_PASSWORD, or ALMA_USERNAME/ALMA_PASSWORD.")

    client = IliasClient()
    try:
        client.login(username=username, password=password)
        page = client.fetch_content_page(args.target)
    except AlmaError as exc:
        print(f"ilias error: {exc}", file=sys.stderr)
        return 1

    print(page.title)
    printed = 0
    for section in page.sections:
        print(f"{section.label}:")
        for item in section.items:
            if printed >= args.limit:
                return 0
            kind = item.kind or "Objekt"
            if item.properties:
                print(f"- {kind} | {item.label} | {' ; '.join(item.properties)} | {item.url}")
            else:
                print(f"- {kind} | {item.label} | {item.url}")
            printed += 1
    if printed == 0:
        print("No first-level content items were found on this page.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

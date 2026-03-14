from __future__ import annotations

import argparse
import sys

from .config import AlmaError
from .credentials import read_uni_credentials
from .ilias_client import IliasClient


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

    username, password = read_uni_credentials()
    if not username or not password:
        parser.error(
            "Set UNI_USERNAME and UNI_PASSWORD in the environment first. "
            "Legacy ALMA_* and ILIAS_* env vars are still supported as fallbacks."
        )

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

from __future__ import annotations

import argparse
import sys

from .config import AlmaError
from .credentials import read_uni_credentials
from .ilias_client import IliasClient


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Request-based Ovidius ILIAS client that logs in via Shibboleth and prints root links."
    )
    parser.add_argument("--limit", type=int, default=8, help="Maximum number of root categories to print.")
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
        root_page = client.login(username=username, password=password)
    except AlmaError as exc:
        print(f"ilias error: {exc}", file=sys.stderr)
        return 1

    print(root_page.title)
    print("Mainbar:")
    for link in root_page.mainbar_links:
        print(f"- {link.label} | {link.url}")
    print("Top categories:")
    for link in root_page.top_categories[: args.limit]:
        print(f"- {link.label} | {link.url}")
    return 0

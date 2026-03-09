from __future__ import annotations

import argparse
import os
from pathlib import Path
import sys

from .client import AlmaClient
from .config import AlmaError


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Request-based Alma study service client for report listing and PDF download."
    )
    parser.add_argument(
        "--list-reports",
        action="store_true",
        help="List the server-rendered study service report jobs and exit.",
    )
    parser.add_argument(
        "--doc-id",
        help="Download a document directly from Alma's docdownload endpoint by id.",
    )
    parser.add_argument(
        "--current-link",
        action="store_true",
        help="Download the document currently exposed on the study service page, if present.",
    )
    parser.add_argument(
        "--save-to",
        type=Path,
        help="Path where the downloaded PDF should be written.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    username = os.getenv("ALMA_USERNAME")
    password = os.getenv("ALMA_PASSWORD")
    if not username or not password:
        parser.error("Set ALMA_USERNAME and ALMA_PASSWORD in the environment first.")

    if not args.list_reports and not args.doc_id and not args.current_link:
        parser.error("Choose at least one action: --list-reports, --doc-id, or --current-link.")

    client = AlmaClient()
    try:
        client.login(username=username, password=password)
        if args.list_reports:
            reports = client.list_studyservice_reports()
            if not reports:
                print("No study-service report buttons were found on the current Alma page.")
            for report in reports:
                print(f"{report.label}\t{report.trigger_name}")

        if args.doc_id or args.current_link:
            document = (
                client.download_document_by_id(args.doc_id)
                if args.doc_id
                else client.download_current_studyservice_document()
            )
    except AlmaError as exc:
        print(f"alma error: {exc}", file=sys.stderr)
        return 1

    if not (args.doc_id or args.current_link):
        return 0

    target = args.save_to or Path(document.filename)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(document.data)
    print(f"Saved: {target}")
    print(f"Filename: {document.filename}")
    print(f"Source: {document.source_url}")
    print(f"Final URL: {document.final_url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

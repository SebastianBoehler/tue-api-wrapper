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
        description="Request-based Ovidius readers for forum topics and exercise assignments."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    forum = subparsers.add_parser("forum", help="Print forum topics.")
    forum.add_argument("--target", default="frm/5509946", help="ILIAS forum target or full URL.")
    forum.add_argument("--limit", type=int, default=25, help="Maximum number of topics to print.")

    exercise = subparsers.add_parser("exercise", help="Print exercise assignments.")
    exercise.add_argument("--target", default="exc/5509760", help="ILIAS exercise target or full URL.")
    exercise.add_argument("--limit", type=int, default=25, help="Maximum number of assignments to print.")
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
        if args.command == "forum":
            topics = client.fetch_forum_topics(args.target)
            for topic in topics[: args.limit]:
                print(
                    f"- {topic.title} | author={topic.author or '-'} | posts={topic.posts or '-'} | "
                    f"last={topic.last_post or '-'} | visits={topic.visits or '-'} | {topic.url}"
                )
            return 0

        if args.command == "exercise":
            assignments = client.fetch_exercise_assignments(args.target)
            for assignment in assignments[: args.limit]:
                print(
                    f"- {assignment.title} | due={assignment.due_at or assignment.due_hint or '-'} | "
                    f"status={assignment.status or '-'} | type={assignment.submission_type or '-'} | {assignment.url}"
                )
            return 0
    except AlmaError as exc:
        print(f"ilias error: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

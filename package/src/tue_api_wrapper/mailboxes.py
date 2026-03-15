from __future__ import annotations

import re

from .mail_models import MailboxSummary

_MAILBOX_PATTERN = re.compile(r'^\((?P<flags>[^)]*)\)\s+"(?P<delimiter>[^"]*)"\s+(?P<name>.+)$')


def parse_mailbox_line(line: bytes | str) -> tuple[str, tuple[str, ...]]:
    text = line.decode("utf-8", errors="replace") if isinstance(line, bytes) else line
    match = _MAILBOX_PATTERN.match(text.strip())
    if not match:
        raise ValueError(f"Unsupported IMAP mailbox line: {text!r}")

    flags = tuple(token for token in match.group("flags").split() if token)
    raw_name = match.group("name").strip()
    name = raw_name[1:-1] if raw_name.startswith('"') and raw_name.endswith('"') else raw_name
    return name, flags


def infer_special_use(name: str, flags: tuple[str, ...]) -> str | None:
    flag_map = {
        "\\Inbox": "inbox",
        "\\Drafts": "drafts",
        "\\Sent": "sent",
        "\\Trash": "trash",
        "\\Junk": "junk",
        "\\Archive": "archive",
    }
    for flag, special_use in flag_map.items():
        if flag in flags:
            return special_use

    normalized = name.lower()
    if normalized == "inbox":
        return "inbox"
    if "draft" in normalized:
        return "drafts"
    if "sent" in normalized:
        return "sent"
    if "trash" in normalized:
        return "trash"
    if "spam" in normalized or "junk" in normalized:
        return "junk"
    if "archive" in normalized:
        return "archive"
    return None


def build_mailbox_summary(
    *,
    name: str,
    flags: tuple[str, ...],
    message_count: int | None,
    unread_count: int | None,
) -> MailboxSummary:
    label = name.split("/")[-1].strip() or name
    return MailboxSummary(
        name=name,
        label=label,
        special_use=infer_special_use(name, flags),
        message_count=message_count,
        unread_count=unread_count,
    )

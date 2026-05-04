from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class MailMessageSummary:
    uid: str
    subject: str
    from_name: str | None
    from_address: str | None
    received_at: str | None
    preview: str | None
    is_unread: bool
    is_approved_broadcast: bool = False


@dataclass(frozen=True)
class MailInboxSummary:
    account: str
    mailbox: str
    unread_count: int
    messages: tuple[MailMessageSummary, ...]


@dataclass(frozen=True)
class MailboxSummary:
    name: str
    label: str
    special_use: str | None
    message_count: int | None
    unread_count: int | None


@dataclass(frozen=True)
class MailMessageDetail:
    uid: str
    mailbox: str
    subject: str
    from_name: str | None
    from_address: str | None
    to_recipients: tuple[str, ...]
    cc_recipients: tuple[str, ...]
    received_at: str | None
    preview: str | None
    body_text: str | None
    attachment_names: tuple[str, ...]
    is_unread: bool
    is_approved_broadcast: bool = False

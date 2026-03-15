from __future__ import annotations

import imaplib

from .config import DEFAULT_TIMEOUT_SECONDS, MailError, MailLoginError
from .mail_models import MailInboxSummary, MailMessageDetail, MailMessageSummary, MailboxSummary
from .mail_parsing import parse_message_detail, parse_message_summary
from .mailboxes import build_mailbox_summary, parse_mailbox_line

MAIL_IMAP_HOST = "mailserv.uni-tuebingen.de"
MAIL_IMAP_PORT = 993


class MailClient:
    def __init__(
        self,
        *,
        host: str = MAIL_IMAP_HOST,
        port: int = MAIL_IMAP_PORT,
        timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
    ) -> None:
        self.host = host
        self.port = port
        self.timeout_seconds = timeout_seconds
        self._client: imaplib.IMAP4_SSL | None = None
        self._account: str | None = None

    def login(self, username: str, password: str) -> None:
        try:
            client = imaplib.IMAP4_SSL(self.host, self.port, timeout=self.timeout_seconds)
            client.login(username, password)
        except imaplib.IMAP4.error as exc:
            raise MailLoginError(
                "Mail login failed. Uni Tuebingen mail usually expects the ZDV-ID as UNI_USERNAME."
            ) from exc
        except OSError as exc:
            raise MailError(f"Could not reach the IMAP server at {self.host}:{self.port}.") from exc

        self._client = client
        self._account = username

    def fetch_inbox_summary(self, *, mailbox: str = "INBOX", limit: int = 12) -> MailInboxSummary:
        return self.fetch_mailbox_summary(mailbox=mailbox, limit=limit)

    def fetch_mailbox_summary(
        self,
        *,
        mailbox: str = "INBOX",
        limit: int = 12,
        unread_only: bool = False,
        query: str = "",
        sender: str = "",
        scan_limit: int = 200,
    ) -> MailInboxSummary:
        client = self._require_client()
        status, _ = client.select(mailbox, readonly=True)
        if status != "OK":
            raise MailError(f"Could not open mailbox '{mailbox}'.")

        unread_ids = set(self._search_uids(client, "UNSEEN"))
        all_ids = self._search_uids(client, "ALL")
        query = query.strip()
        sender = sender.strip()

        prefetched_messages: list[MailMessageSummary] | None = None
        if not unread_only and not query and not sender:
            recent_ids = list(reversed(all_ids[-limit:]))
        else:
            source_ids = tuple(uid for uid in all_ids if not unread_only or uid in unread_ids)
            filtered_messages: list[MailMessageSummary] = []
            for uid in reversed(source_ids[-scan_limit:]):
                summary = self._fetch_message_summary(client, uid, uid in unread_ids)
                if not _matches_message_filters(summary, query=query, sender=sender):
                    continue
                filtered_messages.append(summary)
                if len(filtered_messages) >= limit:
                    break
            recent_ids = []
            prefetched_messages = filtered_messages

        messages = (
            tuple(prefetched_messages)
            if prefetched_messages is not None
            else tuple(self._fetch_message_summary(client, uid, uid in unread_ids) for uid in recent_ids)
        )
        return MailInboxSummary(
            account=self._account or "",
            mailbox=mailbox,
            unread_count=len(unread_ids),
            messages=messages,
        )

    def list_mailboxes(self) -> tuple[MailboxSummary, ...]:
        client = self._require_client()
        status, rows = client.list()
        if status != "OK":
            raise MailError("Could not list mailboxes.")

        summaries: list[MailboxSummary] = []
        for row in rows or []:
            name, flags = parse_mailbox_line(row)
            message_count, unread_count = self._mailbox_counts(client, name)
            summaries.append(
                build_mailbox_summary(
                    name=name,
                    flags=flags,
                    message_count=message_count,
                    unread_count=unread_count,
                )
            )
        return tuple(
            sorted(
                summaries,
                key=lambda item: (item.special_use != "inbox", item.label.lower(), item.name.lower()),
            )
        )

    def fetch_message_detail(self, uid: str, *, mailbox: str = "INBOX") -> MailMessageDetail:
        client = self._require_client()
        status, _ = client.select(mailbox, readonly=True)
        if status != "OK":
            raise MailError(f"Could not open mailbox '{mailbox}'.")

        unread_ids = set(self._search_uids(client, "UNSEEN"))
        raw_message = self._fetch_raw_message(client, uid)
        return parse_message_detail(raw_message, uid=uid, mailbox=mailbox, is_unread=uid in unread_ids)

    def close(self) -> None:
        if self._client is None:
            return
        try:
            self._client.logout()
        except imaplib.IMAP4.error:
            pass
        self._client = None

    def _require_client(self) -> imaplib.IMAP4_SSL:
        if self._client is None:
            raise MailError("Mail client is not authenticated.")
        return self._client

    @staticmethod
    def _search_uids(client: imaplib.IMAP4_SSL, criterion: str) -> tuple[str, ...]:
        status, data = client.uid("search", None, criterion)
        if status != "OK":
            raise MailError(f"IMAP search failed for criterion '{criterion}'.")
        payload = data[0].decode("utf-8", errors="replace").strip() if data and data[0] else ""
        return tuple(token for token in payload.split() if token)

    def _fetch_message_summary(
        self,
        client: imaplib.IMAP4_SSL,
        uid: str,
        is_unread: bool,
    ) -> MailMessageSummary:
        raw_message = self._fetch_raw_message(client, uid)
        return parse_message_summary(raw_message, uid=uid, is_unread=is_unread)

    @staticmethod
    def _fetch_raw_message(client: imaplib.IMAP4_SSL, uid: str) -> bytes:
        status, data = client.uid("fetch", uid, "(BODY.PEEK[])")
        if status != "OK" or not data:
            raise MailError(f"IMAP fetch failed for message UID {uid}.")

        raw_message = next(
            (
                chunk[1]
                for chunk in data
                if isinstance(chunk, tuple) and len(chunk) > 1 and isinstance(chunk[1], bytes)
            ),
            None,
        )
        if raw_message is None:
            raise MailError(f"IMAP fetch returned no message body for UID {uid}.")
        return raw_message

    @staticmethod
    def _mailbox_counts(client: imaplib.IMAP4_SSL, mailbox: str) -> tuple[int | None, int | None]:
        try:
            status, rows = client.status(mailbox, "(MESSAGES UNSEEN)")
        except imaplib.IMAP4.error:
            return (None, None)
        if status != "OK" or not rows or not rows[0]:
            return (None, None)

        payload = rows[0].decode("utf-8", errors="replace")
        message_count = _extract_status_value(payload, "MESSAGES")
        unread_count = _extract_status_value(payload, "UNSEEN")
        return (message_count, unread_count)


def _extract_status_value(payload: str, key: str) -> int | None:
    import re

    match = re.search(rf"{key}\s+(\d+)", payload)
    return int(match.group(1)) if match else None


def _matches_message_filters(message: MailMessageSummary, *, query: str, sender: str) -> bool:
    sender = sender.strip().lower()
    if sender:
        haystacks = [message.from_name or "", message.from_address or ""]
        if not any(sender in value.lower() for value in haystacks):
            return False

    query = query.strip().lower()
    if query:
        haystacks = [message.subject, message.preview or "", message.from_name or "", message.from_address or ""]
        if not any(query in value.lower() for value in haystacks):
            return False

    return True

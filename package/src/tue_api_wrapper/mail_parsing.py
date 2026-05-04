from __future__ import annotations

from email.header import decode_header
from email.message import Message
from email.utils import getaddresses, parsedate_to_datetime, parseaddr
import html
import re

from .mail_models import MailMessageDetail, MailMessageSummary

_BROADCAST_APPROVAL_RE = re.compile(
    r"Die Hochschulleitung hat (?:dem|den) Versand dieser (?:Rundmail|Runde) zugestimmt\.?",
    re.IGNORECASE,
)
_BROADCAST_RESPONSIBILITY_RE = re.compile(
    r"\*{8,}\s*\*\s*\*\s*\*\s*Die inhaltliche Verantwortung liegt bei der Absenderin/dem Absender\s*\*\s*\*{8,}",
    re.IGNORECASE,
)


def decode_mime_header(value: str | None) -> str:
    if not value:
        return ""

    parts: list[str] = []
    for chunk, encoding in decode_header(value):
        if isinstance(chunk, bytes):
            parts.append(chunk.decode(encoding or "utf-8", errors="replace"))
        else:
            parts.append(chunk)
    return "".join(parts).strip()


def parse_message_summary(raw_message: bytes, *, uid: str, is_unread: bool) -> MailMessageSummary:
    parsed = _message_from_bytes(raw_message)
    sender_name, sender_address = _parse_single_address(parsed.get("From"))
    body = extract_body_text(parsed)

    return MailMessageSummary(
        uid=uid,
        subject=decode_mime_header(parsed.get("Subject")) or "(No subject)",
        from_name=sender_name,
        from_address=sender_address,
        received_at=_parse_received_at(parsed.get("Date")),
        preview=preview_from_text(strip_broadcast_boilerplate(body)),
        is_unread=is_unread,
        is_approved_broadcast=has_broadcast_approval(body),
    )


def parse_message_detail(
    raw_message: bytes,
    *,
    uid: str,
    mailbox: str,
    is_unread: bool,
) -> MailMessageDetail:
    parsed = _message_from_bytes(raw_message)
    sender_name, sender_address = _parse_single_address(parsed.get("From"))
    body = extract_body_text(parsed)
    cleaned_body = strip_broadcast_boilerplate(body)

    return MailMessageDetail(
        uid=uid,
        mailbox=mailbox,
        subject=decode_mime_header(parsed.get("Subject")) or "(No subject)",
        from_name=sender_name,
        from_address=sender_address,
        to_recipients=_parse_address_list(parsed.get("To")),
        cc_recipients=_parse_address_list(parsed.get("Cc")),
        received_at=_parse_received_at(parsed.get("Date")),
        preview=preview_from_text(cleaned_body),
        body_text=cleaned_body,
        attachment_names=_extract_attachment_names(parsed),
        is_unread=is_unread,
        is_approved_broadcast=has_broadcast_approval(body),
    )


def extract_text_preview(message: Message, limit: int = 160) -> str | None:
    return preview_from_text(strip_broadcast_boilerplate(extract_body_text(message)), limit=limit)


def preview_from_text(value: str | None, limit: int = 160) -> str | None:
    if not value:
        return None
    collapsed = re.sub(r"\s+", " ", value).strip()
    if not collapsed:
        return None
    return collapsed[:limit]


def has_broadcast_approval(value: str | None) -> bool:
    return bool(value and _BROADCAST_APPROVAL_RE.search(value))


def strip_broadcast_boilerplate(value: str | None) -> str | None:
    if not value:
        return value
    cleaned = _BROADCAST_APPROVAL_RE.sub("", value)
    cleaned = _BROADCAST_RESPONSIBILITY_RE.sub("", cleaned)
    return cleaned.strip() or None


def extract_body_text(message: Message) -> str | None:
    plain_parts: list[str] = []
    html_parts: list[str] = []

    for part in message.walk():
        if part.get_content_maintype() == "multipart":
            continue
        if _is_attachment(part):
            continue

        payload = part.get_payload(decode=True)
        if payload is None:
            continue

        charset = part.get_content_charset() or "utf-8"
        text = payload.decode(charset, errors="replace")
        content_type = part.get_content_type()
        if content_type == "text/plain":
            plain_parts.append(text)
        elif content_type == "text/html":
            html_parts.append(text)

    source = "\n\n".join(part for part in plain_parts if part.strip())
    if source:
        return _normalize_body_text(source)

    html_source = "\n\n".join(part for part in html_parts if part.strip())
    if not html_source:
        return None
    return _normalize_body_text(_html_to_text(html_source))


def _message_from_bytes(raw_message: bytes) -> Message:
    from email import message_from_bytes

    return message_from_bytes(raw_message)


def _parse_single_address(value: str | None) -> tuple[str | None, str | None]:
    name, address = parseaddr(decode_mime_header(value))
    return (name or None, address or None)


def _parse_address_list(value: str | None) -> tuple[str, ...]:
    decoded = decode_mime_header(value)
    if not decoded:
        return ()

    formatted: list[str] = []
    for name, address in getaddresses([decoded]):
        name = name.strip()
        address = address.strip()
        if name and address:
            formatted.append(f"{name} <{address}>")
        elif address:
            formatted.append(address)
        elif name:
            formatted.append(name)
    return tuple(formatted)


def _parse_received_at(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return parsedate_to_datetime(value).isoformat()
    except (TypeError, ValueError, OverflowError):
        return decode_mime_header(value) or None


def _extract_attachment_names(message: Message) -> tuple[str, ...]:
    names: list[str] = []
    for part in message.walk():
        if not _is_attachment(part):
            continue
        filename = decode_mime_header(part.get_filename())
        if filename:
            names.append(filename)
    return tuple(names)


def _is_attachment(part: Message) -> bool:
    disposition = (part.get("Content-Disposition") or "").lower()
    return "attachment" in disposition


def _html_to_text(value: str) -> str:
    normalized = re.sub(r"(?i)<br\s*/?>", "\n", value)
    normalized = re.sub(r"(?i)</(p|div|li|tr|h1|h2|h3|h4|h5|h6|blockquote)>", "\n", normalized)
    normalized = re.sub(r"(?i)<li[^>]*>", "- ", normalized)
    normalized = re.sub(r"<[^>]+>", "", normalized)
    return html.unescape(normalized)


def _normalize_body_text(value: str) -> str | None:
    lines = [line.rstrip() for line in value.replace("\r\n", "\n").replace("\r", "\n").split("\n")]
    cleaned: list[str] = []
    blank_streak = 0

    for line in lines:
        collapsed = line.strip()
        if not collapsed:
            blank_streak += 1
            if blank_streak <= 1:
                cleaned.append("")
            continue

        blank_streak = 0
        cleaned.append(collapsed)

    result = "\n".join(cleaned).strip()
    return result or None

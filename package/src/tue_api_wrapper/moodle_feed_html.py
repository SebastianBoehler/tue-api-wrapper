from __future__ import annotations

from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .moodle_models import (
    MoodleGradeItem,
    MoodleGradesPage,
    MoodleMessageItem,
    MoodleMessagesPage,
    MoodleNotificationItem,
    MoodleNotificationsPage,
)


def parse_moodle_grades_page(html: str, page_url: str) -> MoodleGradesPage:
    soup = BeautifulSoup(html, "html.parser")
    rows = _table_rows(soup, ("grade", "bewertung", "course", "kurs"))
    items: list[MoodleGradeItem] = []
    for cells, row in rows:
        link = row.select_one('a[href*="/course/view.php"], a[href*="/grade/"]')
        values = [_clean_text(cell.get_text(" ", strip=True)) for cell in cells]
        values = [value for value in values if value]
        if not values:
            continue
        course_title = _clean_text(link.get_text(" ", strip=True)) if link is not None else values[0]
        tail = [value for value in values if value != course_title]
        items.append(
            MoodleGradeItem(
                course_title=course_title,
                grade=tail[0] if len(tail) > 0 else None,
                percentage=tail[1] if len(tail) > 1 else None,
                range_hint=tail[2] if len(tail) > 2 else None,
                rank=tail[3] if len(tail) > 3 else None,
                feedback=tail[4] if len(tail) > 4 else None,
                url=urljoin(page_url, link["href"]) if link is not None else None,
            )
        )
    return MoodleGradesPage(source_url=page_url, items=tuple(items))


def parse_moodle_messages_page(html: str, page_url: str) -> MoodleMessagesPage:
    soup = BeautifulSoup(html, "html.parser")
    items: list[MoodleMessageItem] = []
    for node in _list_items(soup, ("[data-conversation-id]", ".message-app .list-group-item", ".message", ".conversation")):
        link = node.select_one("a[href]")
        title = _first_text(node.select("strong, .h6, .title, .subject, a[href]"))
        preview = _first_text(node.select(".text-muted, .summary, .preview, .content"))
        sender = _first_text(node.select(".sender, .user, .from"))
        timestamp = _first_text(node.select("time, .time, .date"))
        items.append(
            MoodleMessageItem(
                title=title or "Untitled conversation",
                preview=preview,
                sender=sender,
                timestamp=timestamp,
                url=urljoin(page_url, link["href"]) if link is not None else None,
                unread=_class_flag(node, "unread"),
            )
        )
    return MoodleMessagesPage(source_url=page_url, items=tuple(items))


def parse_moodle_notifications_page(html: str, page_url: str) -> MoodleNotificationsPage:
    soup = BeautifulSoup(html, "html.parser")
    items: list[MoodleNotificationItem] = []
    for node in _list_items(soup, (".notification", ".content-item-container", "table.generaltable tbody tr", "li")):
        link = node.select_one("a[href]")
        text = _clean_text(node.get_text(" ", strip=True))
        if not text:
            continue
        title = _first_text(node.select("strong, .subject, .title, a[href]")) or text
        body = _first_text(node.select(".text-muted, .content, .message")) or (None if title == text else text)
        timestamp = _first_text(node.select("time, .time, .date"))
        items.append(
            MoodleNotificationItem(
                title=title,
                body=body,
                timestamp=timestamp,
                url=urljoin(page_url, link["href"]) if link is not None else None,
                unread=_class_flag(node, "unread"),
            )
        )
    return MoodleNotificationsPage(source_url=page_url, items=tuple(items))


def _table_rows(soup: BeautifulSoup, keywords: tuple[str, ...]) -> list[tuple[list[object], object]]:
    for table in soup.select("table"):
        headers = [_clean_text(cell.get_text(" ", strip=True)).lower() for cell in table.select("th")]
        if headers and not any(any(keyword in header for keyword in keywords) for header in headers):
            continue
        rows: list[tuple[list[object], object]] = []
        for row in table.select("tbody tr, tr"):
            cells = row.find_all(["td", "th"])
            if len(cells) < 2 or row.find("th") is not None:
                continue
            rows.append((cells, row))
        if rows:
            return rows
    return []


def _list_items(soup: BeautifulSoup, selectors: tuple[str, ...]) -> list[object]:
    for selector in selectors:
        items = soup.select(selector)
        if items:
            return items
    return []


def _first_text(nodes: list[object]) -> str | None:
    for node in nodes:
        text = _clean_text(node.get_text(" ", strip=True))
        if text:
            return text
    return None


def _clean_text(value: str) -> str:
    return " ".join(value.split())


def _class_flag(node: object, token: str) -> bool | None:
    classes = node.get("class")
    if not isinstance(classes, list):
        return None
    return any(token == value or token in value for value in classes if isinstance(value, str))

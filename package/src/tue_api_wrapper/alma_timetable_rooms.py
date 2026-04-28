from __future__ import annotations

from dataclasses import replace
from datetime import date, datetime
import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from bs4.element import Tag

from .alma_timetable_models import AlmaTimetableRoomEntry
from .calendar_room_models import CalendarRoomDetails
from .models import CalendarEvent, CalendarOccurrence

_WEEKDAYS = {
    "montag": 0,
    "dienstag": 1,
    "mittwoch": 2,
    "donnerstag": 3,
    "freitag": 4,
    "samstag": 5,
    "sonntag": 6,
}


def extract_timetable_room_entries(html: str, page_url: str) -> tuple[AlmaTimetableRoomEntry, ...]:
    soup = BeautifulSoup(html, "html.parser")
    entries: list[AlmaTimetableRoomEntry] = []

    for panel in soup.select('div[id$=":scheduleItem:schedulePanelGroup"]'):
        summary = _text(panel.find("h3", class_="scheduleTitle"))
        if not summary:
            continue
        details = _room_details(panel, page_url)
        if details.display_text is None:
            continue
        entries.append(
            AlmaTimetableRoomEntry(
                summary=summary,
                weekday=_weekday(_field_text(panel, "weekdayDefaulttext")),
                start_time=_time_range(_field_text(panel, "processingTimes"))[0],
                end_time=_time_range(_field_text(panel, "processingTimes"))[1],
                start_date=_date(_field_text(panel, "scheduleStartDate")),
                end_date=_date(_field_text(panel, "scheduleEndDate")),
                room_details=details,
            )
        )
    return tuple(entries)


def enrich_calendar_events(
    events: tuple[CalendarEvent, ...],
    entries: tuple[AlmaTimetableRoomEntry, ...],
) -> tuple[CalendarEvent, ...]:
    if not entries:
        return events
    return tuple(_enrich_event(event, entries) for event in events)


def enrich_calendar_occurrences(
    occurrences: tuple[CalendarOccurrence, ...],
    entries: tuple[AlmaTimetableRoomEntry, ...],
) -> tuple[CalendarOccurrence, ...]:
    if not entries:
        return occurrences
    return tuple(_enrich_occurrence(occurrence, entries) for occurrence in occurrences)


def _enrich_event(event: CalendarEvent, entries: tuple[AlmaTimetableRoomEntry, ...]) -> CalendarEvent:
    entry = _matching_entry(event.summary, _event_start(event.start), event.end, entries)
    if entry is None:
        return event
    return replace(
        event,
        location=entry.room_details.display_text or event.location,
        room_details=entry.room_details,
    )


def _enrich_occurrence(
    occurrence: CalendarOccurrence,
    entries: tuple[AlmaTimetableRoomEntry, ...],
) -> CalendarOccurrence:
    entry = _matching_entry(occurrence.summary, occurrence.start, occurrence.end, entries)
    if entry is None:
        return occurrence
    return replace(
        occurrence,
        location=entry.room_details.display_text or occurrence.location,
        room_details=entry.room_details,
    )


def _matching_entry(
    summary: str,
    start: datetime | None,
    end: datetime | None,
    entries: tuple[AlmaTimetableRoomEntry, ...],
) -> AlmaTimetableRoomEntry | None:
    if start is None:
        return None
    summary_key = _key(summary)
    start_date = start.date()
    start_time = start.strftime("%H:%M")
    end_time = end.strftime("%H:%M") if end is not None else None
    weekday = start.weekday()

    for entry in entries:
        if _key(entry.summary) != summary_key:
            continue
        if entry.weekday is not None and entry.weekday != weekday:
            continue
        if entry.start_time is not None and entry.start_time != start_time:
            continue
        if entry.end_time is not None and end_time is not None and entry.end_time != end_time:
            continue
        if entry.start_date is not None and start_date < entry.start_date:
            continue
        if entry.end_date is not None and start_date > entry.end_date:
            continue
        return entry
    return None


def _room_details(panel: Tag, page_url: str) -> CalendarRoomDetails:
    detail_url = _room_detail_url(panel, page_url)
    details = CalendarRoomDetails(
        room_default=_field_text(panel, "roomDefaulttext"),
        room_short=_field_text(panel, "roomShorttext"),
        room_long=_field_text(panel, "roomLongtext"),
        floor_default=_field_text(panel, "floorDefaulttext"),
        floor_short=_field_text(panel, "floorShorttext"),
        floor_long=_field_text(panel, "floorLongtext"),
        building_default=_field_text(panel, "buildingDefaulttext"),
        building_short=_field_text(panel, "buildingShorttext"),
        building_long=_field_text(panel, "buildingLongtext"),
        campus_default=_field_text(panel, "campusDefaulttext"),
        campus_short=_field_text(panel, "campusShorttext"),
        campus_long=_field_text(panel, "campusLongtext"),
        detail_url=detail_url,
        display_text=None,
    )
    return replace(details, display_text=_display_text(details))


def _field_text(panel: Tag, token: str) -> str | None:
    node = panel.find(attrs={"id": lambda value: bool(value and (value.endswith(f":{token}") or f":{token}:" in value))})
    return _text(node)


def _room_detail_url(panel: Tag, page_url: str) -> str | None:
    for token in ("roomDefaulttext", "roomShorttext", "roomLongtext"):
        link = panel.find(
            "a",
            attrs={"id": lambda value: bool(value and f":{token}:showRoomDetailLink" in value)},
            href=True,
        )
        if link is not None:
            return urljoin(page_url, link["href"])
    return None


def _display_text(details: CalendarRoomDetails) -> str | None:
    parts = [
        details.room_default or details.room_short or details.room_long,
        details.floor_default or details.floor_short or details.floor_long,
        details.building_default or details.building_short or details.building_long,
        details.campus_default or details.campus_long or details.campus_short,
    ]
    compact: list[str] = []
    seen: set[str] = set()
    for part in parts:
        key = _key(part or "")
        if not key or key in seen:
            continue
        compact.append(part or "")
        seen.add(key)
    return ", ".join(compact) if compact else None


def _time_range(value: str | None) -> tuple[str | None, str | None]:
    if not value:
        return None, None
    match = re.search(r"(\d{1,2}:\d{2})\s*bis\s*(\d{1,2}:\d{2})", value)
    if match is None:
        return None, None
    return _normalize_time(match.group(1)), _normalize_time(match.group(2))


def _normalize_time(value: str) -> str:
    hour, minute = value.split(":", 1)
    return f"{int(hour):02d}:{minute}"


def _date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return datetime.strptime(value, "%d.%m.%Y").date()
    except ValueError:
        return None


def _weekday(value: str | None) -> int | None:
    return _WEEKDAYS.get((value or "").strip().casefold())


def _event_start(value: date | datetime) -> datetime | None:
    return value if isinstance(value, datetime) else None


def _text(node) -> str | None:
    if node is None:
        return None
    cleaned = " ".join(node.get_text(" ", strip=True).split())
    return cleaned or None


def _key(value: str) -> str:
    return " ".join(value.split()).casefold()

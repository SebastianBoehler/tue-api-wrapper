from __future__ import annotations

from datetime import datetime
from urllib.parse import urljoin

from .config import AlmaParseError, GERMAN_TIMEZONE
from .moodle_models import (
    MoodleCourseSummary,
    MoodleDashboardEvent,
    MoodleRecentItem,
)


def extract_ajax_result(payload: object) -> object:
    if isinstance(payload, list) and payload:
        item = payload[0]
        if isinstance(item, dict):
            if item.get("error"):
                message = item.get("exception") or item.get("message") or "Moodle AJAX request failed."
                raise AlmaParseError(str(message))
            if "data" in item:
                return item["data"]
            return item
    return payload


def normalize_dashboard_events(payload: object, *, base_url: str) -> tuple[MoodleDashboardEvent, ...]:
    items = payload.get("events", payload) if isinstance(payload, dict) else payload
    if not isinstance(items, list):
        return ()

    events: list[MoodleDashboardEvent] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        action = item.get("action")
        course = item.get("course")
        course_id = _as_int(item.get("courseid"))
        course_name = None
        if isinstance(course, dict):
            course_id = _as_int(course.get("id")) or course_id
            course_name = _as_text(course.get("fullname")) or _as_text(course.get("shortname"))
        elif isinstance(course, str):
            course_name = course.strip() or None

        action_url = None
        if isinstance(action, dict):
            action_url = _as_url(action.get("url"), base_url)
        action_url = action_url or _as_url(item.get("url"), base_url) or _as_url(item.get("viewurl"), base_url)
        events.append(
            MoodleDashboardEvent(
                id=_as_int(item.get("id")),
                title=_as_text(item.get("name")) or _as_text(item.get("title")) or "Untitled event",
                due_at=_timestamp_to_iso(item.get("timesort")),
                formatted_time=_as_text(item.get("formattedtime")),
                course_name=course_name,
                course_id=course_id,
                action_url=action_url,
                description=_as_text(item.get("description")),
                is_actionable=bool(action_url),
            )
        )
    return tuple(events)


def normalize_recent_items(payload: object, *, base_url: str) -> tuple[MoodleRecentItem, ...]:
    items = payload.get("items", payload) if isinstance(payload, dict) else payload
    if not isinstance(items, list):
        return ()

    recent_items: list[MoodleRecentItem] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        recent_items.append(
            MoodleRecentItem(
                id=_as_int(item.get("id")),
                title=_as_text(item.get("name")) or _as_text(item.get("title")) or "Untitled item",
                item_type=_as_text(item.get("modname")) or _as_text(item.get("typename")),
                course_name=_as_text(item.get("coursename")),
                course_id=_as_int(item.get("courseid")),
                url=_as_url(item.get("viewurl"), base_url) or _as_url(item.get("url"), base_url),
                icon_url=_as_url(item.get("iconurl"), base_url) or _as_url(item.get("imageurl"), base_url),
            )
        )
    return tuple(recent_items)


def normalize_enrolled_courses(payload: object, *, base_url: str) -> tuple[MoodleCourseSummary, ...]:
    items = payload.get("courses", payload) if isinstance(payload, dict) else payload
    if not isinstance(items, list):
        return ()

    courses: list[MoodleCourseSummary] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        course_id = _as_int(item.get("id"))
        courses.append(
            MoodleCourseSummary(
                id=course_id,
                title=_as_text(item.get("fullname")) or _as_text(item.get("displayname")) or "Untitled course",
                shortname=_as_text(item.get("shortname")),
                category_name=_as_text(item.get("coursecategory")) or _as_text(item.get("categoryname")),
                visible=_as_bool(item.get("visible")),
                end_date=_timestamp_to_iso(item.get("enddate")),
                url=_as_url(item.get("viewurl"), base_url)
                or (urljoin(base_url, f"/course/view.php?id={course_id}") if course_id is not None else None),
                image_url=_as_url(item.get("courseimage"), base_url),
            )
        )
    return tuple(courses)


def extract_next_offset(payload: object) -> int | None:
    if not isinstance(payload, dict):
        return None
    return _as_int(payload.get("nextoffset"))


def _as_text(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = " ".join(value.split())
    return cleaned or None


def _as_int(value: object) -> int | None:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, str) and value.strip():
        try:
            return int(value.strip())
        except ValueError:
            return None
    return None


def _as_bool(value: object) -> bool | None:
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return bool(value)
    if isinstance(value, str) and value.strip():
        if value.strip().lower() in {"1", "true", "yes"}:
            return True
        if value.strip().lower() in {"0", "false", "no"}:
            return False
    return None


def _as_url(value: object, base_url: str) -> str | None:
    if not isinstance(value, str) or not value.strip():
        return None
    return urljoin(base_url, value.strip())


def _timestamp_to_iso(value: object) -> str | None:
    timestamp = _as_int(value)
    if timestamp is None or timestamp <= 0:
        return None
    return datetime.fromtimestamp(timestamp, tz=GERMAN_TIMEZONE).isoformat()

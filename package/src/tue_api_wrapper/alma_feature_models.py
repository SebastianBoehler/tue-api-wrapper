from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AlmaCurrentLecturesForm:
    action_url: str
    payload: dict[str, str]
    date_field_name: str
    search_button_name: str
    filter_field_name: str | None
    filter_values: tuple[str, ...]


@dataclass(frozen=True)
class AlmaCurrentLecture:
    title: str
    detail_url: str | None
    start: str | None
    end: str | None
    number: str | None
    parallel_group: str | None
    event_type: str | None
    responsible_lecturer: str | None
    lecturer: str | None
    building: str | None
    room: str | None
    semester: str | None
    remark: str | None


@dataclass(frozen=True)
class AlmaCurrentLecturesPage:
    page_url: str
    selected_date: str | None
    results: tuple[AlmaCurrentLecture, ...]

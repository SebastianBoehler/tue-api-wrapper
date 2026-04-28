from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from .models import CalendarOccurrence, CalendarRoomDetails


@dataclass(frozen=True)
class AlmaTimetableOption:
    value: str
    label: str
    is_selected: bool


@dataclass(frozen=True)
class AlmaTimetableDay:
    label: str
    iso_date: str | None
    restrict_view_name: str | None
    note: str | None


@dataclass(frozen=True)
class AlmaTimetableFormRequest:
    page_url: str
    action_url: str
    payload: dict[str, str]


@dataclass(frozen=True)
class AlmaTimetableRoomEntry:
    summary: str
    weekday: int | None
    start_time: str | None
    end_time: str | None
    start_date: date | None
    end_date: date | None
    room_details: CalendarRoomDetails


@dataclass(frozen=True)
class AlmaTimetableContract:
    page_url: str
    terms: tuple[AlmaTimetableOption, ...]
    range_modes: tuple[AlmaTimetableOption, ...]
    weeks: tuple[AlmaTimetableOption, ...]
    days: tuple[AlmaTimetableDay, ...]
    selected_term_value: str | None
    selected_term_label: str | None
    selected_range_mode_value: str | None
    selected_range_mode_label: str | None
    selected_week_value: str | None
    selected_week_label: str | None
    export_url: str | None
    print_available: bool
    can_refresh_export_url: bool
    supports_custom_range: bool


@dataclass(frozen=True)
class AlmaTimetableView:
    page_url: str
    selected_term_value: str | None
    selected_term_label: str | None
    selected_range_mode_value: str | None
    selected_range_mode_label: str | None
    selected_week_value: str | None
    selected_week_label: str | None
    visible_range_start: date | None
    visible_range_end: date | None
    source_export_url: str | None
    calendar_feed_url: str | None
    can_refresh_export_url: bool
    can_print_pdf: bool
    supports_custom_range: bool
    terms: tuple[AlmaTimetableOption, ...]
    range_modes: tuple[AlmaTimetableOption, ...]
    weeks: tuple[AlmaTimetableOption, ...]
    days: tuple[AlmaTimetableDay, ...]
    occurrences: tuple[CalendarOccurrence, ...]


@dataclass(frozen=True)
class AlmaTimetableExportLink:
    page_url: str
    selected_term_value: str | None
    selected_term_label: str | None
    source_export_url: str | None
    calendar_feed_url: str | None
    can_refresh_export_url: bool

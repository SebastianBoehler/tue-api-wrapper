from __future__ import annotations

from dataclasses import dataclass

from .models import AlmaModuleDetail


@dataclass(frozen=True)
class AlmaTimetableCourseSlot:
    weekday: int
    weekday_label: str
    start_time: str
    end_time: str | None
    location: str | None


@dataclass(frozen=True)
class AlmaTimetableCourseAssignment:
    summary: str
    occurrence_count: int
    slots: tuple[AlmaTimetableCourseSlot, ...]
    number: str | None
    title: str | None
    event_type: str | None
    organization: str | None
    detail_url: str | None
    detail: AlmaModuleDetail | None
    error: str | None = None


@dataclass(frozen=True)
class AlmaTimetableCourseAssignmentsPage:
    term_label: str
    term_id: str
    courses: tuple[AlmaTimetableCourseAssignment, ...]

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AlmaStudyPlannerSemester:
    index: int
    label: str
    term_label: str | None


@dataclass(frozen=True)
class AlmaStudyPlannerModule:
    row_index: int
    column_start: int
    column_span: int
    title: str
    number: str | None
    credits_summary: str | None
    credits_earned: float | None
    credits_required: float | None
    progress_percent: float | None
    detail_url: str | None
    is_expandable: bool


@dataclass(frozen=True)
class AlmaStudyPlannerViewState:
    show_recommended_plan: bool
    show_my_modules: bool
    show_alternative_semesters: bool


@dataclass(frozen=True)
class AlmaStudyPlannerPage:
    title: str
    page_url: str
    semesters: tuple[AlmaStudyPlannerSemester, ...]
    modules: tuple[AlmaStudyPlannerModule, ...]
    view_state: AlmaStudyPlannerViewState

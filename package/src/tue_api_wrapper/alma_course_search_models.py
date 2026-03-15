from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AlmaCourseSearchTermOption:
    value: str
    label: str
    is_selected: bool


@dataclass(frozen=True)
class AlmaCourseSearchForm:
    action_url: str
    payload: dict[str, str]
    query_field_name: str
    term_field_name: str
    search_button_name: str
    term_options: tuple[AlmaCourseSearchTermOption, ...]


@dataclass(frozen=True)
class AlmaCourseSearchResult:
    number: str | None
    title: str
    event_type: str | None
    responsible_lecturer: str | None
    lecturer: str | None
    organization: str | None
    detail_url: str | None


@dataclass(frozen=True)
class AlmaCourseSearchPage:
    page_url: str
    query: str
    selected_term_value: str | None
    selected_term_label: str | None
    term_options: tuple[AlmaCourseSearchTermOption, ...]
    results: tuple[AlmaCourseSearchResult, ...]

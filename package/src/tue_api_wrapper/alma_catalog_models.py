from __future__ import annotations

from dataclasses import dataclass

from .models import AlmaCourseCatalogNode


@dataclass(frozen=True)
class AlmaCourseCatalogTermOption:
    value: str
    label: str
    is_selected: bool


@dataclass(frozen=True)
class AlmaCourseCatalogContract:
    page_url: str
    action_url: str
    payload: dict[str, str]
    submit_marker_name: str | None
    term_field_name: str | None
    term_options: tuple[AlmaCourseCatalogTermOption, ...]
    nodes: tuple[AlmaCourseCatalogNode, ...]


@dataclass(frozen=True)
class AlmaCourseCatalogPage:
    page_url: str
    selected_term_value: str | None
    selected_term_label: str | None
    term_options: tuple[AlmaCourseCatalogTermOption, ...]
    nodes: tuple[AlmaCourseCatalogNode, ...]

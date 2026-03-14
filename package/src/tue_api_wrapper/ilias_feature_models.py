from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class IliasSearchForm:
    action_url: str
    payload: dict[str, str]
    term_field_name: str
    search_button_name: str


@dataclass(frozen=True)
class IliasSearchResult:
    title: str
    url: str | None
    description: str | None
    info_url: str | None
    add_to_favorites_url: str | None
    breadcrumbs: tuple[str, ...]
    properties: tuple[str, ...]
    item_type: str | None


@dataclass(frozen=True)
class IliasSearchPage:
    page_url: str
    query: str
    page_number: int
    previous_page_url: str | None
    next_page_url: str | None
    results: tuple[IliasSearchResult, ...]


@dataclass(frozen=True)
class IliasInfoField:
    label: str | None
    value: str


@dataclass(frozen=True)
class IliasInfoSection:
    title: str
    fields: tuple[IliasInfoField, ...]


@dataclass(frozen=True)
class IliasInfoPage:
    title: str
    page_url: str
    sections: tuple[IliasInfoSection, ...]

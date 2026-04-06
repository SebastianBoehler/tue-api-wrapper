from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class CareerFacetOption:
    id: int
    label: str
    count: int


@dataclass(slots=True)
class CareerSearchFilters:
    project_types: list[CareerFacetOption] = field(default_factory=list)
    industries: list[CareerFacetOption] = field(default_factory=list)


@dataclass(slots=True)
class CareerOrganization:
    id: int | None
    name: str
    logo_url: str | None


@dataclass(slots=True)
class CareerProjectSummary:
    id: int
    title: str
    preview: str | None
    location: str | None
    project_types: list[str]
    industries: list[str]
    organizations: list[str]
    created_at: str | None
    start_date: str | None
    end_date: str | None
    source_url: str


@dataclass(slots=True)
class CareerProjectDetail:
    id: int
    title: str
    location: str | None
    description: str | None
    requirements: str | None
    project_types: list[str]
    industries: list[str]
    organizations: list[CareerOrganization] = field(default_factory=list)
    created_at: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    source_url: str | None = None


@dataclass(slots=True)
class CareerSearchResponse:
    query: str
    page: int
    per_page: int
    total_hits: int
    total_pages: int
    source_url: str
    filters: CareerSearchFilters
    items: list[CareerProjectSummary] = field(default_factory=list)

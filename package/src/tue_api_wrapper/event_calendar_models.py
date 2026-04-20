from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class UniversityCalendarEvent:
    id: str
    title: str
    starts_at: str
    url: str | None
    speaker: str | None
    location: str | None
    description: str | None
    content_html: str | None
    categories: list[str] = field(default_factory=list)


@dataclass(slots=True)
class UniversityCalendarResponse:
    source_url: str
    feed_url: str
    query: str
    total_hits: int
    returned_hits: int
    items: list[UniversityCalendarEvent] = field(default_factory=list)

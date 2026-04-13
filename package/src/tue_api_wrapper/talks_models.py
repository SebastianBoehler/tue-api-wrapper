from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class TalkTag:
    id: int
    name: str
    description: str | None = None
    total_talks: int | None = None
    has_subscribed: bool | None = None


@dataclass(slots=True)
class Talk:
    id: int
    title: str
    timestamp: str
    description: str | None
    location: str | None
    speaker_name: str | None
    speaker_bio: str | None
    disabled: bool
    source_url: str
    tags: list[TalkTag] = field(default_factory=list)


@dataclass(slots=True)
class TalksResponse:
    scope: str
    query: str
    tag_ids: list[int]
    total_hits: int
    returned_hits: int
    source_url: str
    items: list[Talk] = field(default_factory=list)
    available_tags: list[TalkTag] = field(default_factory=list)

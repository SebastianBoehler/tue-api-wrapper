from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class TimmsChapter:
    start_seconds: int | None
    start_label: str
    title: str
    url: str


@dataclass(slots=True)
class TimmsSearchResult:
    item_id: str
    title: str
    item_url: str
    preview_image_url: str | None
    duration_label: str | None
    chapters: list[TimmsChapter] = field(default_factory=list)


@dataclass(slots=True)
class TimmsSearchPage:
    query: str
    total_hits: int
    offset: int
    limit: int
    source_url: str
    results: list[TimmsSearchResult] = field(default_factory=list)


@dataclass(slots=True)
class TimmsMetadataField:
    label: str
    value: str
    url: str | None = None


@dataclass(slots=True)
class TimmsItemDetail:
    item_id: str
    title: str
    creator: str | None
    player_url: str | None
    citation_downloads: dict[str, str]
    metadata: list[TimmsMetadataField] = field(default_factory=list)
    source_url: str | None = None


@dataclass(slots=True)
class TimmsStreamVariant:
    url: str
    width: int | None
    height: int | None
    bitrate: int | None
    provider: str | None
    streamer: str | None


@dataclass(slots=True)
class TimmsTreeNode:
    node_id: str
    node_path: str
    label: str
    depth: int
    is_open: bool


@dataclass(slots=True)
class TimmsTreeItem:
    item_id: str
    title: str
    url: str


@dataclass(slots=True)
class TimmsTreePage:
    source_url: str
    selected_node_id: str | None
    nodes: list[TimmsTreeNode] = field(default_factory=list)
    items: list[TimmsTreeItem] = field(default_factory=list)

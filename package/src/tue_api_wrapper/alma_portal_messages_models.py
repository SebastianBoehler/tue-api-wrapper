from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AlmaPortalMessagesFeed:
    page_url: str
    feed_url: str | None
    can_refresh_feed: bool

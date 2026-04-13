from __future__ import annotations

from collections import Counter
from functools import lru_cache
import time
from urllib.parse import urljoin

import requests

from .config import DEFAULT_TIMEOUT_SECONDS
from .talks_models import Talk, TalkTag, TalksResponse

TALKS_BASE_URL = "https://talks.tuebingen.ai"
TALKS_CACHE_SECONDS = 120
TALKS_SCOPES = {"upcoming", "previous"}


def _absolute_url(path: str) -> str:
    return urljoin(f"{TALKS_BASE_URL}/", path.lstrip("/"))


def _api_url(path: str) -> str:
    return _absolute_url(f"api/{path.lstrip('/')}")


def _clean_text(value: object) -> str | None:
    text = str(value).strip() if value is not None else ""
    return text or None


def _safe_int(value: object) -> int:
    try:
        return int(value)
    except (TypeError, ValueError) as error:
        raise ValueError(f"Talks API returned an invalid integer id: {value!r}") from error


def map_talk_tag(payload: dict[str, object]) -> TalkTag:
    return TalkTag(
        id=_safe_int(payload.get("id")),
        name=_clean_text(payload.get("name")) or "Untitled tag",
        description=_clean_text(payload.get("description")),
        total_talks=(int(payload["total_talks"]) if payload.get("total_talks") is not None else None),
        has_subscribed=(bool(payload["has_subscribed"]) if payload.get("has_subscribed") is not None else None),
    )


def map_talk(payload: dict[str, object]) -> Talk:
    talk_id = _safe_int(payload.get("id"))
    tags = [
        map_talk_tag(item)
        for item in payload.get("tags", [])
        if isinstance(item, dict)
    ]
    return Talk(
        id=talk_id,
        title=_clean_text(payload.get("title")) or "Untitled talk",
        timestamp=_clean_text(payload.get("timestamp")) or "",
        description=_clean_text(payload.get("description")),
        location=_clean_text(payload.get("location")),
        speaker_name=_clean_text(payload.get("speaker_name")),
        speaker_bio=_clean_text(payload.get("speaker_bio")),
        disabled=bool(payload.get("disabled")),
        source_url=_absolute_url(f"talks/talk/id={talk_id}"),
        tags=tags,
    )


def build_talks_response(
    talks: list[Talk],
    *,
    scope: str,
    query: str = "",
    tag_ids: list[int] | None = None,
    include_disabled: bool = False,
    limit: int = 24,
) -> TalksResponse:
    selected_tag_ids = tag_ids or []
    visible = [talk for talk in talks if include_disabled or not talk.disabled]
    available_tags = _build_tag_facets(visible)
    filtered = _filter_talks(visible, query=query, tag_ids=selected_tag_ids)
    return TalksResponse(
        scope=scope,
        query=query,
        tag_ids=selected_tag_ids,
        total_hits=len(filtered),
        returned_hits=len(filtered[:limit]),
        source_url=_absolute_url("talks"),
        items=filtered[:limit],
        available_tags=available_tags,
    )


def _filter_talks(talks: list[Talk], *, query: str, tag_ids: list[int]) -> list[Talk]:
    selected_tags = set(tag_ids)
    normalized_query = query.strip().lower()
    filtered: list[Talk] = []
    for talk in talks:
        if selected_tags and selected_tags.isdisjoint({tag.id for tag in talk.tags}):
            continue
        haystack = "\n".join(
            [
                talk.title,
                talk.description or "",
                talk.location or "",
                talk.speaker_name or "",
                talk.speaker_bio or "",
                " ".join(tag.name for tag in talk.tags),
            ]
        ).lower()
        if normalized_query and normalized_query not in haystack:
            continue
        filtered.append(talk)
    return filtered


def _build_tag_facets(talks: list[Talk]) -> list[TalkTag]:
    names: dict[int, str] = {}
    counts: Counter[int] = Counter()
    for talk in talks:
        for tag in talk.tags:
            names[tag.id] = tag.name
            counts[tag.id] += 1
    return [
        TalkTag(id=tag_id, name=names[tag_id], total_talks=count)
        for tag_id, count in sorted(counts.items(), key=lambda item: names[item[0]].lower())
    ]


class TalksClient:
    def __init__(self, *, timeout: int = DEFAULT_TIMEOUT_SECONDS) -> None:
        self.timeout = timeout

    def fetch_talks(
        self,
        *,
        scope: str = "upcoming",
        query: str = "",
        tag_ids: list[int] | None = None,
        include_disabled: bool = False,
        limit: int = 24,
    ) -> TalksResponse:
        if scope not in TALKS_SCOPES:
            raise ValueError(f"Unsupported talks scope: {scope}")
        talks = list(self._fetch_raw_talks(scope, _cache_bucket()))
        return build_talks_response(
            talks,
            scope=scope,
            query=query,
            tag_ids=tag_ids,
            include_disabled=include_disabled,
            limit=limit,
        )

    def fetch_talk(self, talk_id: int) -> Talk:
        response = requests.get(
            _api_url(f"talks/{talk_id}"),
            headers=_json_headers(),
            timeout=self.timeout,
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict):
            raise ValueError("Talks detail endpoint returned an invalid payload.")
        return map_talk(payload)

    @lru_cache(maxsize=4)
    def _fetch_raw_talks(self, scope: str, cache_bucket: int) -> tuple[Talk, ...]:
        del cache_bucket
        response = requests.get(
            _talks_list_url(scope),
            headers=_json_headers(),
            timeout=self.timeout,
        )
        response.raise_for_status()
        payload = response.json()
        talks = payload.get("talks") if isinstance(payload, dict) else None
        if not isinstance(talks, list):
            raise ValueError("Talks list endpoint did not return a talks array.")
        return tuple(map_talk(item) for item in talks if isinstance(item, dict))


def _cache_bucket() -> int:
    return int(time.time() // TALKS_CACHE_SECONDS)


def _talks_list_url(scope: str) -> str:
    if scope == "previous":
        return _api_url("talks?previous")
    return _api_url("talks?")


def _json_headers() -> dict[str, str]:
    return {
        "accept": "application/json, text/plain, */*",
        "user-agent": "tue-api-wrapper/0.2 (+https://talks.tuebingen.ai/)",
    }

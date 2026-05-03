from __future__ import annotations

import json
import os
from dataclasses import asdict
from pathlib import Path

from .course_discovery_models import CourseDiscoveryDocument


class CourseDiscoveryCache:
    def __init__(self, path: str | None = None) -> None:
        self._path = Path(path or os.getenv("TUE_DISCOVERY_CACHE", "~/.tue-api-wrapper/course-discovery.json")).expanduser()

    def load(self) -> tuple[tuple[CourseDiscoveryDocument, ...], str | None]:
        try:
            payload = json.loads(self._path.read_text("utf-8"))
        except FileNotFoundError:
            return (), None
        documents = tuple(_document(item) for item in payload.get("documents", []) if isinstance(item, dict))
        last_refresh = payload.get("lastRefresh")
        return documents, last_refresh if isinstance(last_refresh, str) else None

    def save(self, documents: tuple[CourseDiscoveryDocument, ...], last_refresh: str) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._path.write_text(
            json.dumps(
                {
                    "lastRefresh": last_refresh,
                    "documents": [asdict(document) for document in documents],
                },
                ensure_ascii=False,
                indent=2,
            ),
            "utf-8",
        )


def _document(item: dict[str, object]) -> CourseDiscoveryDocument:
    return CourseDiscoveryDocument(
        id=str(item.get("id") or ""),
        source=str(item.get("source") or "unknown"),
        kind=str(item.get("kind") or "course"),
        title=str(item.get("title") or ""),
        text=str(item.get("text") or ""),
        url=_optional_str(item.get("url")),
        module_code=_optional_str(item.get("module_code")),
        degree=_optional_str(item.get("degree")),
        module_categories=_string_tuple(item.get("module_categories")),
        degrees=_string_tuple(item.get("degrees")),
        term=_optional_str(item.get("term")),
        instructors=_string_tuple(item.get("instructors")),
        tags=_string_tuple(item.get("tags")),
        metadata=item.get("metadata") if isinstance(item.get("metadata"), dict) else {},
    )


def _optional_str(value: object) -> str | None:
    return str(value) if value else None


def _string_tuple(value: object) -> tuple[str, ...]:
    if not isinstance(value, (list, tuple)):
        return ()
    return tuple(str(item) for item in value if item)

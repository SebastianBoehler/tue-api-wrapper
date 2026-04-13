from __future__ import annotations

from dataclasses import asdict, is_dataclass
from datetime import date, datetime
from typing import Any

from .talks_client import TalksClient

talks_client = TalksClient()


def _serialize(value: Any) -> Any:
    if is_dataclass(value):
        return {key: _serialize(item) for key, item in asdict(value).items()}
    if isinstance(value, dict):
        return {str(key): _serialize(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_serialize(item) for item in value]
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


def build_talks_panel(*, limit: int) -> dict[str, Any]:
    try:
        talks = talks_client.fetch_talks(limit=limit)
    except Exception as error:
        return {
            "available": False,
            "sourceUrl": "https://talks.tuebingen.ai/talks",
            "totalHits": 0,
            "items": [],
            "error": str(error),
        }

    return {
        "available": True,
        "sourceUrl": talks.source_url,
        "totalHits": talks.total_hits,
        "items": _serialize(talks.items),
        "error": None,
    }

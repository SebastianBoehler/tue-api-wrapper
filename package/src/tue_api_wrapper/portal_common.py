from __future__ import annotations

from dataclasses import asdict, is_dataclass
from datetime import date, datetime
from typing import Any

DEFAULT_DASHBOARD_TERM = "Sommer 2026"
RELATIVE_DASHBOARD_TERMS = {
    "",
    "aktuell",
    "aktuelles semester",
    "current",
    "current semester",
    "current term",
    "default",
    "dieses semester",
    "this semester",
    "this term",
}


def normalize_dashboard_term(term_label: str | None = None) -> str:
    raw = (term_label or "").strip()
    key = " ".join(raw.casefold().replace("_", " ").replace("-", " ").split())
    return DEFAULT_DASHBOARD_TERM if key in RELATIVE_DASHBOARD_TERMS else raw


def serialize(value: Any) -> Any:
    if is_dataclass(value):
        return {key: serialize(item) for key, item in asdict(value).items()}
    if isinstance(value, dict):
        return {str(key): serialize(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [serialize(item) for item in value]
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value

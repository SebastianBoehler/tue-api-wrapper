from __future__ import annotations

from dataclasses import dataclass
import re

from .models import AlmaModuleDetail, CalendarOccurrence

_CREDIT_PATTERN = re.compile(r"(?<!\d)(\d{1,2}(?:[,.]\d{1,2})?)\s*(?:CP|LP|ECTS)\b", re.IGNORECASE)
_PRIORITY_LABELS = {"cp", "ects", "kurzkommentar", "leistungspunkte", "lp"}


@dataclass(frozen=True)
class AlmaCourseCredit:
    value: float
    source: str


def extract_detail_credits(detail: AlmaModuleDetail | None) -> AlmaCourseCredit | None:
    if detail is None:
        return None

    fields = [
        (section.title, field.label, field.value)
        for section in detail.sections
        for field in section.fields
    ]
    for section_title, label, value in fields:
        if _normalize_label(label) in _PRIORITY_LABELS:
            credits = _parse_credit_value(value, allow_plain_number=True)
            if credits is not None:
                return AlmaCourseCredit(credits, f"{section_title}: {label}")

    for section_title, label, value in fields:
        credits = _parse_credit_value(value)
        if credits is not None:
            return AlmaCourseCredit(credits, f"{section_title}: {label}")

    return None


def extract_occurrence_credits(occurrences: list[CalendarOccurrence]) -> AlmaCourseCredit | None:
    for occurrence in occurrences:
        credits = _parse_credit_value(occurrence.description or "")
        if credits is not None:
            return AlmaCourseCredit(credits, "Alma timetable description")
    return None


def _parse_credit_value(value: str, *, allow_plain_number: bool = False) -> float | None:
    match = _CREDIT_PATTERN.search(value)
    if match is not None:
        return float(match.group(1).replace(",", "."))
    if allow_plain_number:
        plain_match = re.match(r"^\s*(\d{1,2}(?:[,.]\d{1,2})?)\s*$", value)
        if plain_match is not None:
            return float(plain_match.group(1).replace(",", "."))
    return None


def _normalize_label(value: str) -> str:
    return re.sub(r"[^a-z]+", "", value.casefold())

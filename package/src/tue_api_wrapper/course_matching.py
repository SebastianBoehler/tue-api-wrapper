from __future__ import annotations

from dataclasses import dataclass
import re
import unicodedata

from .course_identifier import extract_course_identifiers, normalize_course_identifier
from .models import AlmaModuleDetail

STOPWORDS = {"and", "das", "der", "die", "ein", "eine", "for", "mit", "the", "und", "von"}


@dataclass(frozen=True)
class CourseMatchScore:
    score: int
    reasons: tuple[str, ...]
    matched_identifier: str | None

    @property
    def reason_text(self) -> str:
        return ", ".join(self.reasons)


def score_course_candidate(
    detail: AlmaModuleDetail,
    *,
    title: str,
    text_parts: tuple[str, ...] = (),
    query: str | None = None,
) -> CourseMatchScore:
    haystack = normalize_text(" ".join((title, *text_parts)))
    detail_title = normalize_text(detail.title)
    detail_identifiers = extract_course_identifiers(detail.number or "", detail.title)
    normalized_identifiers = tuple(normalize_course_identifier(identifier) for identifier in detail_identifiers)
    identifier_text = normalize_course_identifier(haystack)
    score = 0
    reasons: list[str] = []
    matched_identifier = None

    if match := next((identifier for identifier in normalized_identifiers if identifier and identifier in identifier_text), None):
        score += 100
        matched_identifier = next(
            identifier for identifier in detail_identifiers if normalize_course_identifier(identifier) == match
        )
        reasons.append(f"shared Alma number {matched_identifier}")

    result_title = normalize_text(title)
    if detail_title and detail_title == result_title:
        score += 80
        reasons.append("same title")
    elif detail_title and detail_title in haystack:
        score += 55
        reasons.append("title appears in portal item")

    overlap = sorted(tokens(detail_title) & tokens(haystack))
    if overlap:
        score += min(30, len(overlap) * 6)
        if not reasons:
            reasons.append("title word overlap")

    if not reasons and query:
        reasons.append(f"matched search query '{query}'")
    return CourseMatchScore(score=score, reasons=tuple(reasons), matched_identifier=matched_identifier)


def dedupe_query_specs(specs: list[tuple[str, str]]) -> tuple[tuple[str, str], ...]:
    unique: dict[str, tuple[str, str]] = {}
    for query, reason in specs:
        normalized = normalize_text(query)
        if normalized and normalized not in unique:
            unique[normalized] = (query, reason)
    return tuple(unique.values())


def normalize_text(value: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", value).casefold().split())


def tokens(value: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[\wäöüß]+", value.casefold())
        if len(token) >= 4 and token not in STOPWORDS
    }

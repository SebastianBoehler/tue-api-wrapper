from __future__ import annotations

import re
import unicodedata
from typing import TYPE_CHECKING

from .alma_course_search_client import search_courses
from .alma_course_search_models import AlmaCourseSearchResult
from .alma_detail_client import fetch_public_module_detail
from .config import AlmaError, AlmaParseError
from .course_detail_models import (
    CourseDetailLookupQuery,
    CourseRegistrationHint,
    RelatedIliasResult,
    UnifiedCourseDetail,
)
from .ilias_feature_client import search_ilias
from .ilias_feature_models import IliasSearchResult
from .models import AlmaModuleDetail

if TYPE_CHECKING:
    from .client import AlmaClient
    from .ilias_client import IliasClient


REGISTRATION_SIGNAL_RE = re.compile(
    r"\b(ilias|anmeld\w*|registr\w*|einschreib\w*|beleg\w*|enrol\w*|sign\s*up)\b",
    re.IGNORECASE,
)
STOPWORDS = {
    "and",
    "das",
    "der",
    "die",
    "ein",
    "eine",
    "for",
    "mit",
    "the",
    "und",
    "von",
}


def resolve_alma_course_detail(
    detail_client: "AlmaClient",
    *,
    detail_url: str = "",
    title: str = "",
    term: str | None = None,
    search_client: "AlmaClient | None" = None,
) -> AlmaModuleDetail:
    normalized_url = detail_url.strip()
    if normalized_url:
        return fetch_public_module_detail(detail_client, normalized_url)

    normalized_title = title.strip()
    if not normalized_title:
        raise AlmaParseError("A non-empty Alma detail URL or course title is required.")
    if search_client is None:
        raise AlmaParseError("Resolving a course by title requires an authenticated Alma client.")

    page = search_courses(search_client, query=normalized_title, term=term, limit=12)
    candidates = tuple(result for result in page.results if result.detail_url)
    exact_matches = tuple(
        result
        for result in candidates
        if _normalize_text(result.title) == _normalize_text(normalized_title)
    )
    selected = _single_or_none(exact_matches) or _single_or_none(candidates)
    if selected is None:
        if candidates:
            raise AlmaParseError(
                f"Multiple Alma detail pages matched '{normalized_title}'. Pass a concrete detail URL."
            )
        raise AlmaParseError(f"No Alma detail page matched '{normalized_title}'.")

    return fetch_public_module_detail(detail_client, selected.detail_url or "")


def build_unified_course_detail(
    detail: AlmaModuleDetail,
    *,
    ilias_client: "IliasClient | None" = None,
    ilias_error: str | None = None,
    ilias_limit: int = 8,
) -> UnifiedCourseDetail:
    lookup_queries: list[CourseDetailLookupQuery] = []
    related: dict[str, RelatedIliasResult] = {}
    query_specs = _build_ilias_query_specs(detail)

    if ilias_client is None:
        if query_specs or ilias_error:
            lookup_queries.append(
                CourseDetailLookupQuery(
                    portal="ilias",
                    query=query_specs[0][0] if query_specs else detail.title,
                    reason="related course lookup",
                    result_count=0,
                    error=ilias_error or "ILIAS lookup was not available.",
                )
            )
    else:
        for query, reason in query_specs:
            try:
                page = search_ilias(ilias_client, term=query)
            except AlmaError as error:
                lookup_queries.append(
                    CourseDetailLookupQuery(
                        portal="ilias",
                        query=query,
                        reason=reason,
                        result_count=0,
                        error=str(error),
                    )
                )
                continue

            lookup_queries.append(
                CourseDetailLookupQuery(
                    portal="ilias",
                    query=query,
                    reason=reason,
                    result_count=len(page.results),
                )
            )
            for result in page.results:
                scored = _score_ilias_result(detail, result, query)
                key = _dedupe_key(result)
                current = related.get(key)
                if current is None or scored.score > current.score:
                    related[key] = scored

    ranked = tuple(
        sorted(related.values(), key=lambda item: (-item.score, item.result.title.casefold()))[
            : max(1, ilias_limit)
        ]
    )
    return UnifiedCourseDetail(
        alma=detail,
        ilias_results=ranked,
        lookup_queries=tuple(lookup_queries),
        registration_hints=_extract_registration_hints(detail),
        ilias_error=ilias_error,
    )


def _build_ilias_query_specs(detail: AlmaModuleDetail) -> tuple[tuple[str, str], ...]:
    specs: list[tuple[str, str]] = []
    if detail.number and len(_normalize_identifier(detail.number)) >= 3:
        specs.append((detail.number, "Alma module or event number"))
    if detail.title:
        specs.append((detail.title, "Alma title"))

    unique: dict[str, tuple[str, str]] = {}
    for query, reason in specs:
        normalized = _normalize_text(query)
        if normalized and normalized not in unique:
            unique[normalized] = (query, reason)
    return tuple(unique.values())


def _score_ilias_result(
    detail: AlmaModuleDetail,
    result: IliasSearchResult,
    query: str,
) -> RelatedIliasResult:
    haystack = _normalize_text(
        " ".join(
            (
                result.title,
                result.description or "",
                " ".join(result.breadcrumbs),
                " ".join(result.properties),
                result.item_type or "",
            )
        )
    )
    title = _normalize_text(detail.title)
    number = detail.number or ""
    normalized_number = _normalize_identifier(number)
    identifier_text = _normalize_identifier(haystack)
    score = 0
    reasons: list[str] = []
    matched_identifier = None

    if normalized_number and normalized_number in identifier_text:
        score += 100
        matched_identifier = number
        reasons.append(f"shared Alma number {number}")

    result_title = _normalize_text(result.title)
    if title and title == result_title:
        score += 80
        reasons.append("same title")
    elif title and title in haystack:
        score += 55
        reasons.append("title appears in ILIAS")

    overlap = sorted(_tokens(title) & _tokens(haystack))
    if overlap:
        score += min(30, len(overlap) * 6)
        if not reasons:
            reasons.append("title word overlap")

    if not reasons:
        reasons.append(f"matched search query '{query}'")

    return RelatedIliasResult(
        result=result,
        match_query=query,
        match_reason=", ".join(reasons),
        score=score,
        matched_identifier=matched_identifier,
    )


def _extract_registration_hints(detail: AlmaModuleDetail) -> tuple[CourseRegistrationHint, ...]:
    hints: list[CourseRegistrationHint] = []
    seen: set[tuple[str, str]] = set()
    for section in detail.sections:
        for field in section.fields:
            if not REGISTRATION_SIGNAL_RE.search(field.value):
                continue
            label = f"{section.title} / {field.label}"
            key = (label, field.value)
            if key in seen:
                continue
            seen.add(key)
            hints.append(CourseRegistrationHint(source="alma", label=label, text=field.value))
    return tuple(hints[:6])


def _single_or_none(results: tuple[AlmaCourseSearchResult, ...]) -> AlmaCourseSearchResult | None:
    return results[0] if len(results) == 1 else None


def _dedupe_key(result: IliasSearchResult) -> str:
    return result.info_url or result.url or "::".join((result.title, *result.breadcrumbs))


def _normalize_text(value: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", value).casefold().split())


def _normalize_identifier(value: str) -> str:
    return "".join(character for character in _normalize_text(value) if character.isalnum())


def _tokens(value: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[\wäöüß]+", value.casefold())
        if len(token) >= 4 and token not in STOPWORDS
    }

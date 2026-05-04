from __future__ import annotations

import re
from typing import TYPE_CHECKING

from .alma_course_search_client import search_courses
from .alma_course_search_matching import select_course_search_result
from .alma_course_search_models import AlmaCourseSearchResult
from .alma_detail_client import fetch_public_module_detail
from .config import AlmaError, AlmaParseError
from .course_identifier import extract_course_identifiers, identifier_search_terms
from .course_matching import dedupe_query_specs, normalize_text, score_course_candidate
from .course_detail_models import (
    CourseDetailLookupQuery,
    CourseRegistrationHint,
    RelatedIliasResult,
    UnifiedCourseDetail,
)
from .course_portal_status import build_course_portal_statuses
from .ilias_feature_client import search_ilias
from .ilias_feature_models import IliasSearchResult
from .models import AlmaModuleDetail

if TYPE_CHECKING:
    from .client import AlmaClient
    from .ilias_client import IliasClient
    from .moodle_client import MoodleClient


REGISTRATION_SIGNAL_RE = re.compile(
    r"\b(ilias|anmeld\w*|registr\w*|einschreib\w*|beleg\w*|enrol\w*|sign\s*up)\b",
    re.IGNORECASE,
)
ILIAS_COURSE_CONTENT_TYPES = ("crs", "grp", "cat")
COURSE_CODE_PREFIX_RE = re.compile(r"^(?P<number>[A-ZÄÖÜ]{2,12}[-\s]?\d{2,5}[A-Z]?)\s+(?P<title>.+)$")


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

    number, title = _split_lookup_title(normalized_title)
    selected = None
    candidates: tuple[AlmaCourseSearchResult, ...] = ()
    for query in _alma_lookup_queries(number, title):
        page = search_courses(search_client, query=query, term=term, limit=30)
        candidates = tuple(result for result in page.results if result.detail_url)
        selected = select_course_search_result(candidates, number=number, title=title)
        if selected is not None:
            break
    if selected is None:
        if candidates:
            raise AlmaParseError(
                f"Multiple Alma detail pages matched '{normalized_title}'. Pass a concrete detail URL."
            )
        raise AlmaParseError(f"No Alma detail page matched '{normalized_title}'.")

    return fetch_public_module_detail(detail_client, selected.detail_url or "")


def _split_lookup_title(value: str) -> tuple[str | None, str]:
    match = COURSE_CODE_PREFIX_RE.match(value)
    if match is None:
        identifiers = extract_course_identifiers(value)
        return (identifiers[0], value) if identifiers else (None, value)
    return match.group("number"), match.group("title")


def _alma_lookup_queries(number: str | None, title: str) -> tuple[str, ...]:
    specs: list[tuple[str, str]] = []
    if number:
        specs.extend((term, "Alma course number") for term in identifier_search_terms(number))
    if title:
        specs.append((title, "Alma title"))
    return tuple(query for query, _ in dedupe_query_specs(specs))


def build_unified_course_detail(
    detail: AlmaModuleDetail,
    *,
    ilias_client: "IliasClient | None" = None,
    ilias_error: str | None = None,
    ilias_limit: int = 8,
    alma_client: "AlmaClient | None" = None,
    alma_error: str | None = None,
    moodle_client: "MoodleClient | None" = None,
    moodle_error: str | None = None,
) -> UnifiedCourseDetail:
    lookup_queries: list[CourseDetailLookupQuery] = []
    related: dict[str, RelatedIliasResult] = {}
    identifier_specs = _build_identifier_query_specs(detail)
    title_specs = _build_title_query_specs(detail)

    if ilias_client is None:
        if identifier_specs or title_specs or ilias_error:
            lookup_queries.append(
                CourseDetailLookupQuery(
                    portal="ilias",
                    query=(identifier_specs or title_specs)[0][0] if (identifier_specs or title_specs) else detail.title,
                    reason="related course lookup",
                    result_count=0,
                    error=ilias_error or "ILIAS lookup was not available.",
                )
            )
    else:
        identifier_matched = False
        for query, reason in identifier_specs:
            identifier_matched = _collect_ilias_query(
                detail,
                ilias_client,
                query=query,
                reason=reason,
                lookup_queries=lookup_queries,
                related=related,
            )
            if identifier_matched:
                break

        if not identifier_matched:
            for query, reason in title_specs:
                _collect_ilias_query(
                    detail,
                    ilias_client,
                    query=query,
                    reason=reason,
                    lookup_queries=lookup_queries,
                    related=related,
                )

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
        portal_statuses=build_course_portal_statuses(
            detail,
            alma_client=alma_client,
            alma_error=alma_error,
            ilias_client=ilias_client,
            ilias_error=ilias_error,
            ilias_results=ranked,
            moodle_client=moodle_client,
            moodle_error=moodle_error,
        ),
        ilias_error=ilias_error,
    )


def _collect_ilias_query(
    detail: AlmaModuleDetail,
    ilias_client: "IliasClient",
    *,
    query: str,
    reason: str,
    lookup_queries: list[CourseDetailLookupQuery],
    related: dict[str, RelatedIliasResult],
) -> bool:
    try:
        page = search_ilias(ilias_client, term=query, content_types=ILIAS_COURSE_CONTENT_TYPES)
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
        return False

    lookup_queries.append(
        CourseDetailLookupQuery(
            portal="ilias",
            query=query,
            reason=reason,
            result_count=len(page.results),
        )
    )
    identifier_matched = False
    for result in page.results:
        scored = _score_ilias_result(detail, result, query)
        identifier_matched = identifier_matched or scored.matched_identifier is not None
        key = _dedupe_key(result)
        current = related.get(key)
        if current is None or scored.score > current.score:
            related[key] = scored
    return identifier_matched


def _build_identifier_query_specs(detail: AlmaModuleDetail) -> tuple[tuple[str, str], ...]:
    specs: list[tuple[str, str]] = []
    identifiers = extract_course_identifiers(detail.number, detail.title)
    for identifier in identifiers:
        for term in identifier_search_terms(identifier):
            specs.append((term, "Alma module or event number"))
    return dedupe_query_specs(specs)


def _build_title_query_specs(detail: AlmaModuleDetail) -> tuple[tuple[str, str], ...]:
    return dedupe_query_specs([(detail.title, "Alma title")] if detail.title else [])


def _score_ilias_result(
    detail: AlmaModuleDetail,
    result: IliasSearchResult,
    query: str,
) -> RelatedIliasResult:
    match = score_course_candidate(
        detail,
        title=result.title,
        text_parts=(
            result.description or "",
            " ".join(result.breadcrumbs),
            " ".join(result.properties),
            result.item_type or "",
        ),
        query=query,
    )

    return RelatedIliasResult(
        result=result,
        match_query=query,
        match_reason=match.reason_text,
        score=match.score,
        matched_identifier=match.matched_identifier,
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


def _dedupe_key(result: IliasSearchResult) -> str:
    return result.info_url or result.url or "::".join((result.title, *result.breadcrumbs))

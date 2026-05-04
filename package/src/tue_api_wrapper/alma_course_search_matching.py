from __future__ import annotations

from .alma_course_search_models import AlmaCourseSearchResult
from .course_identifier import extract_course_identifiers, normalize_course_identifier
from .course_matching import normalize_text, tokens


def select_course_search_result(
    results: tuple[AlmaCourseSearchResult, ...],
    *,
    number: str | None,
    title: str,
) -> AlmaCourseSearchResult | None:
    candidates = tuple(result for result in results if result.detail_url)
    if not candidates:
        return None
    if len(candidates) == 1:
        return candidates[0]

    scored = tuple(
        sorted(
            ((_candidate_score(result, number=number, title=title), index, result) for index, result in enumerate(candidates)),
            key=lambda item: (-item[0], item[1]),
        )
    )
    best_score, _, best = scored[0]
    if best_score <= 0:
        return None
    tied = [result for score, _, result in scored if score == best_score]
    tied_urls = {result.detail_url for result in tied}
    if len(tied_urls) == 1:
        return tied[0]
    return best if best_score >= 80 else None


def _candidate_score(result: AlmaCourseSearchResult, *, number: str | None, title: str) -> int:
    wanted_number = _normalized_number(number)
    wanted_title = _normalized_title(title, number=number)
    result_number = _normalized_number(result.number)
    result_title = normalize_text(result.title)
    score = 0

    if wanted_number and result_number == wanted_number:
        score += 100
    elif wanted_number and wanted_number in _normalized_number(result.title):
        score += 70

    if wanted_title and result_title == wanted_title:
        score += 80
    elif wanted_title and (wanted_title in result_title or result_title in wanted_title):
        score += 55

    overlap = tokens(wanted_title) & tokens(result_title)
    if overlap:
        score += min(30, len(overlap) * 6)
    return score


def _normalized_number(value: str | None) -> str:
    identifiers = extract_course_identifiers(value)
    return normalize_course_identifier(identifiers[0]) if identifiers else normalize_course_identifier(value or "")


def _normalized_title(value: str, *, number: str | None) -> str:
    normalized = normalize_text(value)
    if not number:
        return normalized
    code = normalize_text(number)
    return normalize_text(normalized.removeprefix(code).strip()) or normalized

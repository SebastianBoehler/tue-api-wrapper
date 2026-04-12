from __future__ import annotations

from collections import defaultdict
import re

from .alma_course_assignments_models import (
    AlmaTimetableCourseAssignment,
    AlmaTimetableCourseAssignmentsPage,
    AlmaTimetableCourseSlot,
)
from .alma_course_search_client import search_courses
from .alma_course_search_models import AlmaCourseSearchResult
from .client import AlmaClient
from .config import AlmaError
from .models import CalendarOccurrence

_COURSE_CODE_PATTERN = re.compile(r"^(?P<number>[A-ZÄÖÜ]+[A-ZÄÖÜ0-9-]*\d+[a-z]?|GTCNEURO)\s+(?P<title>.+)$")


def fetch_timetable_course_assignments(
    client: AlmaClient,
    *,
    term: str,
    limit: int | None = None,
) -> AlmaTimetableCourseAssignmentsPage:
    timetable = client.fetch_timetable_for_term(term)
    grouped: dict[str, list[CalendarOccurrence]] = defaultdict(list)
    for occurrence in timetable.occurrences:
        grouped[occurrence.summary].append(occurrence)

    course_search_term = _resolve_course_search_term(client, timetable.term_label)
    assignments: list[AlmaTimetableCourseAssignment] = []
    for summary in sorted(grouped):
        if limit is not None and len(assignments) >= max(1, limit):
            break
        assignments.append(_fetch_course_assignment(client, summary, grouped[summary], course_search_term))

    return AlmaTimetableCourseAssignmentsPage(
        term_label=timetable.term_label,
        term_id=timetable.term_id,
        courses=tuple(assignments),
    )


def _fetch_course_assignment(
    client: AlmaClient,
    summary: str,
    occurrences: list[CalendarOccurrence],
    course_search_term: str | None,
) -> AlmaTimetableCourseAssignment:
    number, title = _split_summary(summary)
    result: AlmaCourseSearchResult | None = None
    detail = None
    error = None
    try:
        page = search_courses(client, query=_search_query(number, title), term=course_search_term, limit=30)
        result = _select_result(page.results, number=number, title=title)
        if result is None or not result.detail_url:
            raise ValueError(f"No Alma course-search result matched '{summary}'.")
        detail = client.fetch_public_module_detail(result.detail_url)
    except (AlmaError, ValueError) as exc:
        error = str(exc)

    return AlmaTimetableCourseAssignment(
        summary=summary,
        occurrence_count=len(occurrences),
        slots=_slots_for_occurrences(occurrences),
        number=result.number if result is not None else number,
        title=result.title if result is not None else title,
        event_type=result.event_type if result is not None else None,
        organization=result.organization if result is not None else None,
        detail_url=result.detail_url if result is not None else None,
        detail=detail,
        error=error,
    )


def _split_summary(summary: str) -> tuple[str | None, str]:
    match = _COURSE_CODE_PATTERN.match(summary.strip())
    if match is None:
        return None, summary.strip()
    return match.group("number"), match.group("title")


def _search_query(number: str | None, title: str) -> str:
    if number and number != "GTCNEURO":
        return number
    return title.split("+", 1)[0].strip()


def _resolve_course_search_term(client: AlmaClient, term_label: str) -> str | None:
    page = search_courses(client, query="", limit=1)
    wanted = _normalize_term(term_label)
    for option in page.term_options:
        if _normalize_term(option.label) == wanted:
            return option.value
    return None


def _normalize_term(label: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", label.casefold().replace("semester", ""))


def _normalize(value: str | None) -> str:
    return re.sub(r"[^a-z0-9]+", "", (value or "").casefold())


def _select_result(
    results: tuple[AlmaCourseSearchResult, ...],
    *,
    number: str | None,
    title: str,
) -> AlmaCourseSearchResult | None:
    title_key = _normalize(title)
    number_key = _normalize(number)
    for result in results:
        result_title = _normalize(result.title)
        if number_key and _normalize(result.number) == number_key and (title_key in result_title or result_title in title_key):
            return result
    for result in results:
        result_title = _normalize(result.title)
        if title_key in result_title or result_title in title_key:
            return result
    return results[0] if len(results) == 1 else None


def _slots_for_occurrences(occurrences: list[CalendarOccurrence]) -> tuple[AlmaTimetableCourseSlot, ...]:
    slots = {
        (
            occurrence.start.weekday(),
            occurrence.start.strftime("%A"),
            occurrence.start.strftime("%H:%M"),
            occurrence.end.strftime("%H:%M") if occurrence.end is not None else None,
            occurrence.location,
        )
        for occurrence in occurrences
    }
    return tuple(
        AlmaTimetableCourseSlot(
            weekday=weekday,
            weekday_label=weekday_label,
            start_time=start_time,
            end_time=end_time,
            location=location,
        )
        for weekday, weekday_label, start_time, end_time, location in sorted(slots)
    )

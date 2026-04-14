from __future__ import annotations

from typing import TYPE_CHECKING, TypeVar

from .alma_course_registration_client import inspect_course_registration_support
from .config import AlmaError
from .course_detail_models import CoursePortalStatus, RelatedIliasResult
from .course_matching import score_course_candidate
from .models import AlmaModuleDetail, IliasMembershipItem
from .moodle_models import MoodleCourseSummary

if TYPE_CHECKING:
    from .client import AlmaClient
    from .ilias_client import IliasClient
    from .moodle_client import MoodleClient


MIN_PORTAL_MATCH_SCORE = 30
T = TypeVar("T")


def build_course_portal_statuses(
    detail: AlmaModuleDetail,
    *,
    alma_client: "AlmaClient | None" = None,
    alma_error: str | None = None,
    ilias_client: "IliasClient | None" = None,
    ilias_error: str | None = None,
    ilias_results: tuple[RelatedIliasResult, ...] = (),
    moodle_client: "MoodleClient | None" = None,
    moodle_error: str | None = None,
) -> tuple[CoursePortalStatus, ...]:
    return (
        _alma_status(detail, alma_client=alma_client, alma_error=alma_error),
        _ilias_status(detail, ilias_client=ilias_client, ilias_error=ilias_error, ilias_results=ilias_results),
        _moodle_status(detail, moodle_client=moodle_client, moodle_error=moodle_error),
    )


def _alma_status(
    detail: AlmaModuleDetail,
    *,
    alma_client: "AlmaClient | None",
    alma_error: str | None,
) -> CoursePortalStatus:
    detail_url = detail.permalink or detail.source_url
    if alma_client is None:
        return _error_status("alma", alma_error or "Alma registration lookup was not available.")

    try:
        support = inspect_course_registration_support(alma_client, detail_url)
    except AlmaError as error:
        return _error_status("alma", str(error))

    title = support.title or detail.title
    if support.status == "registered":
        return CoursePortalStatus(
            portal="alma",
            status="registered",
            signed_up=True,
            title=title,
            url=support.detail_url,
            match_reason="authenticated Alma registration status",
            score=100,
            message="Alma reports an active course registration.",
        )
    if support.status == "not_registered":
        return CoursePortalStatus(
            portal="alma",
            status="not_registered",
            signed_up=False,
            title=title,
            url=support.detail_url,
            match_reason="authenticated Alma registration status",
            score=100,
            message="Alma reports that you are not registered for this course.",
        )

    status = "registration_available" if support.supported else "unknown"
    message = (
        "Alma exposes a registration action, but no signed-up marker was detected."
        if support.supported
        else support.message
    )
    return CoursePortalStatus(
        portal="alma",
        status=status,
        signed_up=None,
        title=title,
        url=support.detail_url,
        match_reason="authenticated Alma detail page",
        score=None,
        message=message,
    )


def _ilias_status(
    detail: AlmaModuleDetail,
    *,
    ilias_client: "IliasClient | None",
    ilias_error: str | None,
    ilias_results: tuple[RelatedIliasResult, ...],
) -> CoursePortalStatus:
    if ilias_client is None:
        return _error_status("ilias", ilias_error or "ILIAS membership lookup was not available.")

    try:
        memberships = ilias_client.fetch_membership_overview()
    except AlmaError as error:
        return _error_status("ilias", str(error))

    url_match = _membership_url_match(memberships, ilias_results)
    best = url_match or _best_ilias_membership_match(detail, memberships)
    if best is not None:
        membership, score, reason = best
        return CoursePortalStatus(
            portal="ilias",
            status="joined",
            signed_up=True,
            title=membership.title,
            url=membership.url,
            match_reason=reason,
            score=score,
            message="This course appears in your ILIAS memberships.",
        )

    if ilias_results:
        result = ilias_results[0]
        return CoursePortalStatus(
            portal="ilias",
            status="found_not_joined",
            signed_up=False,
            title=result.result.title,
            url=result.result.url or result.result.info_url,
            match_reason=result.match_reason,
            score=result.score,
            message="A related ILIAS space was found, but it is not in your memberships.",
        )

    return CoursePortalStatus(
        portal="ilias",
        status="not_found",
        signed_up=False,
        title=None,
        url=None,
        match_reason=None,
        score=None,
        message="No matching ILIAS membership or learning space was found.",
    )


def _moodle_status(
    detail: AlmaModuleDetail,
    *,
    moodle_client: "MoodleClient | None",
    moodle_error: str | None,
) -> CoursePortalStatus:
    if moodle_client is None:
        return _error_status("moodle", moodle_error or "Moodle enrolled-course lookup was not available.")

    try:
        courses = _fetch_moodle_courses(moodle_client)
    except AlmaError as error:
        return _error_status("moodle", str(error))

    best = _best_moodle_match(detail, courses)
    if best is None:
        return CoursePortalStatus(
            portal="moodle",
            status="not_found",
            signed_up=False,
            title=None,
            url=None,
            match_reason=None,
            score=None,
            message="No matching enrolled Moodle course was found.",
        )

    course, score, reason = best
    return CoursePortalStatus(
        portal="moodle",
        status="enrolled",
        signed_up=True,
        title=course.title,
        url=course.url,
        match_reason=reason,
        score=score,
        message="This course appears in your enrolled Moodle courses.",
    )


def _fetch_moodle_courses(moodle_client: "MoodleClient") -> tuple[MoodleCourseSummary, ...]:
    courses: list[MoodleCourseSummary] = []
    offset = 0
    for _ in range(3):
        page = moodle_client.fetch_enrolled_courses(limit=100, offset=offset)
        courses.extend(page.items)
        if page.next_offset is None or page.next_offset <= offset:
            break
        offset = page.next_offset
    return tuple(courses)


def _best_ilias_membership_match(
    detail: AlmaModuleDetail,
    memberships: tuple[IliasMembershipItem, ...],
) -> tuple[IliasMembershipItem, int, str] | None:
    ranked: list[tuple[IliasMembershipItem, int, str]] = []
    for membership in memberships:
        score = score_course_candidate(
            detail,
            title=membership.title,
            text_parts=(membership.description or "", " ".join(membership.properties), membership.kind or ""),
        )
        if score.score >= MIN_PORTAL_MATCH_SCORE:
            ranked.append((membership, score.score, score.reason_text))
    return _first_ranked(ranked)


def _best_moodle_match(
    detail: AlmaModuleDetail,
    courses: tuple[MoodleCourseSummary, ...],
) -> tuple[MoodleCourseSummary, int, str] | None:
    ranked: list[tuple[MoodleCourseSummary, int, str]] = []
    for course in courses:
        score = score_course_candidate(
            detail,
            title=course.title,
            text_parts=(course.shortname or "", course.category_name or "", course.summary or ""),
        )
        if score.score >= MIN_PORTAL_MATCH_SCORE:
            ranked.append((course, score.score, score.reason_text))
    return _first_ranked(ranked)


def _membership_url_match(
    memberships: tuple[IliasMembershipItem, ...],
    related: tuple[RelatedIliasResult, ...],
) -> tuple[IliasMembershipItem, int, str] | None:
    related_urls = {url for result in related for url in (result.result.url, result.result.info_url) if url}
    for membership in memberships:
        if membership.url in related_urls or (membership.info_url and membership.info_url in related_urls):
            return membership, 120, "same ILIAS space URL"
    return None


def _first_ranked(items: list[tuple[T, int, str]]) -> tuple[T, int, str] | None:
    if not items:
        return None
    return sorted(items, key=lambda item: (-item[1], getattr(item[0], "title", "").casefold()))[0]


def _error_status(portal: str, error: str) -> CoursePortalStatus:
    return CoursePortalStatus(
        portal=portal,
        status="error",
        signed_up=None,
        title=None,
        url=None,
        match_reason=None,
        score=None,
        error=error,
        message=None,
    )

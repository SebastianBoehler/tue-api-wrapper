from __future__ import annotations

from fastapi import APIRouter, Query

from .alma_course_search_client import search_courses
from .alma_feature_client import fetch_current_lectures
from .alma_planner_client import fetch_study_planner
from .config import AlmaError
from .ilias_feature_client import fetch_ilias_info_page, fetch_ilias_search_filters, search_ilias
from .portal_service import PortalService, serialize

router = APIRouter()
portal_service = PortalService()


def _alma_client():
    return portal_service._alma_client()


def _ilias_client():
    return portal_service._ilias_client()


def _translate_error(error: AlmaError):
    from fastapi import HTTPException

    return HTTPException(status_code=400, detail=str(error))


@router.get("/api/alma/current-lectures")
def alma_current_lectures(date: str = "", limit: int = Query(50, ge=1, le=200)) -> dict[str, object]:
    try:
        page = fetch_current_lectures(
            _alma_client(),
            date=date.strip() or None,
            limit=limit,
        )
        return serialize(page)
    except AlmaError as error:
        raise _translate_error(error) from error


@router.get("/api/alma/study-planner")
def alma_study_planner() -> dict[str, object]:
    try:
        return serialize(fetch_study_planner(_alma_client()))
    except AlmaError as error:
        raise _translate_error(error) from error


@router.get("/api/alma/course-search")
def alma_course_search(
    query: str = "",
    term: str = "",
    limit: int = Query(20, ge=1, le=100),
) -> dict[str, object]:
    try:
        return serialize(search_courses(_alma_client(), query=query, term=term.strip() or None, limit=limit))
    except AlmaError as error:
        raise _translate_error(error) from error


@router.get("/api/ilias/search")
def ilias_search(
    term: str,
    page: int = Query(1, ge=1, le=50),
    search_mode: str = "",
    content_type: list[str] = Query(default=[]),
    created_enabled: bool = False,
    created_mode: str = "",
    created_date: str = "",
) -> dict[str, object]:
    try:
        return serialize(
            search_ilias(
                _ilias_client(),
                term=term,
                page=page,
                search_mode=search_mode.strip() or None,
                content_types=tuple(content_type),
                created_enabled=created_enabled,
                created_mode=created_mode.strip() or None,
                created_date=created_date.strip() or None,
            )
        )
    except AlmaError as error:
        raise _translate_error(error) from error


@router.get("/api/ilias/search/options")
def ilias_search_options() -> dict[str, object]:
    try:
        return serialize(fetch_ilias_search_filters(_ilias_client()))
    except AlmaError as error:
        raise _translate_error(error) from error


@router.get("/api/ilias/info")
def ilias_info(target: str) -> dict[str, object]:
    try:
        return serialize(fetch_ilias_info_page(_ilias_client(), target=target))
    except AlmaError as error:
        raise _translate_error(error) from error

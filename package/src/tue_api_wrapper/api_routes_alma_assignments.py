from __future__ import annotations

from fastapi import APIRouter, Query

from .alma_course_assignments_client import fetch_timetable_course_assignments
from .api_errors import translate_alma_error
from .config import AlmaError
from .portal_service import DEFAULT_DASHBOARD_TERM, PortalService, serialize

router = APIRouter()
portal_service = PortalService()


def _alma_client():
    return portal_service._alma_client()


def _translate_error(error: AlmaError):
    return translate_alma_error(error)


@router.get("/api/alma/timetable/course-assignments")
def alma_timetable_course_assignments(
    term: str = Query(DEFAULT_DASHBOARD_TERM),
    limit: int = Query(50, ge=1, le=100),
) -> dict[str, object]:
    try:
        return serialize(fetch_timetable_course_assignments(_alma_client(), term=term, limit=limit))
    except AlmaError as error:
        raise _translate_error(error) from error

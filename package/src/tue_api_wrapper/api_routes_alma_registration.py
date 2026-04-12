from __future__ import annotations

from fastapi import APIRouter, Query

from .alma_course_registration_client import (
    inspect_course_registration_support,
    prepare_course_registration,
    register_for_course,
)
from .config import AlmaError
from .portal_service import PortalService, serialize

router = APIRouter()
portal_service = PortalService()


def _alma_client():
    return portal_service._alma_client()


def _translate_error(error: AlmaError):
    from fastapi import HTTPException

    return HTTPException(status_code=400, detail=str(error))


@router.get("/api/alma/course-registration/support")
def alma_course_registration_support(url: str = Query(..., min_length=1)) -> dict[str, object]:
    try:
        return serialize(inspect_course_registration_support(_alma_client(), url))
    except AlmaError as error:
        raise _translate_error(error) from error


@router.post("/api/alma/course-registration/options")
def alma_course_registration_options(url: str = Query(..., min_length=1)) -> dict[str, object]:
    try:
        return serialize(prepare_course_registration(_alma_client(), url))
    except AlmaError as error:
        raise _translate_error(error) from error


@router.post("/api/alma/course-registration")
def alma_course_registration(
    url: str = Query(..., min_length=1),
    planelement_id: str = "",
) -> dict[str, object]:
    try:
        return serialize(register_for_course(_alma_client(), url, planelement_id=planelement_id or None))
    except AlmaError as error:
        raise _translate_error(error) from error

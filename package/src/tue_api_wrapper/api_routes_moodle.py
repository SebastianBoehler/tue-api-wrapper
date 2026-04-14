from __future__ import annotations

from fastapi import APIRouter, Form, Query

from .config import AlmaError
from .moodle_auth import build_moodle_client
from .moodle_client import MoodleClient
from .portal_service import serialize

router = APIRouter()


def _moodle_client() -> MoodleClient:
    return build_moodle_client()


def _translate_error(error: AlmaError):
    from fastapi import HTTPException

    return HTTPException(status_code=400, detail=str(error))


@router.get("/api/moodle/dashboard")
def moodle_dashboard(
    event_limit: int = Query(6, ge=1, le=50),
    course_limit: int = Query(12, ge=1, le=100),
    recent_limit: int = Query(9, ge=1, le=50),
) -> dict[str, object]:
    try:
        return serialize(_moodle_client().fetch_dashboard(event_limit=event_limit, course_limit=course_limit, recent_limit=recent_limit))
    except AlmaError as error:
        raise _translate_error(error) from error


@router.get("/api/moodle/calendar")
def moodle_calendar(days: int = Query(30, ge=1, le=180), limit: int = Query(50, ge=1, le=200)) -> dict[str, object]:
    try:
        return serialize(_moodle_client().fetch_calendar(days=days, limit=limit))
    except AlmaError as error:
        raise _translate_error(error) from error


@router.get("/api/moodle/courses")
def moodle_courses(
    classification: str = Query("all"),
    limit: int = Query(24, ge=1, le=100),
    offset: int = Query(0, ge=0, le=500),
) -> dict[str, object]:
    try:
        return serialize(_moodle_client().fetch_enrolled_courses(classification=classification, limit=limit, offset=offset))
    except AlmaError as error:
        raise _translate_error(error) from error


@router.get("/api/moodle/categories")
def moodle_root_categories() -> dict[str, object]:
    try:
        return serialize(_moodle_client().fetch_category_page())
    except AlmaError as error:
        raise _translate_error(error) from error


@router.get("/api/moodle/categories/{category_id}")
def moodle_category(category_id: int) -> dict[str, object]:
    try:
        return serialize(_moodle_client().fetch_category_page(category_id))
    except AlmaError as error:
        raise _translate_error(error) from error


@router.get("/api/moodle/categories/{category_id}/courses")
def moodle_category_courses(category_id: int) -> dict[str, object]:
    try:
        page = _moodle_client().fetch_category_page(category_id)
        return {"source_url": page.source_url, "items": serialize(page.courses)}
    except AlmaError as error:
        raise _translate_error(error) from error


@router.get("/api/moodle/course/{course_id}")
def moodle_course_detail(course_id: int) -> dict[str, object]:
    try:
        return serialize(_moodle_client().fetch_course_detail(course_id))
    except AlmaError as error:
        raise _translate_error(error) from error


@router.get("/api/moodle/course/{course_id}/enrolment")
def moodle_course_enrolment(course_id: int) -> dict[str, object]:
    try:
        detail = _moodle_client().fetch_course_detail(course_id)
        return {
            "course_id": detail.id,
            "title": detail.title,
            "course_url": detail.course_url,
            "source_url": detail.source_url,
            "self_enrolment_available": detail.self_enrolment_available,
            "requires_enrolment_key": detail.requires_enrolment_key,
            "enrolment_label": detail.enrolment_label,
        }
    except AlmaError as error:
        raise _translate_error(error) from error


@router.post("/api/moodle/course/{course_id}/enrol")
def moodle_course_enrol(course_id: int, enrolment_key: str = Form("")) -> dict[str, object]:
    try:
        return serialize(_moodle_client().enrol_in_course(course_id, enrolment_key=enrolment_key.strip() or None))
    except AlmaError as error:
        raise _translate_error(error) from error


@router.get("/api/moodle/grades")
def moodle_grades(limit: int = Query(50, ge=1, le=200)) -> dict[str, object]:
    try:
        page = _moodle_client().fetch_grades()
        return {"source_url": page.source_url, "items": serialize(page.items[:limit])}
    except AlmaError as error:
        raise _translate_error(error) from error


@router.get("/api/moodle/messages")
def moodle_messages(limit: int = Query(20, ge=1, le=100)) -> dict[str, object]:
    try:
        page = _moodle_client().fetch_messages()
        return {"source_url": page.source_url, "items": serialize(page.items[:limit])}
    except AlmaError as error:
        raise _translate_error(error) from error


@router.get("/api/moodle/notifications")
def moodle_notifications(limit: int = Query(20, ge=1, le=100)) -> dict[str, object]:
    try:
        page = _moodle_client().fetch_notifications()
        return {"source_url": page.source_url, "items": serialize(page.items[:limit])}
    except AlmaError as error:
        raise _translate_error(error) from error

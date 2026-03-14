from __future__ import annotations

from fastapi import APIRouter, Query

from .alma_feature_client import fetch_current_lectures
from .config import AlmaError
from .ilias_feature_client import fetch_ilias_info_page, search_ilias
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


@router.get("/api/ilias/search")
def ilias_search(term: str, page: int = Query(1, ge=1, le=50)) -> dict[str, object]:
    try:
        return serialize(search_ilias(_ilias_client(), term=term, page=page))
    except AlmaError as error:
        raise _translate_error(error) from error


@router.get("/api/ilias/info")
def ilias_info(target: str) -> dict[str, object]:
    try:
        return serialize(fetch_ilias_info_page(_ilias_client(), target=target))
    except AlmaError as error:
        raise _translate_error(error) from error

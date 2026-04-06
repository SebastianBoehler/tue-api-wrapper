from __future__ import annotations

import requests
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from .campus_client import CampusClient
from .praxisportal_client import PraxisportalClient
from .portal_service import serialize
from .timms_client import TimmsClient

router = APIRouter()
timms_client = TimmsClient()
praxisportal_client = PraxisportalClient()
campus_client = CampusClient()


def _translate_public_error(error: Exception) -> HTTPException:
    status_code = 502 if isinstance(error, requests.RequestException) else 400
    return HTTPException(status_code=status_code, detail=str(error))


@router.get("/api/timms/search")
def timms_search(query: str, offset: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=50)) -> dict[str, object]:
    try:
        return serialize(timms_client.search(query, offset=offset, limit=limit))
    except Exception as error:  # pragma: no cover - exercised via FastAPI surface
        raise _translate_public_error(error) from error


@router.get("/api/timms/search/suggest")
def timms_search_suggest(term: str, limit: int = Query(8, ge=1, le=20)) -> dict[str, object]:
    try:
        return {"items": timms_client.suggest(term, limit=limit)}
    except Exception as error:  # pragma: no cover - exercised via FastAPI surface
        raise _translate_public_error(error) from error


@router.get("/api/timms/items/{item_id}")
def timms_item(item_id: str) -> dict[str, object]:
    try:
        return serialize(timms_client.fetch_item(item_id))
    except Exception as error:  # pragma: no cover - exercised via FastAPI surface
        raise _translate_public_error(error) from error


@router.get("/api/timms/items/{item_id}/streams")
def timms_streams(item_id: str) -> list[object]:
    try:
        return serialize(timms_client.fetch_streams(item_id))
    except Exception as error:  # pragma: no cover - exercised via FastAPI surface
        raise _translate_public_error(error) from error


@router.get("/api/timms/items/{item_id}/cite")
def timms_citation(item_id: str, format_name: str = Query(..., alias="format")) -> Response:
    try:
        citation = timms_client.fetch_citation(item_id, format_name=format_name)
    except Exception as error:  # pragma: no cover - exercised via FastAPI surface
        raise _translate_public_error(error) from error
    return Response(content=citation.content, media_type=citation.headers.get("content-type", "text/plain"))


@router.get("/api/timms/tree")
def timms_tree(node_id: str = "", node_path: str = "") -> dict[str, object]:
    try:
        return serialize(
            timms_client.fetch_tree(
                node_id=node_id.strip() or None,
                node_path=node_path.strip() or None,
            )
        )
    except Exception as error:  # pragma: no cover - exercised via FastAPI surface
        raise _translate_public_error(error) from error


@router.get("/api/praxisportal/filters")
def praxisportal_filters() -> dict[str, object]:
    try:
        return serialize(praxisportal_client.fetch_filter_options())
    except Exception as error:  # pragma: no cover - exercised via FastAPI surface
        raise _translate_public_error(error) from error


@router.get("/api/praxisportal/search")
def praxisportal_search(
    query: str = "",
    project_type_id: list[int] = Query(default=[]),
    industry_id: list[int] = Query(default=[]),
    page: int = Query(0, ge=0),
    per_page: int = Query(20, ge=1, le=50),
    sort: str = Query("newest"),
) -> dict[str, object]:
    try:
        return serialize(
            praxisportal_client.search_projects(
                query=query,
                project_type_ids=tuple(project_type_id),
                industry_ids=tuple(industry_id),
                page=page,
                per_page=per_page,
                sort=sort,
            )
        )
    except Exception as error:  # pragma: no cover - exercised via FastAPI surface
        raise _translate_public_error(error) from error


@router.get("/api/praxisportal/projects/{project_id}")
def praxisportal_project(project_id: int) -> dict[str, object]:
    try:
        return serialize(praxisportal_client.fetch_project(project_id))
    except Exception as error:  # pragma: no cover - exercised via FastAPI surface
        raise _translate_public_error(error) from error


@router.get("/api/campus/canteens")
def campus_canteens() -> list[object]:
    try:
        return serialize(campus_client.fetch_tuebingen_canteens())
    except Exception as error:  # pragma: no cover - exercised via FastAPI surface
        raise _translate_public_error(error) from error


@router.get("/api/campus/canteens/{canteen_id}")
def campus_canteen(canteen_id: int) -> dict[str, object]:
    try:
        return serialize(campus_client.fetch_canteen(canteen_id))
    except Exception as error:  # pragma: no cover - exercised via FastAPI surface
        raise _translate_public_error(error) from error


@router.get("/api/campus/buildings")
def campus_buildings() -> dict[str, object]:
    try:
        return serialize(campus_client.fetch_buildings())
    except Exception as error:  # pragma: no cover - exercised via FastAPI surface
        raise _translate_public_error(error) from error


@router.get("/api/campus/buildings/detail")
def campus_building_detail(path: str) -> dict[str, object]:
    try:
        return serialize(campus_client.fetch_building_detail(path))
    except Exception as error:  # pragma: no cover - exercised via FastAPI surface
        raise _translate_public_error(error) from error

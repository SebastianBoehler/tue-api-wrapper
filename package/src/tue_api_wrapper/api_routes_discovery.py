from __future__ import annotations

from fastapi import APIRouter, Query

from .api_errors import translate_alma_error
from .config import AlmaError
from .course_discovery_models import CourseDiscoveryFilters
from .course_discovery_service import CourseDiscoveryService
from .portal_service import PortalService, serialize

router = APIRouter()
portal_service = PortalService()
discovery_service = CourseDiscoveryService(
    alma_loader=portal_service._alma_client,
    ilias_loader=portal_service._ilias_client,
)


@router.get("/api/discovery/courses/search")
def course_discovery_search(
    q: str = Query("", max_length=200),
    source: list[str] = Query(default=[]),
    kind: list[str] = Query(default=[]),
    degree: str = "",
    module_code: str = "",
    term: str = "",
    tag: list[str] = Query(default=[]),
    include_private: bool = Query(False),
    limit: int = Query(20, ge=1, le=80),
) -> dict[str, object]:
    try:
        return serialize(
            discovery_service.search(
                q,
                filters=CourseDiscoveryFilters(
                    sources=tuple(_clean(source)),
                    kinds=tuple(_clean(kind)),
                    degree=degree.strip() or None,
                    module_code=module_code.strip() or None,
                    term=term.strip() or None,
                    tags=tuple(_clean(tag)),
                ),
                include_private=include_private,
                limit=limit,
            )
        )
    except AlmaError as error:
        raise translate_alma_error(error) from error


@router.post("/api/discovery/courses/refresh")
def course_discovery_refresh(
    q: str = Query("", max_length=200),
    include_private: bool = Query(False),
    limit: int = Query(80, ge=1, le=200),
) -> dict[str, object]:
    return serialize(discovery_service.refresh(query=q, include_private=include_private, limit=limit))


@router.get("/api/discovery/courses/status")
def course_discovery_status() -> dict[str, object]:
    return serialize(discovery_service.status())


def _clean(values: list[str]) -> list[str]:
    return [value.strip().lower() for value in values if value.strip()]

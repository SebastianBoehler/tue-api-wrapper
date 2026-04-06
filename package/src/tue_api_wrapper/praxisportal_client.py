from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime, timedelta
from functools import lru_cache
from urllib.parse import quote

import requests

from .config import DEFAULT_TIMEOUT_SECONDS, GERMAN_TIMEZONE
from .praxisportal_models import (
    CareerFacetOption,
    CareerOrganization,
    CareerProjectDetail,
    CareerProjectSummary,
    CareerSearchFilters,
    CareerSearchResponse,
)

PRAXISPORTAL_BASE_URL = "https://www.praxisportal.uni-tuebingen.de"
ALGOLIA_APP_ID = "ESD35NPPR9"
ALGOLIA_API_KEY = "fc3088fb6da3aa814eb902f0635f46b3"
ALGOLIA_INDEX = "projects_prd"
ALGOLIA_NEWEST_INDEX = f"{ALGOLIA_INDEX}_newest"


def _algolia_headers() -> dict[str, str]:
    return {
        "content-type": "application/json",
        "x-algolia-application-id": ALGOLIA_APP_ID,
        "x-algolia-api-key": ALGOLIA_API_KEY,
    }


def _build_visibility_filter() -> str:
    now = datetime.now(GERMAN_TIMEZONE)
    day_start = int(now.replace(hour=0, minute=0, second=0, microsecond=0).timestamp()) - 100
    day_end = int((now.replace(hour=23, minute=59, second=59, microsecond=0) + timedelta(seconds=100)).timestamp())
    return (
        f"(blocked<1 AND hidden<1 AND project_stop_date>={day_start} "
        f"AND project_start_date<={day_end}) AND (visible_institutes:-1)"
    )


def _build_filter_expression(project_type_ids: Iterable[int], industry_ids: Iterable[int]) -> str:
    clauses = [_build_visibility_filter()]
    project_filters = [f"project_type.id:{value}" for value in project_type_ids]
    industry_filters = [f"industry.id:{value}" for value in industry_ids]
    if project_filters:
        clauses.append("(" + " OR ".join(project_filters) + ")")
    if industry_filters:
        clauses.append("(" + " OR ".join(industry_filters) + ")")
    return " AND ".join(clauses)


def _algolia_post(path: str, payload: dict[str, object], *, timeout: int) -> dict[str, object]:
    response = requests.post(
        f"https://{ALGOLIA_APP_ID}-dsn.algolia.net{path}",
        headers=_algolia_headers(),
        json=payload,
        timeout=timeout,
    )
    response.raise_for_status()
    return response.json()


def _algolia_get(path: str, *, timeout: int) -> dict[str, object]:
    response = requests.get(
        f"https://{ALGOLIA_APP_ID}-dsn.algolia.net{path}",
        headers=_algolia_headers(),
        timeout=timeout,
    )
    response.raise_for_status()
    return response.json()


def _iso_from_timestamp(value: object, *, milliseconds: bool = False) -> str | None:
    if value in (None, "", 0):
        return None
    try:
        stamp = float(value)
    except (TypeError, ValueError):
        return None
    if milliseconds:
        stamp /= 1000
    return datetime.fromtimestamp(stamp, tz=GERMAN_TIMEZONE).isoformat()


def _preview_from_text(value: str | None, *, limit: int = 220) -> str | None:
    if not value:
        return None
    cleaned = " ".join(value.split())
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 1].rstrip() + "…"


def map_praxisportal_summary(hit: dict[str, object]) -> CareerProjectSummary:
    project_types = [str(item.get("name", "")).strip() for item in hit.get("project_type", []) if str(item.get("name", "")).strip()]
    industries = [str(item.get("title", "")).strip() for item in hit.get("industry", []) if str(item.get("title", "")).strip()]
    organizations = [str(item.get("name", "")).strip() for item in hit.get("organization", []) if str(item.get("name", "")).strip()]
    project_id = int(hit["id"])
    return CareerProjectSummary(
        id=project_id,
        title=str(hit.get("title", "")).strip(),
        preview=_preview_from_text(str(hit.get("job_description", "") or "")),
        location=(str(hit.get("location", "")).strip() or None),
        project_types=project_types,
        industries=industries,
        organizations=organizations,
        created_at=_iso_from_timestamp(hit.get("created_at"), milliseconds=True),
        start_date=_iso_from_timestamp(hit.get("start_date")),
        end_date=_iso_from_timestamp(hit.get("end_date")),
        source_url=f"{PRAXISPORTAL_BASE_URL}/projects/{project_id}",
    )


def map_praxisportal_detail(hit: dict[str, object]) -> CareerProjectDetail:
    project_id = int(hit["id"])
    return CareerProjectDetail(
        id=project_id,
        title=str(hit.get("title", "")).strip(),
        location=(str(hit.get("location", "")).strip() or None),
        description=(str(hit.get("job_description", "")).strip() or None),
        requirements=(str(hit.get("requirements", "")).strip() or None),
        project_types=[str(item.get("name", "")).strip() for item in hit.get("project_type", []) if str(item.get("name", "")).strip()],
        industries=[str(item.get("title", "")).strip() for item in hit.get("industry", []) if str(item.get("title", "")).strip()],
        organizations=[
            CareerOrganization(
                id=(int(item["id"]) if item.get("id") is not None else None),
                name=str(item.get("name", "")).strip(),
                logo_url=(str(item.get("logo", "")).strip() or None),
            )
            for item in hit.get("organization", [])
            if str(item.get("name", "")).strip()
        ],
        created_at=_iso_from_timestamp(hit.get("created_at"), milliseconds=True),
        start_date=_iso_from_timestamp(hit.get("start_date")),
        end_date=_iso_from_timestamp(hit.get("end_date")),
        source_url=f"{PRAXISPORTAL_BASE_URL}/projects/{project_id}",
    )


def build_praxisportal_filter_options(counts: dict[str, int], labels: dict[int, str]) -> list[CareerFacetOption]:
    options = [
        CareerFacetOption(id=int(key), label=labels[int(key)], count=int(value))
        for key, value in counts.items()
        if int(key) in labels
    ]
    return sorted(options, key=lambda option: option.label.lower())


class PraxisportalClient:
    def __init__(self, *, timeout: int = DEFAULT_TIMEOUT_SECONDS) -> None:
        self.timeout = timeout

    def search_projects(
        self,
        *,
        query: str = "",
        project_type_ids: tuple[int, ...] = (),
        industry_ids: tuple[int, ...] = (),
        page: int = 0,
        per_page: int = 20,
        sort: str = "newest",
    ) -> CareerSearchResponse:
        params = {
            "query": query or None,
            "optionalWords": query or None,
            "filters": _build_filter_expression(project_type_ids, industry_ids),
            "hitsPerPage": per_page,
            "page": page,
            "facets": ["project_type.id", "industry.id"],
        }
        params_str = "&".join(f"{key}={quote(str(value), safe='[]:,()<> ')}" for key, value in params.items() if value is not None)
        index = ALGOLIA_NEWEST_INDEX if sort == "newest" else ALGOLIA_INDEX
        payload = _algolia_post(f"/1/indexes/{index}/query", {"params": params_str}, timeout=self.timeout)
        filters = self.fetch_filter_options()
        return CareerSearchResponse(
            query=query,
            page=int(payload.get("page", 0)),
            per_page=int(payload.get("hitsPerPage", per_page)),
            total_hits=int(payload.get("nbHits", 0)),
            total_pages=int(payload.get("nbPages", 0)),
            source_url=f"{PRAXISPORTAL_BASE_URL}/candidate/search",
            filters=filters,
            items=[map_praxisportal_summary(hit) for hit in payload.get("hits", [])],
        )

    def fetch_project(self, project_id: int) -> CareerProjectDetail:
        object_id = quote(f"App\\Models\\Project::{project_id}", safe="")
        payload = _algolia_get(f"/1/indexes/{ALGOLIA_INDEX}/{object_id}", timeout=self.timeout)
        return map_praxisportal_detail(payload)

    @lru_cache(maxsize=1)
    def fetch_filter_options(self) -> CareerSearchFilters:
        payload = _algolia_post(
            f"/1/indexes/{ALGOLIA_INDEX}/query",
            {
                "params": (
                    "query=&hitsPerPage=0&facets="
                    '["project_type.id","industry.id"]'
                    f"&filters={quote(_build_visibility_filter(), safe='()<>:= ')}"
                )
            },
            timeout=self.timeout,
        )
        project_type_counts = payload.get("facets", {}).get("project_type.id", {})
        industry_counts = payload.get("facets", {}).get("industry.id", {})
        project_type_labels = self._facet_labels("project_type.id", [int(value) for value in project_type_counts])
        industry_labels = self._facet_labels("industry.id", [int(value) for value in industry_counts])
        return CareerSearchFilters(
            project_types=build_praxisportal_filter_options(project_type_counts, project_type_labels),
            industries=build_praxisportal_filter_options(industry_counts, industry_labels),
        )

    def _facet_labels(self, facet_name: str, ids: list[int]) -> dict[int, str]:
        requests_payload = [
            {
                "indexName": ALGOLIA_INDEX,
                "params": (
                    f"query=&hitsPerPage=1&filters={quote(_build_visibility_filter() + ' AND ' + facet_name + ':' + str(value), safe='()<>:= ')}"
                ),
            }
            for value in ids
        ]
        payload = _algolia_post("/1/indexes/*/queries", {"requests": requests_payload}, timeout=self.timeout)
        labels: dict[int, str] = {}
        for value, result in zip(ids, payload.get("results", []), strict=False):
            hits = result.get("hits", [])
            if not hits:
                continue
            hit = hits[0]
            if facet_name == "project_type.id":
                match = next((item for item in hit.get("project_type", []) if int(item.get("id", -1)) == value), None)
                if match is not None:
                    labels[value] = str(match.get("name", "")).strip()
            if facet_name == "industry.id":
                match = next((item for item in hit.get("industry", []) if int(item.get("id", -1)) == value), None)
                if match is not None:
                    labels[value] = str(match.get("title", "")).strip()
        return labels

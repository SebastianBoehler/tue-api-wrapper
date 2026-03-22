from __future__ import annotations

from collections import deque
from typing import Iterable

import requests

from .route_discovery_common import (
    RouteArtifact,
    extract_html_page,
    normalize_url,
    report_dict,
    should_follow,
)


def discover_routes(
    *,
    session: requests.Session,
    start_urls: Iterable[str],
    allowed_hosts: set[str],
    depth: int,
    max_pages: int,
    request_timeout: int,
) -> dict[str, object]:
    queue: deque[tuple[str, int]] = deque((normalize_url(url), 0) for url in start_urls)
    visited: set[str] = set()
    pages: list[dict[str, object]] = []
    forms = []
    route_map: dict[tuple[str, tuple[str, ...]], RouteArtifact] = {}

    while queue and len(visited) < max_pages:
        current_url, current_depth = queue.popleft()
        if current_url in visited:
            continue
        visited.add(current_url)

        try:
            response = session.get(current_url, timeout=request_timeout, allow_redirects=True)
            response.raise_for_status()
        except requests.RequestException as error:
            pages.append({"url": current_url, "error": str(error)})
            continue

        final_url = normalize_url(response.url)
        if final_url not in visited:
            visited.add(final_url)

        pages.append(
            extract_html_page(
                html=response.text,
                page_url=final_url,
                status_code=response.status_code,
                allowed_hosts=allowed_hosts,
                forms=forms,
                route_map=route_map,
            )
        )

        if current_depth >= depth:
            continue

        for route in list(route_map.values()):
            if route.sample_pages and final_url not in route.sample_pages:
                continue
            if route.sample_url and should_follow(route.sample_url, allowed_hosts) and route.sample_url not in visited:
                queue.append((route.sample_url, current_depth + 1))

    return report_dict(pages, forms, route_map)

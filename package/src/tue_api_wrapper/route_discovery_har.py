from __future__ import annotations

import base64
import json
from pathlib import Path
from urllib.parse import unquote_plus, urlparse

from .route_discovery_common import (
    FormArtifact,
    RouteArtifact,
    extract_html_page,
    normalize_url,
    record_route,
    report_dict,
    should_capture,
)


def _har_headers(request: dict[str, object]) -> dict[str, str]:
    headers = request.get("headers", [])
    if not isinstance(headers, list):
        return {}
    result: dict[str, str] = {}
    for item in headers:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name", "")).strip().lower()
        value = str(item.get("value", "")).strip()
        if name:
            result[name] = value
    return result


def _decode_har_value(value: str | None) -> str:
    return unquote_plus(value or "").strip()


def _decode_har_text(content: dict[str, object]) -> str:
    text = content.get("text")
    if not isinstance(text, str) or not text:
        return ""
    if content.get("encoding") == "base64":
        try:
            return base64.b64decode(text).decode("utf-8", errors="replace")
        except ValueError:
            return ""
    return text


def _response_looks_html(content: dict[str, object], text: str) -> bool:
    mime_type = str(content.get("mimeType", "")).lower()
    if "html" in mime_type:
        return True
    normalized = text.lstrip().lower()
    return normalized.startswith("<!doctype html") or normalized.startswith("<html")


def _har_post_form(request: dict[str, object], action_url: str) -> FormArtifact | None:
    method = str(request.get("method", "GET")).upper()
    post_data = request.get("postData", {})
    if not isinstance(post_data, dict):
        return None
    params = post_data.get("params")
    if method != "POST" or not isinstance(params, list):
        return None

    field_names: set[str] = set()
    button_names: set[str] = set()
    values: dict[str, str] = {}
    for param in params:
        if not isinstance(param, dict):
            continue
        name = _decode_har_value(str(param.get("name", "")))
        if not name:
            continue
        value = _decode_har_value(str(param.get("value", "")))
        field_names.add(name)
        values[name] = value
        if name.startswith("cmd[") or name.endswith((":search", ":job2", ":showOutputRequestGroup")):
            button_names.add(name)

    for meta_name in ("activePageElementId", "javax.faces.source"):
        trigger_name = values.get(meta_name)
        if trigger_name:
            button_names.add(trigger_name)

    headers = _har_headers(request)
    page_url = normalize_url(headers.get("referer", action_url))
    return FormArtifact(
        page_url=page_url,
        action_url=action_url,
        method=method,
        field_names=tuple(sorted(field_names)),
        button_names=tuple(sorted(button_names)),
    )


def discover_routes_from_har(*, har_path: str | Path, allowed_hosts: set[str] | None = None) -> dict[str, object]:
    payload = json.loads(Path(har_path).read_text(encoding="utf-8"))
    entries = payload.get("log", {}).get("entries", [])
    if not isinstance(entries, list):
        raise ValueError("HAR payload does not contain a valid log.entries array.")

    if allowed_hosts is None:
        allowed_hosts = {
            urlparse(entry.get("request", {}).get("url", "")).netloc
            for entry in entries
            if isinstance(entry, dict)
        }
        allowed_hosts.discard("")

    pages: list[dict[str, object]] = []
    forms: list[FormArtifact] = []
    route_map: dict[tuple[str, tuple[str, ...]], RouteArtifact] = {}

    for entry in entries:
        if not isinstance(entry, dict):
            continue
        request = entry.get("request", {})
        response = entry.get("response", {})
        if not isinstance(request, dict) or not isinstance(response, dict):
            continue

        url = normalize_url(str(request.get("url", "")).strip())
        if not url or not should_capture(url, allowed_hosts):
            continue

        method = str(request.get("method", "GET")).upper()
        headers = _har_headers(request)
        page_url = normalize_url(headers.get("referer", url))
        record_route(route_map, url=url, method=method, source="har-request", page_url=page_url)

        post_form = _har_post_form(request, url)
        if post_form is not None:
            forms.append(post_form)

        content = response.get("content", {})
        if not isinstance(content, dict):
            continue
        text = _decode_har_text(content)
        if not text or not _response_looks_html(content, text):
            status = response.get("status")
            pages.append({"url": url, "status": status} if status is not None else {"url": url})
            continue

        status_code = response.get("status")
        pages.append(
            extract_html_page(
                html=text,
                page_url=url,
                status_code=int(status_code) if isinstance(status_code, int) else None,
                allowed_hosts=allowed_hosts,
                forms=forms,
                route_map=route_map,
            )
        )

    return report_dict(pages, forms, route_map)

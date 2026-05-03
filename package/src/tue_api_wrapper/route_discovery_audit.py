from __future__ import annotations

import base64
from collections import Counter
import json
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlparse

ASSET_EXTENSIONS = (
    ".css",
    ".gif",
    ".ico",
    ".jpeg",
    ".jpg",
    ".js",
    ".map",
    ".png",
    ".svg",
    ".ttf",
    ".woff",
    ".woff2",
)

DATA_FORMATS = {"json", "jsonp", "calendar", "pdf", "xml"}


def audit_har_response_formats(*, har_path: str | Path, allowed_hosts: set[str] | None = None) -> dict[str, object]:
    payload = json.loads(Path(har_path).read_text(encoding="utf-8"))
    entries = payload.get("log", {}).get("entries", [])
    if not isinstance(entries, list):
        raise ValueError("HAR payload does not contain a valid log.entries array.")

    endpoints: dict[tuple[str, str, tuple[str, ...]], dict[str, object]] = {}
    response_formats: Counter[str] = Counter()
    resource_types: Counter[str] = Counter()
    hosts: Counter[str] = Counter()

    for entry in entries:
        if not isinstance(entry, dict):
            continue
        request = entry.get("request", {})
        response = entry.get("response", {})
        if not isinstance(request, dict) or not isinstance(response, dict):
            continue

        url = str(request.get("url", "")).strip()
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            continue
        if allowed_hosts is not None and parsed.netloc not in allowed_hosts:
            continue

        content = response.get("content", {})
        if not isinstance(content, dict):
            content = {}
        text = _decode_har_text(content)
        query_keys = tuple(sorted({key for key, _ in parse_qsl(parsed.query, keep_blank_values=True)}))
        response_format = _classify_response(content.get("mimeType", ""), text, parsed.path, query_keys)
        resource_type = str(entry.get("_resourceType", "") or "unknown")

        response_formats[response_format] += 1
        resource_types[resource_type] += 1
        hosts[parsed.netloc] += 1

        key = (parsed.netloc, parsed.path or "/", query_keys)
        endpoint = endpoints.setdefault(
            key,
            {
                "host": parsed.netloc,
                "path": parsed.path or "/",
                "query_keys": list(query_keys),
                "methods": Counter(),
                "response_formats": Counter(),
                "resource_types": Counter(),
                "statuses": Counter(),
                "request_body_types": Counter(),
                "sample_url": _redacted_url(url),
            },
        )
        endpoint["methods"][str(request.get("method", "GET")).upper()] += 1
        endpoint["response_formats"][response_format] += 1
        endpoint["resource_types"][resource_type] += 1
        endpoint["statuses"][str(response.get("status", ""))] += 1
        body_type = _request_body_type(request)
        if body_type:
            endpoint["request_body_types"][body_type] += 1

    endpoint_rows = [_endpoint_row(endpoint) for endpoint in endpoints.values()]
    endpoint_rows.sort(key=lambda item: (not item["is_data_candidate"], item["host"], item["path"], item["query_keys"]))
    return {
        "source": str(har_path),
        "entry_count": sum(response_formats.values()),
        "response_formats": dict(response_formats.most_common()),
        "resource_types": dict(resource_types.most_common()),
        "hosts": dict(hosts.most_common()),
        "data_candidates": [row for row in endpoint_rows if row["is_data_candidate"]],
        "endpoints": endpoint_rows,
    }


def render_format_audit_markdown(report: dict[str, object]) -> str:
    lines = [
        "# HAR Response Format Audit",
        "",
        f"- Source: `{report['source']}`",
        f"- Entries analyzed: {report['entry_count']}",
        "",
        "## Response Formats",
        "",
        "| Format | Count |",
        "| --- | ---: |",
    ]
    for name, count in report["response_formats"].items():
        lines.append(f"| {name} | {count} |")

    lines.extend(["", "## Data Candidates", "", "| Method(s) | Format(s) | Path | Query keys | Sample |", "| --- | --- | --- | --- | --- |"])
    for endpoint in report["data_candidates"]:
        lines.append(
            "| "
            + ", ".join(endpoint["methods"])
            + " | "
            + ", ".join(endpoint["response_formats"])
            + " | "
            + endpoint["path"]
            + " | "
            + ", ".join(endpoint["query_keys"])
            + " | "
            + endpoint["sample_url"]
            + " |"
        )

    lines.extend(["", "## All Endpoints", "", "| Method(s) | Format(s) | Resource(s) | Path | Query keys |", "| --- | --- | --- | --- | --- |"])
    for endpoint in report["endpoints"]:
        lines.append(
            "| "
            + ", ".join(endpoint["methods"])
            + " | "
            + ", ".join(endpoint["response_formats"])
            + " | "
            + ", ".join(endpoint["resource_types"])
            + " | "
            + endpoint["path"]
            + " | "
            + ", ".join(endpoint["query_keys"])
            + " |"
        )
    return "\n".join(lines)


def _endpoint_row(endpoint: dict[str, object]) -> dict[str, object]:
    formats = endpoint["response_formats"]
    resource_types = endpoint["resource_types"]
    path = str(endpoint["path"])
    is_asset = path.lower().endswith(ASSET_EXTENSIONS)
    asset_resources = {"image", "font", "stylesheet"}
    app_resources = {"document", "fetch", "xhr"}
    is_asset_resource = bool(set(resource_types) & asset_resources) and not bool(set(resource_types) & app_resources)
    is_data_candidate = any(name in DATA_FORMATS for name in formats) and not is_asset and not is_asset_resource
    return {
        "host": endpoint["host"],
        "path": path,
        "query_keys": endpoint["query_keys"],
        "methods": sorted(endpoint["methods"]),
        "response_formats": sorted(formats),
        "resource_types": sorted(resource_types),
        "statuses": sorted(endpoint["statuses"]),
        "request_body_types": sorted(endpoint["request_body_types"]),
        "sample_url": endpoint["sample_url"],
        "is_data_candidate": is_data_candidate,
    }


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


def _classify_response(mime_type: object, text: str, path: str, query_keys: tuple[str, ...]) -> str:
    mime = str(mime_type or "").lower().split(";", 1)[0].strip()
    sample = text.lstrip()[:200].lower()
    lower_path = path.lower()
    if "json" in mime or sample.startswith(("{", "[")):
        return "json"
    if "calendar" in mime or "begin:vcalendar" in text[:1000].lower():
        return "calendar"
    if "pdf" in mime or text.startswith("%PDF") or lower_path.endswith(".pdf"):
        return "pdf"
    if sample.startswith("<partial-response"):
        return "jsf_partial_html"
    if "xml" in mime or sample.startswith("<?xml"):
        return "xml"
    if "html" in mime or sample.startswith(("<!doctype html", "<html")):
        return "html"
    if "callback" in query_keys and ("javascript" in mime or lower_path.endswith(".js")):
        return "jsonp"
    if mime.startswith("image/"):
        return "image"
    if "javascript" in mime or lower_path.endswith(".js"):
        return "javascript"
    if "css" in mime or lower_path.endswith(".css"):
        return "css"
    if "font" in mime or lower_path.endswith((".ttf", ".woff", ".woff2")):
        return "font"
    if not mime and not text:
        return "empty_or_binary"
    return mime or "unknown"


def _request_body_type(request: dict[str, object]) -> str:
    post_data = request.get("postData", {})
    if not isinstance(post_data, dict):
        return ""
    mime = str(post_data.get("mimeType", "")).lower()
    text = str(post_data.get("text", "") or "").strip()
    if "json" in mime or text.startswith(("{", "[")):
        return "json"
    if "form" in mime or isinstance(post_data.get("params"), list):
        return "form"
    return "text" if text else ""


def _redacted_url(url: str) -> str:
    parsed = urlparse(url)
    keys = sorted({key for key, _ in parse_qsl(parsed.query, keep_blank_values=True)})
    query = urlencode([(key, "<redacted>") for key in keys])
    return parsed._replace(query=query, fragment="").geturl()

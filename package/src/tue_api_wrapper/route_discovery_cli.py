from __future__ import annotations

import argparse
from html import unescape
import json
import os
import re
import sys
from collections import deque
from dataclasses import dataclass, field
from typing import Iterable
from urllib.parse import parse_qsl, urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from .client import AlmaClient
from .config import AlmaError, AlmaParseError
from .credentials import read_uni_credentials
from .ilias_client import IliasClient

DEFAULT_ALMA_START_URLS = (
    "https://alma.uni-tuebingen.de/alma/pages/cs/sys/portal/hisinoneStartPage.faces",
    "https://alma.uni-tuebingen.de/alma/pages/cm/exa/coursecatalog/showCourseCatalog.xhtml?_flowId=showCourseCatalog-flow&navigationPosition=studiesOffered%2CcourseoverviewShow&recordRequest=true",
    "https://alma.uni-tuebingen.de/alma/pages/cm/exa/curricula/moduleDescriptionSearch.xhtml?_flowId=searchElementsInModuleDescription-flow&navigationPosition=studiesOffered%2CmoduleDescriptions%2CsearchElementsInModuleDescription&recordRequest=true",
)
DEFAULT_ILIAS_START_URLS = (
    "https://ovidius.uni-tuebingen.de/ilias3/login.php?cmd=force_login",
    "https://ovidius.uni-tuebingen.de/ilias3/goto.php/root/1",
)
ASSET_SUFFIXES = (
    ".css",
    ".gif",
    ".ico",
    ".jpeg",
    ".jpg",
    ".js",
    ".json",
    ".map",
    ".pdf",
    ".png",
    ".svg",
    ".webp",
    ".xml",
)


@dataclass
class RouteArtifact:
    path: str
    query_keys: tuple[str, ...]
    methods: set[str] = field(default_factory=set)
    sources: set[str] = field(default_factory=set)
    sample_url: str | None = None
    sample_pages: set[str] = field(default_factory=set)


@dataclass
class FormArtifact:
    page_url: str
    action_url: str
    method: str
    field_names: tuple[str, ...]
    button_names: tuple[str, ...]


def _normalize_url(url: str) -> str:
    parsed = urlparse(url)
    query = "&".join(f"{key}={value}" for key, value in parse_qsl(parsed.query, keep_blank_values=True))
    normalized = parsed._replace(fragment="", query=query)
    return normalized.geturl()


def _route_key(url: str) -> tuple[str, tuple[str, ...]]:
    parsed = urlparse(url)
    query_keys = tuple(sorted({key for key, _ in parse_qsl(parsed.query, keep_blank_values=True)}))
    return parsed.path or "/", query_keys


def _looks_html(url: str) -> bool:
    path = urlparse(url).path.lower()
    if not path:
        return True
    return not path.endswith(ASSET_SUFFIXES)


def _should_follow(url: str, allowed_hosts: set[str]) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        return False
    if parsed.netloc not in allowed_hosts:
        return False
    return _looks_html(url)


def _should_capture(url: str, allowed_hosts: set[str]) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        return False
    if parsed.netloc not in allowed_hosts:
        return False
    return _looks_html(url)


def _collect_script_routes(soup: BeautifulSoup, page_url: str) -> list[str]:
    matches: list[str] = []
    pattern = re.compile(r"['\"]((?:https?://[^'\"]+)|(?:/(?:alma|ilias3)/[^'\"]+)|(?:goto\.php/[^'\"]+))['\"]")
    for script in soup.find_all("script"):
        script_text = script.get_text(" ", strip=False)
        if not script_text:
            continue
        for match in pattern.finditer(script_text):
            candidate = urljoin(page_url, unescape(match.group(1)))
            matches.append(candidate)
    return matches


def _extract_forms(soup: BeautifulSoup, page_url: str) -> list[FormArtifact]:
    artifacts: list[FormArtifact] = []
    for form in soup.find_all("form"):
        action = urljoin(page_url, form.get("action", page_url))
        method = form.get("method", "get").upper()
        field_names = sorted(
            {
                field.get("name", "").strip()
                for field in form.find_all(["input", "select", "textarea"])
                if field.get("name", "").strip()
            }
        )
        button_names = sorted(
            {
                button.get("name", "").strip()
                for button in form.find_all(["button", "input"])
                if button.get("name", "").strip()
                and (button.name == "button" or button.get("type") == "submit")
            }
        )
        artifacts.append(
            FormArtifact(
                page_url=page_url,
                action_url=action,
                method=method,
                field_names=tuple(field_names),
                button_names=tuple(button_names),
            )
        )
    return artifacts


def _record_route(
    route_map: dict[tuple[str, tuple[str, ...]], RouteArtifact],
    *,
    url: str,
    method: str,
    source: str,
    page_url: str,
) -> None:
    path, query_keys = _route_key(url)
    artifact = route_map.setdefault(
        (path, query_keys),
        RouteArtifact(path=path, query_keys=query_keys, sample_url=url),
    )
    artifact.methods.add(method.upper())
    artifact.sources.add(source)
    artifact.sample_pages.add(page_url)
    if artifact.sample_url is None:
        artifact.sample_url = url


def discover_routes(
    *,
    session: requests.Session,
    start_urls: Iterable[str],
    allowed_hosts: set[str],
    depth: int,
    max_pages: int,
    request_timeout: int,
) -> dict[str, object]:
    queue: deque[tuple[str, int]] = deque((_normalize_url(url), 0) for url in start_urls)
    visited: set[str] = set()
    pages: list[dict[str, object]] = []
    forms: list[FormArtifact] = []
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

        final_url = _normalize_url(response.url)
        if final_url not in visited:
            visited.add(final_url)

        soup = BeautifulSoup(response.text, "html.parser")
        title = soup.title.get_text(" ", strip=True) if soup.title else None
        pages.append({"url": final_url, "status": response.status_code, "title": title})

        for link in soup.find_all("a", href=True):
            discovered_url = _normalize_url(urljoin(final_url, link["href"]))
            if not _should_capture(discovered_url, allowed_hosts):
                continue
            _record_route(route_map, url=discovered_url, method="GET", source="link", page_url=final_url)
            if current_depth < depth and _should_follow(discovered_url, allowed_hosts) and discovered_url not in visited:
                queue.append((discovered_url, current_depth + 1))

        page_forms = _extract_forms(soup, final_url)
        forms.extend(page_forms)
        for form_artifact in page_forms:
            normalized_action_url = _normalize_url(form_artifact.action_url)
            if not _should_capture(normalized_action_url, allowed_hosts):
                continue
            _record_route(
                route_map,
                url=normalized_action_url,
                method=form_artifact.method,
                source="form",
                page_url=final_url,
            )
            if (
                current_depth < depth
                and form_artifact.method == "GET"
                and _should_follow(normalized_action_url, allowed_hosts)
                and normalized_action_url not in visited
            ):
                queue.append((normalized_action_url, current_depth + 1))

        for discovered_url in _collect_script_routes(soup, final_url):
            normalized = _normalize_url(discovered_url)
            if not _should_capture(normalized, allowed_hosts):
                continue
            _record_route(route_map, url=normalized, method="GET", source="script", page_url=final_url)
            if current_depth < depth and _should_follow(normalized, allowed_hosts) and normalized not in visited:
                queue.append((normalized, current_depth + 1))

    route_rows = [
        {
            "path": artifact.path,
            "query_keys": list(artifact.query_keys),
            "methods": sorted(artifact.methods),
            "sources": sorted(artifact.sources),
            "sample_url": artifact.sample_url,
            "sample_pages": sorted(artifact.sample_pages)[:3],
        }
        for artifact in sorted(route_map.values(), key=lambda item: (item.path, item.query_keys))
    ]
    form_rows = [
        {
            "page_url": artifact.page_url,
            "action_url": artifact.action_url,
            "method": artifact.method,
            "field_names": list(artifact.field_names),
            "button_names": list(artifact.button_names),
        }
        for artifact in forms
    ]
    return {
        "pages": pages,
        "routes": route_rows,
        "forms": form_rows,
    }


def _build_session(site: str, authenticated: bool) -> tuple[requests.Session, tuple[str, ...]]:
    if site == "alma":
        client = AlmaClient()
        if authenticated:
            username, password = read_uni_credentials()
            if not username or not password:
                raise AlmaParseError(
                    "Set UNI_USERNAME and UNI_PASSWORD for authenticated crawling. "
                    "Legacy ALMA_* and ILIAS_* env vars are still supported as fallbacks."
                )
            client.login(username=username, password=password)
            return client.session, (client.start_page_url, client.public_module_search_url)
        return client.session, DEFAULT_ALMA_START_URLS

    client = IliasClient()
    if authenticated:
        username, password = read_uni_credentials()
        if not username or not password:
            raise AlmaParseError(
                "Set UNI_USERNAME and UNI_PASSWORD for authenticated crawling. "
                "Legacy ALMA_* and ILIAS_* env vars are still supported as fallbacks."
            )
        client.login(username=username, password=password)
        return client.session, ("https://ovidius.uni-tuebingen.de/ilias3/goto.php/root/1",)
    return client.session, DEFAULT_ILIAS_START_URLS


def _render_markdown(report: dict[str, object], *, site: str, authenticated: bool) -> str:
    lines = [
        f"# {site.upper()} Route Discovery",
        "",
        f"- Authenticated crawl: {'yes' if authenticated else 'no'}",
        f"- Pages crawled: {len(report['pages'])}",
        f"- Unique routes: {len(report['routes'])}",
        f"- Forms detected: {len(report['forms'])}",
        "",
        "## Routes",
        "",
        "| Method(s) | Path | Query keys | Source(s) | Sample URL |",
        "| --- | --- | --- | --- | --- |",
    ]
    for route in report["routes"]:
        lines.append(
            "| "
            + ", ".join(route["methods"])
            + " | "
            + route["path"]
            + " | "
            + ", ".join(route["query_keys"])
            + " | "
            + ", ".join(route["sources"])
            + " | "
            + (route["sample_url"] or "")
            + " |"
        )

    lines.extend(["", "## Forms", ""])
    for form in report["forms"]:
        lines.extend(
            [
                f"### {form['method']} {form['action_url']}",
                f"- Seen on: {form['page_url']}",
                f"- Fields: {', '.join(form['field_names']) or '(none)'}",
                f"- Buttons: {', '.join(form['button_names']) or '(none)'}",
                "",
            ]
        )
    return "\n".join(lines)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Crawl Alma or ILIAS and report discovered routes, form actions, and field names.",
    )
    parser.add_argument("site", choices=("alma", "ilias"), help="Target site to crawl.")
    parser.add_argument("--auth", action="store_true", help="Use local credentials and crawl an authenticated session.")
    parser.add_argument("--depth", type=int, default=1, help="Maximum follow depth for discovered same-origin pages.")
    parser.add_argument("--max-pages", type=int, default=40, help="Maximum pages to crawl before stopping.")
    parser.add_argument("--timeout", type=int, default=20, help="HTTP timeout in seconds.")
    parser.add_argument("--format", choices=("json", "markdown"), default="markdown", help="Output format.")
    parser.add_argument(
        "--start-url",
        action="append",
        default=[],
        help="Override the default start URLs. Can be passed multiple times.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        session, default_start_urls = _build_session(args.site, args.auth)
        start_urls = tuple(args.start_url) or default_start_urls
        allowed_hosts = {urlparse(url).netloc for url in start_urls if urlparse(url).netloc}
        report = discover_routes(
            session=session,
            start_urls=start_urls,
            allowed_hosts=allowed_hosts,
            depth=max(0, args.depth),
            max_pages=max(1, args.max_pages),
            request_timeout=max(1, args.timeout),
        )
    except AlmaError as error:
        print(f"route-discovery error: {error}", file=sys.stderr)
        return 1

    payload = {
        "site": args.site,
        "authenticated": args.auth,
        "start_urls": list(start_urls),
        **report,
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, ensure_ascii=False))
    else:
        print(_render_markdown(payload, site=args.site, authenticated=args.auth))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

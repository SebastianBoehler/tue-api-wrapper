from __future__ import annotations

import base64
import json
import re
from typing import Iterable
from urllib.parse import parse_qs, quote, urljoin, urlparse

import requests
from bs4 import BeautifulSoup, Tag

from .config import DEFAULT_TIMEOUT_SECONDS
from .timms_models import (
    TimmsChapter,
    TimmsItemDetail,
    TimmsMetadataField,
    TimmsSearchPage,
    TimmsSearchResult,
    TimmsStreamVariant,
    TimmsTreeItem,
    TimmsTreeNode,
    TimmsTreePage,
)

TIMMS_BASE_URL = "https://timms.uni-tuebingen.de"
_TOTAL_HITS_RE = re.compile(r"(\d[\d.]*)\s+Treffer")
_BACKGROUND_IMAGE_RE = re.compile(r"background-image:url\(([^)]+)\)")
_MYTOK_RE = re.compile(r"mytok\s*=\s*'([^']+)'")
def _absolute_url(path: str) -> str:
    return urljoin(f"{TIMMS_BASE_URL}/", path)

def _item_id_from_url(url: str) -> str:
    return urlparse(url).path.rstrip("/").split("/")[-1]

def _parse_start_seconds(label: str, href: str | None = None) -> int | None:
    if href:
        start_values = parse_qs(urlparse(href).query).get("starttime")
        if start_values:
            try:
                return int(float(start_values[0]))
            except ValueError:
                pass
    parts = label.strip().split(":")
    if len(parts) != 3:
        return None
    try:
        hours = int(parts[0])
        minutes = int(parts[1])
        seconds = float(parts[2])
    except ValueError:
        return None
    return int(hours * 3600 + minutes * 60 + seconds)

def parse_timms_search_page(html: str, source_url: str, *, query: str, offset: int, limit: int) -> TimmsSearchPage:
    soup = BeautifulSoup(html, "html.parser")
    content = soup.select_one("#content")
    if content is None:
        raise ValueError("TIMMS search page does not expose a #content container.")
    heading = content.find("h1")
    total_hits = 0
    if heading is not None:
        match = _TOTAL_HITS_RE.search(heading.get_text(" ", strip=True))
        if match:
            total_hits = int(match.group(1).replace(".", ""))
    results: list[TimmsSearchResult] = []
    for title_heading in content.find_all("h2"):
        link = title_heading.find("a", href=True)
        if link is None:
            continue
        item_url = _absolute_url(link["href"])
        detail_block = title_heading.find_next_sibling("div")
        preview_image_url = None
        duration_label = None
        chapters: list[TimmsChapter] = []
        if detail_block is not None:
            preview = detail_block.find(attrs={"data-myprev": True})
            if preview is not None:
                preview_box = preview.find("div", style=lambda value: value and "background-image" in value)
                if preview_box is not None and preview_box.has_attr("style"):
                    match = _BACKGROUND_IMAGE_RE.search(preview_box["style"])
                    if match:
                        preview_image_url = _absolute_url(match.group(1))
                duration_cell = preview.find("td", string=lambda value: value and ":" in value)
                if duration_cell is not None:
                    duration_label = duration_cell.get_text(" ", strip=True)
            for row in detail_block.select("table tr"):
                time_cell = row.select_one("td.infoitem")
                chapter_link = row.select_one("td.infoitemcontent a[href]")
                if time_cell is None or chapter_link is None:
                    continue
                chapter_url = _absolute_url(chapter_link["href"])
                start_label = time_cell.get_text(" ", strip=True)
                chapters.append(
                    TimmsChapter(
                        start_seconds=_parse_start_seconds(start_label, chapter_link["href"]),
                        start_label=start_label,
                        title=chapter_link.get_text(" ", strip=True),
                        url=chapter_url,
                    )
                )
        results.append(
            TimmsSearchResult(
                item_id=_item_id_from_url(item_url),
                title=link.get_text(" ", strip=True),
                item_url=item_url,
                preview_image_url=preview_image_url,
                duration_label=duration_label,
                chapters=chapters,
            )
        )
    return TimmsSearchPage(query=query, total_hits=total_hits, offset=offset, limit=limit, source_url=source_url, results=results[:limit])

def parse_timms_item_page(html: str, source_url: str) -> TimmsItemDetail:
    soup = BeautifulSoup(html, "html.parser")
    title_node = soup.select_one(".title")
    if title_node is None:
        raise ValueError("TIMMS item page did not expose the title block.")
    player_iframe = soup.select_one('iframe[src*="/Player/EPlayer"]')
    metadata_table = soup.select_one("table td.md-name")
    citation_downloads: dict[str, str] = {}
    for link in soup.select("a.citedown[href]"):
        citation_downloads[link.get_text(" ", strip=True).lower()] = _absolute_url(link["href"])
    metadata: list[TimmsMetadataField] = []
    if metadata_table is not None:
        table = metadata_table.find_parent("table")
        if table is not None:
            for row in table.select("tr"):
                name_cell = row.select_one("td.md-name")
                value_cell = row.select_one("td.md-val")
                if name_cell is None or value_cell is None:
                    continue
                label = name_cell.get_text(" ", strip=True).replace(":", "")
                link = value_cell.find("a", href=True)
                metadata.append(
                    TimmsMetadataField(
                        label=label,
                        value=" ".join(value_cell.stripped_strings),
                        url=_absolute_url(link["href"]) if link is not None else None,
                    )
                )
    return TimmsItemDetail(
        item_id=_item_id_from_url(source_url),
        title=title_node.get_text(" ", strip=True),
        creator=(soup.select_one(".creator").get_text(" ", strip=True) if soup.select_one(".creator") else None),
        player_url=_absolute_url(player_iframe["src"]) if player_iframe is not None else None,
        citation_downloads=citation_downloads,
        metadata=metadata,
        source_url=source_url,
    )

def parse_timms_player_page(html: str) -> list[TimmsStreamVariant]:
    match = _MYTOK_RE.search(html)
    if match is None:
        raise ValueError("TIMMS player page did not expose the encoded source-file token.")
    payload = base64.b64decode(match.group(1)).decode("utf-8")
    data = json.loads(payload)
    streams: list[TimmsStreamVariant] = []
    for entry in data:
        streams.append(
            TimmsStreamVariant(
                url=str(entry.get("Url", "")),
                width=_safe_int(entry.get("Width")),
                height=_safe_int(entry.get("Height")),
                bitrate=_safe_int(entry.get("Bitrate")),
                provider=_clean_text(entry.get("Provider")),
                streamer=_clean_text(entry.get("Streamer")),
                )
        )
    return streams

def parse_timms_tree_page(html: str, source_url: str) -> TimmsTreePage:
    soup = BeautifulSoup(html, "html.parser")
    content = soup.select_one("#content")
    if content is None:
        raise ValueError("TIMMS tree page does not expose a #content container.")
    container = content.find("div", class_="opennodecontainer")
    if container is None:
        return TimmsTreePage(source_url=source_url, selected_node_id=None)
    nodes: list[TimmsTreeNode] = []
    _walk_tree(container, depth=0, nodes=nodes)
    items = _parse_visible_tree_items(content.select('a[href*="/tp/"]'))
    open_nodes = [node for node in nodes if node.is_open]
    selected_node_id = open_nodes[-1].node_id if open_nodes else None
    return TimmsTreePage(source_url=source_url, selected_node_id=selected_node_id, nodes=nodes, items=items)

def _walk_tree(container: Tag, *, depth: int, nodes: list[TimmsTreeNode]) -> None:
    open_header = container.find("div", class_="opennode", recursive=False)
    if open_header is not None:
        link = open_header.find("a", href=True)
        if link is not None:
            nodes.append(_parse_tree_node(link, depth=depth, is_open=True))
    for child in container.find_all("div", recursive=False):
        classes = set(child.get("class", []))
        if "closednode" in classes:
            link = child.find("a", href=True)
            if link is not None:
                nodes.append(_parse_tree_node(link, depth=depth + 1, is_open=False))
        elif "opennodecontainer" in classes and child is not container:
            _walk_tree(child, depth=depth + 1, nodes=nodes)

def _parse_tree_node(link: Tag, *, depth: int, is_open: bool) -> TimmsTreeNode:
    params = parse_qs(urlparse(link["href"]).query)
    node_id = params.get("nodeid", [link.get("id", "")])[0]
    node_path = params.get("nodepath", [""])[0]
    return TimmsTreeNode(
        node_id=node_id,
        node_path=node_path,
        label=link.get_text(" ", strip=True),
        depth=depth,
        is_open=is_open,
    )

def _parse_visible_tree_items(links: Iterable[Tag]) -> list[TimmsTreeItem]:
    by_id: dict[str, TimmsTreeItem] = {}
    items: list[TimmsTreeItem] = []
    for link in links:
        item_url = _absolute_url(link["href"])
        item_id = _item_id_from_url(item_url)
        if "?starttime=" in link["href"]:
            continue
        title = link.get_text(" ", strip=True)
        existing = by_id.get(item_id)
        if existing is not None:
            if title and not existing.title:
                existing.title = title
            continue
        item = TimmsTreeItem(item_id=item_id, title=title, url=item_url)
        by_id[item_id] = item
        items.append(item)
    return items

def _safe_int(value: object) -> int | None:
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None

def _clean_text(value: object) -> str | None:
    text = str(value).strip() if value is not None else ""
    return text or None

class TimmsClient:
    def __init__(self, *, timeout: int = DEFAULT_TIMEOUT_SECONDS) -> None:
        self.timeout = timeout

    def suggest(self, term: str, *, limit: int = 8) -> list[str]:
        response = requests.get(
            _absolute_url("/Search/AutoCompleteSearch"),
            params={"term": term},
            timeout=self.timeout,
        )
        response.raise_for_status()
        payload = response.json()
        return [str(item.get("value", "")).strip() for item in payload[:limit] if str(item.get("value", "")).strip()]

    def search(self, query: str, *, offset: int = 0, limit: int = 20) -> TimmsSearchPage:
        params = {"InputQueryString": query}
        path = "/Search/_QueryControl"
        if offset or limit != 20:
            path = "/Search/ListTimecode"
            params.update({"Offset": offset, "FetchNext": limit, "Hits": 0, "ShowLabel": "False"})
        response = requests.get(_absolute_url(path), params=params, timeout=self.timeout)
        response.raise_for_status()
        return parse_timms_search_page(response.text, response.url, query=query, offset=offset, limit=limit)

    def fetch_item(self, item_id: str) -> TimmsItemDetail:
        response = requests.get(_absolute_url(f"/tp/{quote(item_id, safe='')}"), timeout=self.timeout)
        response.raise_for_status()
        return parse_timms_item_page(response.text, response.url)

    def fetch_streams(self, item_id: str) -> list[TimmsStreamVariant]:
        response = requests.get(
            _absolute_url("/Player/EPlayer"),
            params={"id": item_id, "t": "0.0"},
            timeout=self.timeout,
        )
        response.raise_for_status()
        return parse_timms_player_page(response.text)

    def fetch_tree(self, *, node_id: str | None = None, node_path: str | None = None) -> TimmsTreePage:
        session = requests.Session()
        response = session.get(_absolute_url("/List/Browse"), timeout=self.timeout)
        response.raise_for_status()
        if node_id and node_path:
            response = session.get(
                _absolute_url("/List/OpenNode"),
                params={"nodepath": node_path, "nodeid": node_id},
                timeout=self.timeout,
            )
            response.raise_for_status()
        return parse_timms_tree_page(response.text, response.url)

    def fetch_citation(self, item_id: str, *, format_name: str) -> requests.Response:
        response = requests.get(
            _absolute_url("/api/Cite"),
            params={"id": item_id, "format": format_name},
            timeout=self.timeout,
        )
        response.raise_for_status()
        return response

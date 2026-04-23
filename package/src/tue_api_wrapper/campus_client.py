from __future__ import annotations

from dataclasses import replace
from functools import lru_cache
from urllib.parse import parse_qs, unquote, urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from .campus_models import (
    CampusAreaLink,
    CampusBuildingDetail,
    CampusBuildingDirectory,
    CampusBuildingSummary,
    CampusCanteen,
    CampusMenu,
)
from .config import DEFAULT_TIMEOUT_SECONDS

MY_STUWE_BASE_URL = "https://www.my-stuwe.de"
MEALPLAN_API_URL = f"{MY_STUWE_BASE_URL}/wp-json/mealplans/v1"
BUILDING_DIRECTORY_URL = (
    "https://uni-tuebingen.de/universitaet/standort-und-anfahrt/lageplaene/adressenliste/"
)
TUEBINGEN_CANTEEN_PAGES: dict[int, str] = {
    611: f"{MY_STUWE_BASE_URL}/mensa/mensa-wilhelmstrasse-tuebingen/",
    621: f"{MY_STUWE_BASE_URL}/mensa/mensa-morgenstelle-tuebingen/",
    623: f"{MY_STUWE_BASE_URL}/mensa/mensa-prinz-karl-tuebingen/",
    715: f"{MY_STUWE_BASE_URL}/cafeteria/cafeteria-wilhelmstrasse-tuebingen/",
    724: f"{MY_STUWE_BASE_URL}/cafeteria/cafeteria-morgenstelle-tuebingen/",
}


def _absolute_uni_url(path: str) -> str:
    return urljoin("https://uni-tuebingen.de/", path)


def _area_label_from_path(path: str) -> str | None:
    if "/karte-a-" in path:
        return "Karte A"
    if "/karte-b-" in path:
        return "Karte B"
    if "/karte-c-" in path:
        return "Karte C"
    if "/karte-d-" in path:
        return "Karte D"
    if "/uebersichtsplan/" in path:
        return "Übersichtsplan"
    if "/barrierefreie-zugaenge/" in path:
        return "Barrierefreie Zugänge"
    return None


def _decode_map_address(url: str | None) -> str | None:
    if not url:
        return None
    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    if "query" in query:
        return unquote(query["query"][0]).replace("+", " ")
    if "/place/" in parsed.path:
        return unquote(parsed.path.split("/place/", 1)[1].split("/@", 1)[0]).replace("+", " ")
    return None


def parse_canteen_page(html: str, page_url: str) -> tuple[str | None, str | None, str | None]:
    soup = BeautifulSoup(html, "html.parser")
    title_node = soup.select_one("main h1")
    title = title_node.get_text(" ", strip=True) if title_node is not None else None
    map_link = soup.select_one('a[href*="google"][href]')
    map_url = map_link["href"] if map_link is not None else None
    address = _decode_map_address(map_url)
    return title, address, map_url


def _normalize_string_list(values: object) -> list[str]:
    if not isinstance(values, list):
        return []
    return [str(item).strip() for item in values if str(item).strip()]


def _normalize_photo_payload(value: object) -> dict[str, str] | None:
    if not isinstance(value, dict):
        return None
    normalized = {
        str(key).strip(): str(item).strip()
        for key, item in value.items()
        if str(key).strip() and str(item).strip()
    }
    return normalized or None


def filter_canteen_menus(canteen: CampusCanteen, menu_date: str | None = None) -> CampusCanteen:
    if not menu_date:
        return canteen
    return replace(
        canteen,
        menus=[menu for menu in canteen.menus if menu.menu_date == menu_date],
    )


def parse_building_directory_page(html: str, source_url: str) -> CampusBuildingDirectory:
    soup = BeautifulSoup(html, "html.parser")
    area_links: list[CampusAreaLink] = []
    seen_paths: set[str] = set()
    for link in soup.select('a[href*="/universitaet/standort-und-anfahrt/lageplaene/"]'):
        href = link.get("href") or ""
        if "#" in href:
            continue
        path = urlparse(href).path
        label = link.get_text(" ", strip=True)
        if not label or path in seen_paths:
            continue
        if _area_label_from_path(path) and "/adressenliste/" not in path:
            area_links.append(CampusAreaLink(label=label, path=path, url=_absolute_uni_url(path)))
            seen_paths.add(path)
    buildings: list[CampusBuildingSummary] = []
    seen_buildings: set[str] = set()
    for table in soup.select("table.ut-table--striped")[1:]:
        for link in table.select('a.internal-link[href*="/universitaet/standort-und-anfahrt/lageplaene/"]'):
            path = urlparse(link.get("href") or "").path
            if not path or path in seen_buildings or path.endswith("/adressenliste/"):
                continue
            seen_buildings.add(path)
            buildings.append(
                CampusBuildingSummary(
                    title=link.get_text(" ", strip=True),
                    path=path,
                    url=_absolute_uni_url(path),
                    area_label=_area_label_from_path(path),
                )
            )
    return CampusBuildingDirectory(source_url=source_url, area_links=area_links, buildings=buildings)


def parse_building_detail_page(
    html: str,
    source_url: str,
    *,
    marker_payload: dict[str, object] | None = None,
) -> CampusBuildingDetail:
    soup = BeautifulSoup(html, "html.parser")
    main = soup.select_one("#ut-identifier--main-content")
    if main is None:
        raise ValueError("Building detail page did not expose the main content container.")
    title_node = main.select_one("ul.ut-list li strong") or main.select_one("h1")
    subtitle_node = main.select_one("h1")
    address_block = main.select_one("div.column-count-0 p")
    address_lines = [line.strip() for line in address_block.get_text("\n", strip=True).splitlines() if line.strip()] if address_block else []
    detail_rows = main.select("table.ut-table--striped tr")
    building_number = None
    map_label = None
    for row in detail_rows:
        cells = row.select("td")
        if len(cells) < 2:
            continue
        key = cells[0].get_text(" ", strip=True)
        value = cells[1].get_text(" ", strip=True)
        if key and key != value and building_number is None:
            building_number = value
        if "Karte" in value and map_label is None:
            map_label = value
    marker = (marker_payload or {}).get("markers", [{}])[0] if marker_payload else {}
    image = main.select_one("picture source[srcset]")
    return CampusBuildingDetail(
        title=title_node.get_text(" ", strip=True) if title_node is not None else "Campus building",
        subtitle=(subtitle_node.get_text(" ", strip=True) if subtitle_node is not None else None),
        address_lines=address_lines,
        building_number=building_number,
        map_label=map_label,
        image_url=(image.get("srcset") if image is not None else None),
        marker_title=(str(marker.get("markertitle", "")).strip() or None),
        marker_description=(str(marker.get("markerdescription", "")).strip() or None),
        latitude=(float(marker["latitude"]) if marker.get("latitude") is not None else None),
        longitude=(float(marker["longitude"]) if marker.get("longitude") is not None else None),
        source_url=source_url,
    )


class CampusClient:
    def __init__(self, *, timeout: int = DEFAULT_TIMEOUT_SECONDS) -> None:
        self.timeout = timeout

    def fetch_tuebingen_canteens(self, menu_date: str | None = None) -> list[CampusCanteen]:
        response = requests.get(f"{MEALPLAN_API_URL}/canteens", params={"lang": "de"}, timeout=self.timeout)
        response.raise_for_status()
        payload = response.json()
        return [
            filter_canteen_menus(self._build_canteen(payload[str(canteen_id)], canteen_id), menu_date)
            for canteen_id in TUEBINGEN_CANTEEN_PAGES
            if str(canteen_id) in payload
        ]

    def fetch_canteen(self, canteen_id: int, menu_date: str | None = None) -> CampusCanteen:
        response = requests.get(f"{MEALPLAN_API_URL}/canteens/{canteen_id}", params={"lang": "de"}, timeout=self.timeout)
        response.raise_for_status()
        payload = response.json()
        if str(canteen_id) not in payload:
            raise ValueError(f"Canteen {canteen_id} was not returned by the mealplan API.")
        return filter_canteen_menus(self._build_canteen(payload[str(canteen_id)], canteen_id), menu_date)

    @lru_cache(maxsize=1)
    def fetch_buildings(self) -> CampusBuildingDirectory:
        response = requests.get(BUILDING_DIRECTORY_URL, timeout=self.timeout)
        response.raise_for_status()
        return parse_building_directory_page(response.text, response.url)

    def fetch_building_detail(self, path: str) -> CampusBuildingDetail:
        response = requests.get(_absolute_uni_url(path), timeout=self.timeout)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        marker_node = soup.select_one("[data-osm-markerurl]")
        marker_payload = None
        if marker_node is not None and marker_node.has_attr("data-osm-markerurl"):
            marker_response = requests.get(_absolute_uni_url(marker_node["data-osm-markerurl"]), timeout=self.timeout)
            marker_response.raise_for_status()
            marker_payload = marker_response.json()
        return parse_building_detail_page(response.text, response.url, marker_payload=marker_payload)

    def _build_canteen(self, payload: dict[str, object], canteen_id: int) -> CampusCanteen:
        title, address, map_url = self._fetch_canteen_page_meta(canteen_id)
        menus = [
            CampusMenu(
                id=str(entry.get("id", "")),
                menu_line=(str(entry.get("menuLine", "")).strip() or None),
                menu_date=(str(entry.get("menuDate", "")).strip() or None),
                items=_normalize_string_list(entry.get("menu", [])),
                meats=_normalize_string_list(entry.get("meats", [])),
                student_price=(str(entry.get("studentPrice", "")).strip() or None),
                guest_price=(str(entry.get("guestPrice", "")).strip() or None),
                pupil_price=(str(entry.get("pupilPrice", "")).strip() or None),
                icons=_normalize_string_list(entry.get("icons", [])),
                filters_include=_normalize_string_list(entry.get("filtersInclude", [])),
                allergens=_normalize_string_list(entry.get("allergens", [])),
                additives=_normalize_string_list(entry.get("additives", [])),
                co2=(str(entry.get("co2", "")).strip() or None),
                photo=_normalize_photo_payload(entry.get("photo")),
            )
            for entry in payload.get("menus", [])
        ]
        return CampusCanteen(
            canteen_id=str(payload.get("canteenId", canteen_id)),
            canteen=title or str(payload.get("canteen", "")),
            page_url=TUEBINGEN_CANTEEN_PAGES.get(canteen_id),
            address=address,
            map_url=map_url,
            menus=menus,
        )

    @lru_cache(maxsize=None)
    def _fetch_canteen_page_meta(self, canteen_id: int) -> tuple[str | None, str | None, str | None]:
        page_url = TUEBINGEN_CANTEEN_PAGES.get(canteen_id)
        if not page_url:
            return None, None, None
        response = requests.get(page_url, timeout=self.timeout)
        response.raise_for_status()
        return parse_canteen_page(response.text, response.url)

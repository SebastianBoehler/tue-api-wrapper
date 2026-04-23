from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class CampusMenu:
    id: str
    menu_line: str | None
    menu_date: str | None
    items: list[str]
    meats: list[str]
    student_price: str | None
    guest_price: str | None
    pupil_price: str | None
    icons: list[str]
    filters_include: list[str]
    allergens: list[str]
    additives: list[str]
    co2: str | None
    photo: dict[str, str] | None


@dataclass(slots=True)
class CampusCanteen:
    canteen_id: str
    canteen: str
    page_url: str | None
    address: str | None
    map_url: str | None
    menus: list[CampusMenu] = field(default_factory=list)


@dataclass(slots=True)
class CampusAreaLink:
    label: str
    path: str
    url: str


@dataclass(slots=True)
class CampusBuildingSummary:
    title: str
    path: str
    url: str
    area_label: str | None


@dataclass(slots=True)
class CampusBuildingDirectory:
    source_url: str
    area_links: list[CampusAreaLink] = field(default_factory=list)
    buildings: list[CampusBuildingSummary] = field(default_factory=list)


@dataclass(slots=True)
class CampusBuildingDetail:
    title: str
    subtitle: str | None
    address_lines: list[str]
    building_number: str | None
    map_label: str | None
    image_url: str | None
    marker_title: str | None
    marker_description: str | None
    latitude: float | None
    longitude: float | None
    source_url: str

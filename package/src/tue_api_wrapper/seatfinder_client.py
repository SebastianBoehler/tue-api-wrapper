from __future__ import annotations

from datetime import datetime
import json
import re
from typing import Iterable

import requests

from .config import DEFAULT_TIMEOUT_SECONDS, GERMAN_TIMEZONE
from .seatfinder_models import SeatAvailabilityResponse, SeatLocationStatus

SEATFINDER_API_URL = "https://seatfinder.bibliothek.kit.edu/tuebingen/getdata.php"
DEFAULT_LOCATIONS = (
    "UBH1",
    "UBB2",
    "UBB2HLS",
    "UBA3A",
    "UBA3C",
    "UBA4A",
    "UBA4B",
    "UBA4C",
    "UBA5A",
    "UBA5B",
    "UBA5C",
    "UBA6A",
    "UBA6B",
    "UBA6C",
    "UBCEG",
    "UBCUG",
    "UBLZN",
    "UBNEG",
    "UBWZA",
    "UBWZB",
)


class SeatfinderClient:
    def __init__(self, *, timeout: int = DEFAULT_TIMEOUT_SECONDS, session: requests.Session | None = None) -> None:
        self.timeout = timeout
        self.session = session or requests.Session()

    def fetch_availability(self, locations: Iterable[str] = DEFAULT_LOCATIONS) -> SeatAvailabilityResponse:
        location_csv = ",".join(location.strip() for location in locations if location.strip())
        if not location_csv:
            raise ValueError("At least one seatfinder location id is required.")

        response = self.session.get(
            SEATFINDER_API_URL,
            params=_seatfinder_params(location_csv),
            headers={"accept": "application/json, text/javascript;q=0.9, */*;q=0.8"},
            timeout=self.timeout,
        )
        response.raise_for_status()
        return parse_seatfinder_payload(
            _decode_seatfinder_payload(response.text),
            source_url=response.url,
            retrieved_at=datetime.now(tz=GERMAN_TIMEZONE).isoformat(),
        )


def parse_seatfinder_payload(payload: object, *, source_url: str, retrieved_at: str) -> SeatAvailabilityResponse:
    if not isinstance(payload, list):
        raise ValueError("Seatfinder response was not a list.")

    counts = _first_mapping(payload, "seatestimate")
    locations = _first_mapping(payload, "location")
    statuses = [
        _build_location_status(location_id, rows, counts.get(location_id, []))
        for location_id, rows in sorted(locations.items())
    ]
    return SeatAvailabilityResponse(
        source_url=source_url,
        retrieved_at=retrieved_at,
        locations=[status for status in statuses if status is not None],
    )


def _seatfinder_params(location_csv: str) -> list[tuple[str, str]]:
    return [
        ("location[0]", location_csv),
        ("values[0]", "seatestimate,manualcount"),
        ("after[0]", "-10800seconds"),
        ("before[0]", "now"),
        ("limit[0]", "-17"),
        ("location[1]", location_csv),
        ("values[1]", "location"),
        ("after[1]", ""),
        ("before[1]", "now"),
        ("limit[1]", "1"),
    ]


def _decode_seatfinder_payload(text: str) -> object:
    stripped = text.strip()
    match = re.match(r"^[\w$]+\s*\((.*)\)\s*;?\s*$", stripped, re.DOTALL)
    if match:
        stripped = match.group(1)
    return json.loads(stripped)


def _first_mapping(payload: list[object], key: str) -> dict[str, list[dict[str, object]]]:
    for item in payload:
        if isinstance(item, dict) and isinstance(item.get(key), dict):
            return {
                str(location_id): rows
                for location_id, rows in item[key].items()
                if isinstance(rows, list)
            }
    return {}


def _build_location_status(
    location_id: str,
    location_rows: list[dict[str, object]],
    estimate_rows: list[dict[str, object]],
) -> SeatLocationStatus | None:
    location = _latest_row(location_rows)
    if location is None:
        return None
    estimate = _latest_row(estimate_rows) or {}
    total_seats = _int_or_none(location.get("available_seats"))
    free_seats = _int_or_none(estimate.get("free_seats"))
    occupied_seats = _int_or_none(estimate.get("occupied_seats"))
    if total_seats is None and free_seats is not None and occupied_seats is not None:
        total_seats = free_seats + occupied_seats
    return SeatLocationStatus(
        location_id=location_id,
        name=str(location.get("name") or location_id),
        long_name=_text_or_none(location.get("long_name")),
        level=_text_or_none(location.get("level")),
        building=_text_or_none(location.get("building")),
        room=_text_or_none(location.get("room")),
        total_seats=total_seats,
        free_seats=free_seats,
        occupied_seats=occupied_seats,
        occupancy_percent=_occupancy_percent(occupied_seats, total_seats),
        updated_at=_timestamp_text(estimate.get("timestamp") or location.get("timestamp")),
        url=_text_or_none(location.get("url")),
        geo_coordinates=_text_or_none(location.get("geo_coordinates")),
    )


def _latest_row(rows: list[dict[str, object]]) -> dict[str, object] | None:
    valid_rows = [row for row in rows if isinstance(row, dict)]
    if not valid_rows:
        return None
    return max(valid_rows, key=lambda row: _timestamp_text(row.get("timestamp")) or "")


def _timestamp_text(value: object) -> str | None:
    if isinstance(value, dict):
        raw_date = _text_or_none(value.get("date"))
        if raw_date:
            try:
                return datetime.strptime(raw_date, "%Y-%m-%d %H:%M:%S.%f").replace(tzinfo=GERMAN_TIMEZONE).isoformat()
            except ValueError:
                return raw_date
    return _text_or_none(value)


def _occupancy_percent(occupied_seats: int | None, total_seats: int | None) -> float | None:
    if occupied_seats is None or not total_seats:
        return None
    return round((occupied_seats / total_seats) * 100, 1)


def _int_or_none(value: object) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _text_or_none(value: object) -> str | None:
    text = str(value).strip() if value is not None else ""
    return text or None

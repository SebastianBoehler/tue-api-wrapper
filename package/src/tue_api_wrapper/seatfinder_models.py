from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class SeatLocationStatus:
    location_id: str
    name: str
    long_name: str | None
    level: str | None
    building: str | None
    room: str | None
    total_seats: int | None
    free_seats: int | None
    occupied_seats: int | None
    occupancy_percent: float | None
    updated_at: str | None
    url: str | None
    geo_coordinates: str | None


@dataclass(slots=True)
class SeatAvailabilityResponse:
    source_url: str
    retrieved_at: str
    locations: list[SeatLocationStatus] = field(default_factory=list)

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CalendarRoomDetails:
    room_default: str | None
    room_short: str | None
    room_long: str | None
    floor_default: str | None
    floor_short: str | None
    floor_long: str | None
    building_default: str | None
    building_short: str | None
    building_long: str | None
    campus_default: str | None
    campus_short: str | None
    campus_long: str | None
    detail_url: str | None
    display_text: str | None

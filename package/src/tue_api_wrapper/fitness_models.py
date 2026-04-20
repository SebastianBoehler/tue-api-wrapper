from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class KufOccupancyPage:
    facility_name: str
    source_url: str
    image_url: str


@dataclass(slots=True)
class KufTrainingOccupancy:
    facility_id: str
    facility_name: str
    count: int
    source_url: str
    image_url: str
    retrieved_at: datetime
    refresh_after_seconds: int

from __future__ import annotations

import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tue_api_wrapper.seatfinder_client import parse_seatfinder_payload


class SeatfinderClientTests(unittest.TestCase):
    def test_parse_seatfinder_payload_maps_latest_counts(self) -> None:
        payload = [
            {
                "seatestimate": {
                    "UBH1": [
                        {
                            "timestamp": {"date": "2026-05-03 10:12:34.000000"},
                            "location_name": "UBH1",
                            "free_seats": 162,
                            "occupied_seats": 6,
                        },
                        {
                            "timestamp": {"date": "2026-05-03 10:16:34.000000"},
                            "location_name": "UBH1",
                            "free_seats": 160,
                            "occupied_seats": 8,
                        },
                    ]
                },
                "manualcount": {"UBH1": []},
            },
            {
                "location": {
                    "UBH1": [
                        {
                            "timestamp": {"date": "2026-05-03 10:10:00.000000"},
                            "name": "UBH1",
                            "long_name": "Lernzentrum, Hauptgebäude, 1. OG",
                            "level": "1",
                            "building": None,
                            "room": None,
                            "available_seats": 168,
                            "geo_coordinates": "48.52539;9.06189",
                            "url": "https://uni-tuebingen.de/",
                        }
                    ]
                }
            },
        ]

        response = parse_seatfinder_payload(payload, source_url="https://seatfinder.example/getdata.php", retrieved_at="2026-05-03T10:20:00+02:00")

        self.assertEqual(response.source_url, "https://seatfinder.example/getdata.php")
        self.assertEqual(len(response.locations), 1)
        status = response.locations[0]
        self.assertEqual(status.location_id, "UBH1")
        self.assertEqual(status.free_seats, 160)
        self.assertEqual(status.occupied_seats, 8)
        self.assertEqual(status.total_seats, 168)
        self.assertEqual(status.occupancy_percent, 4.8)
        self.assertEqual(status.updated_at, "2026-05-03T10:16:34+02:00")


if __name__ == "__main__":
    unittest.main()

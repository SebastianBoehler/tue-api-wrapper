from __future__ import annotations

import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tue_api_wrapper.campus_client import CampusClient, filter_canteen_menus
from tue_api_wrapper.campus_models import CampusCanteen, CampusMenu


class CampusFoodContractTests(unittest.TestCase):
    def test_build_canteen_maps_menu_contract_fields(self) -> None:
        client = CampusClient()
        client._fetch_canteen_page_meta = lambda _: (
            "Mensa Wilhelmstraße",
            "Wilhelmstraße 13 72074 Tübingen",
            "https://www.google.com/maps/search/?api=1&query=Wilhelmstraße+13+72074+Tübingen",
        )

        canteen = client._build_canteen(
            {
                "canteenId": "611",
                "canteen": "Ignored because page title wins",
                "menus": [
                    {
                        "id": "513",
                        "menuLine": "Tagesmenü vegan",
                        "menuDate": "2026-05-07",
                        "menu": ["Sojageschnetzeltes", "Kartoffelrösti", "Blattsalat"],
                        "meats": [],
                        "studentPrice": "3,70",
                        "guestPrice": "8,35",
                        "pupilPrice": "8,35",
                        "icons": ["vegan"],
                        "filtersInclude": ["vegan"],
                        "allergens": ["Se", "So"],
                        "additives": ["1", "4"],
                        "co2": None,
                        "photo": {
                            "thumbnail": "https://example.test/thumb.jpg",
                            "full": "https://example.test/full.jpg",
                        },
                    }
                ],
            },
            611,
        )

        self.assertEqual(canteen.canteen_id, "611")
        self.assertEqual(canteen.canteen, "Mensa Wilhelmstraße")
        self.assertEqual(canteen.address, "Wilhelmstraße 13 72074 Tübingen")
        self.assertEqual(canteen.menus[0].items, ["Sojageschnetzeltes", "Kartoffelrösti", "Blattsalat"])
        self.assertEqual(canteen.menus[0].filters_include, ["vegan"])
        self.assertEqual(canteen.menus[0].meats, [])
        self.assertEqual(canteen.menus[0].photo, {
            "thumbnail": "https://example.test/thumb.jpg",
            "full": "https://example.test/full.jpg",
        })

    def test_filter_canteen_menus_limits_results_to_one_date(self) -> None:
        canteen = CampusCanteen(
            canteen_id="611",
            canteen="Mensa Wilhelmstraße",
            page_url="https://www.my-stuwe.de/mensa/mensa-wilhelmstrasse-tuebingen/",
            address="Wilhelmstraße 13 72074 Tübingen",
            map_url="https://www.google.com/maps/search/?api=1&query=Wilhelmstraße+13+72074+Tübingen",
            menus=[
                CampusMenu(
                    id="one",
                    menu_line="Tagesmenü vegan",
                    menu_date="2026-04-23",
                    items=["Curry"],
                    meats=[],
                    student_price="3,70",
                    guest_price="8,35",
                    pupil_price="8,35",
                    icons=["vegan"],
                    filters_include=["vegan"],
                    allergens=["Se"],
                    additives=[],
                    co2=None,
                    photo=None,
                ),
                CampusMenu(
                    id="two",
                    menu_line="Pasta",
                    menu_date="2026-04-24",
                    items=["Pasta"],
                    meats=["Rind"],
                    student_price="4,20",
                    guest_price="8,85",
                    pupil_price="8,85",
                    icons=[],
                    filters_include=[],
                    allergens=["GlW"],
                    additives=["1"],
                    co2="1.7",
                    photo=None,
                ),
            ],
        )

        filtered = filter_canteen_menus(canteen, "2026-04-23")

        self.assertEqual([menu.id for menu in filtered.menus], ["one"])
        self.assertEqual([menu.id for menu in canteen.menus], ["one", "two"])


if __name__ == "__main__":
    unittest.main()

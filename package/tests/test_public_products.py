from __future__ import annotations

import base64
import json
import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tue_api_wrapper.campus_client import (
    parse_building_detail_page,
    parse_building_directory_page,
    parse_canteen_page,
)
from tue_api_wrapper.praxisportal_client import (
    build_praxisportal_filter_options,
    map_praxisportal_detail,
)
from tue_api_wrapper.timms_client import parse_timms_item_page, parse_timms_player_page
from tue_api_wrapper.talks_client import build_talks_response, map_talk


class PublicProductContractTests(unittest.TestCase):
    def test_parse_timms_item_page_extracts_metadata_and_citations(self) -> None:
        html = """
        <html><body>
          <div class="creator">Lensch, Hendrik (2013)</div>
          <div class="title">Vorlesung Informatik II, 32. Stunde</div>
          <iframe src="/Player/EPlayer?id=UT_20130620_002_info2b_0001&t=0.0"></iframe>
          <a class="citedown" href="/api/Cite?id=UT_20130620_002_info2b_0001&format=bibtex">bibtex</a>
          <table>
            <tr><td class="md-name">title:</td><td class="md-val">Vorlesung Informatik II, 32. Stunde</td></tr>
            <tr><td class="md-name">language:</td><td class="md-val">ger</td></tr>
            <tr><td class="md-name">rights:</td><td class="md-val">Url: <a href="https://timmsstatic.uni-tuebingen.de/rights">rights</a></td></tr>
          </table>
        </body></html>
        """

        detail = parse_timms_item_page(html, "https://timms.uni-tuebingen.de/tp/UT_20130620_002_info2b_0001")

        self.assertEqual(detail.item_id, "UT_20130620_002_info2b_0001")
        self.assertEqual(detail.title, "Vorlesung Informatik II, 32. Stunde")
        self.assertEqual(detail.creator, "Lensch, Hendrik (2013)")
        self.assertTrue(detail.player_url.endswith("/Player/EPlayer?id=UT_20130620_002_info2b_0001&t=0.0"))
        self.assertIn("bibtex", detail.citation_downloads)
        self.assertEqual(detail.metadata[1].label, "language")
        self.assertEqual(detail.metadata[1].value, "ger")
        self.assertEqual(detail.metadata[2].url, "https://timmsstatic.uni-tuebingen.de/rights")

    def test_parse_timms_player_page_decodes_stream_variants(self) -> None:
        payload = base64.b64encode(
            json.dumps(
                [
                    {
                        "Width": 512,
                        "Height": 288,
                        "Bitrate": 364,
                        "Url": "https://timms-ms09.uni-tuebingen.de/sample.512x288b0364.mp4",
                        "Provider": "https",
                        "Streamer": "timms-ms09.uni-tuebingen.de",
                    },
                    {
                        "Width": 640,
                        "Height": 360,
                        "Bitrate": 564,
                        "Url": "https://timms-ms09.uni-tuebingen.de/sample.640x360b0564.mp4",
                        "Provider": "https",
                        "Streamer": "timms-ms09.uni-tuebingen.de",
                    },
                ]
            ).encode("utf-8")
        ).decode("ascii")
        html = f"<html><script>var mytok = '{payload}';</script></html>"

        streams = parse_timms_player_page(html)

        self.assertEqual(len(streams), 2)
        self.assertEqual(streams[0].height, 288)
        self.assertEqual(streams[1].bitrate, 564)
        self.assertTrue(streams[1].url.endswith("sample.640x360b0564.mp4"))

    def test_map_praxisportal_detail_and_filter_options(self) -> None:
        detail = map_praxisportal_detail(
            {
                "id": 55953,
                "title": "Cyber-Sicherheit",
                "job_description": "Build and secure distributed systems.",
                "requirements": "Python and networking.",
                "location": "Köln / München",
                "created_at": 1751355723000,
                "start_date": 1798761600,
                "end_date": None,
                "project_type": [{"id": 1, "name": "Internship"}],
                "industry": [{"id": 35, "title": "Informationsmanagement, -technologie"}],
                "organization": [{"id": 1320, "name": "Bundesamt für Verfassungsschutz", "logo": "https://example/logo.png"}],
            }
        )
        options = build_praxisportal_filter_options({"35": 3479, "47": 1948}, {35: "Informationsmanagement, -technologie", 47: "Technik, Technologie"})

        self.assertEqual(detail.id, 55953)
        self.assertEqual(detail.project_types, ["Internship"])
        self.assertEqual(detail.organizations[0].name, "Bundesamt für Verfassungsschutz")
        self.assertEqual([option.label for option in options], ["Informationsmanagement, -technologie", "Technik, Technologie"])

    def test_parse_campus_pages_extract_directory_and_detail(self) -> None:
        directory_html = """
        <html><body>
          <table class="ut-table--striped"><tr><td><a href="/universitaet/standort-und-anfahrt/lageplaene/adressenliste/#c1">A B C</a></td></tr></table>
          <a href="/universitaet/standort-und-anfahrt/lageplaene/karte-a-morgenstelle/">Karte A: Morgenstelle</a>
          <table class="ut-table--striped">
            <tr><td><a class="internal-link" href="/universitaet/standort-und-anfahrt/lageplaene/karte-a-morgenstelle/auf-der-morgenstelle-26/">Auf der Morgenstelle 26</a></td></tr>
            <tr><td><a class="internal-link" href="/universitaet/standort-und-anfahrt/lageplaene/karte-d-altstadt/alte-aula/">Alte Aula</a></td></tr>
          </table>
        </body></html>
        """
        building_html = """
        <html><body>
          <main id="ut-identifier--main-content">
            <h1>Lagepläne - Karte A</h1>
            <ul class="ut-list"><li><strong>Mensa II Morgenstelle und Cafeteria</strong></li></ul>
            <div class="column-count-0"><p>Auf der Morgenstelle 26<br/>72076 Tübingen</p></div>
            <table class="ut-table--striped">
              <tr><td>Auf der Morgenstelle 26</td><td><strong>Nr. 14</strong></td></tr>
              <tr><td>Übersichtsplan</td><td><strong>Karte A</strong></td></tr>
            </table>
            <div data-osm-markerurl="/markers.json"></div>
            <picture><source srcset="/image.jpg" /></picture>
          </main>
        </body></html>
        """
        canteen_html = """
        <html><body>
          <main><h1>Mensa Wilhelmstraße</h1></main>
          <a href="https://www.google.com/maps/search/?api=1&query=Wilhelmstraße%2013%2072074%20Tübingen">Map</a>
        </body></html>
        """

        directory = parse_building_directory_page(directory_html, "https://uni-tuebingen.de/adressenliste/")
        detail = parse_building_detail_page(
            building_html,
            "https://uni-tuebingen.de/auf-der-morgenstelle-26/",
            marker_payload={"markers": [{"markertitle": "14", "markerdescription": "Mensa II", "latitude": 48.535164, "longitude": 9.03604}]},
        )
        title, address, map_url = parse_canteen_page(canteen_html, "https://www.my-stuwe.de/mensa/mensa-wilhelmstrasse-tuebingen/")

        self.assertEqual(directory.area_links[0].label, "Karte A: Morgenstelle")
        self.assertEqual(directory.buildings[0].area_label, "Karte A")
        self.assertEqual(detail.title, "Mensa II Morgenstelle und Cafeteria")
        self.assertEqual(detail.address_lines, ["Auf der Morgenstelle 26", "72076 Tübingen"])
        self.assertEqual(detail.latitude, 48.535164)
        self.assertEqual(title, "Mensa Wilhelmstraße")
        self.assertEqual(address, "Wilhelmstraße 13 72074 Tübingen")
        self.assertIn("google.com/maps/search", map_url or "")

    def test_map_talks_payload_and_filter_response(self) -> None:
        talk = map_talk(
            {
                "id": 958,
                "title": "Multimodal interaction across languages",
                "timestamp": "2026-05-05T10:15:00",
                "description": "Abstract: tba",
                "location": "Lecture Hall 23, Kupferbau",
                "speaker_name": "Dr. Paula Rubio-Fernandez",
                "speaker_bio": "",
                "disabled": False,
                "tags": [{"id": 42, "name": "Guest speaker"}],
            }
        )
        hidden = map_talk(
            {
                "id": 949,
                "title": "Hidden talk",
                "timestamp": "2026-05-12T12:30:00",
                "disabled": True,
                "tags": [{"id": 41, "name": "Group meeting"}],
            }
        )

        response = build_talks_response(
            [talk, hidden],
            scope="upcoming",
            query="rubio",
            tag_ids=[42],
            limit=10,
        )

        self.assertEqual(response.total_hits, 1)
        self.assertEqual(response.items[0].id, 958)
        self.assertEqual(response.items[0].source_url, "https://talks.tuebingen.ai/talks/talk/id=958")
        self.assertEqual([tag.name for tag in response.available_tags], ["Guest speaker"])


if __name__ == "__main__":
    unittest.main()

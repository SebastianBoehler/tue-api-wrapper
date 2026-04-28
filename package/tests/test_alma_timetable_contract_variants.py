from __future__ import annotations

from datetime import datetime
from pathlib import Path
import sys
import unittest
from zoneinfo import ZoneInfo

import requests

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tue_api_wrapper.alma_timetable_html import build_timetable_action_request, parse_timetable_contract
from tue_api_wrapper.alma_timetable_rooms import enrich_calendar_occurrences, extract_timetable_room_entries
from tue_api_wrapper.client import AlmaClient
from tue_api_wrapper.html_contract import extract_timetable_export_url, extract_timetable_terms
from tue_api_wrapper.models import CalendarOccurrence
from tue_api_wrapper.portal_service import DEFAULT_DASHBOARD_TERM, normalize_dashboard_term


DYNAMIC_TIMETABLE_HTML = """
<form id="j_id_7" action="/alma/pages/plan/individualTimetable.xhtml?_flowId=individualTimetableSchedule-flow">
  <input type="hidden" name="activePageElementId" value="" />
  <input type="hidden" name="refreshButtonClickedId" value="" />
  <input type="hidden" name="javax.faces.ViewState" value="e2s1" />
  <select name="j_id_7:scheduleConfiguration:anzeigeoptionen:changeTerm_input">
    <option value="236">Winter 2025/26</option>
    <option value="229" selected="selected" data-title="Sommer 2026">Sommer 2026</option>
  </select>
  <button
    name="j_id_7:scheduleConfiguration:anzeigeoptionen:refreshChangeTerm"
    type="submit"
    value="aktualisieren"
  ></button>
  <select name="j_id_7:scheduleConfiguration:anzeigeoptionen:auswahl_zeitraum_input">
    <option value="woche" selected="selected">Wochenauswahl</option>
    <option value="zeitraum">Zeitraum</option>
  </select>
  <textarea name="j_id_7:scheduleConfiguration:anzeigeoptionen:ical:cal_add">
    https://alma.example/export?hash=abc&amp;termgroup=
  </textarea>
  <button name="j_id_7:scheduleConfiguration:anzeigeoptionen:print" type="submit"></button>
  <button name="j_id_7:scheduleConfiguration:anzeigeoptionen:ical:renewSecurityToken" type="submit"></button>
</form>
"""

TERM_SELECTOR_FREE_TIMETABLE_HTML = """
<form id="plan" action="/alma/pages/plan/individualTimetable.xhtml?_flowId=individualTimetableSchedule-flow">
  <textarea name="plan:scheduleConfiguration:anzeigeoptionen:ical:cal_add">
    https://alma.example/export?hash=abc&amp;termgroup=
  </textarea>
</form>
"""

ROOM_DETAIL_TIMETABLE_HTML = """
<div class="schedulePanel" id="plan:schedule:scheduleColumn:0:termin:0:scheduleItem:schedulePanelGroup">
  <div class="scheduleItemInnerContent">
    <h3 class="scheduleTitle">INFO4195b AI for Scientific Discovery</h3>
    <span id="plan:schedule:scheduleColumn:0:termin:0:scheduleItem:weekdayDefaulttext">Mittwoch</span>
    <span id="plan:schedule:scheduleColumn:0:termin:0:scheduleItem:processingTimes">18:00 bis 20:00</span>
    <span id="plan:schedule:scheduleColumn:0:termin:0:scheduleItem:scheduleStartDate">15.04.2026</span>
    <span id="plan:schedule:scheduleColumn:0:termin:0:scheduleItem:scheduleEndDate">22.07.2026</span>
    <a href="/alma/pages/cm/exa/searchRoomDetail.xhtml?roomId=470"
       id="plan:schedule:scheduleColumn:0:termin:0:scheduleItem:roomDefaulttext:showRoomDetailLink">
      <span>Hörsaal A1 (A-206)</span>
    </a>
    <span id="plan:schedule:scheduleColumn:0:termin:0:scheduleItem:floorDefaulttext">EG</span>
    <span id="plan:schedule:scheduleColumn:0:termin:0:scheduleItem:buildingDefaulttext">
      Cyber Valley Campus, MVL1
    </span>
    <span id="plan:schedule:scheduleColumn:0:termin:0:scheduleItem:campusDefaulttext">Morgenstelle</span>
  </div>
</div>
"""

SIMPLE_ICS = "\r\n".join(
    [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        "UID:test-1",
        "SUMMARY:Machine Learning Seminar",
        "DTSTART;TZID=Europe/Berlin:20260413T101500",
        "DTEND;TZID=Europe/Berlin:20260413T114500",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
)


def _response(url: str, text: str) -> requests.Response:
    response = requests.Response()
    response.status_code = 200
    response.url = url
    response._content = text.encode("utf-8")
    response.encoding = "utf-8"
    return response


class _FakeSession:
    def __init__(self, responses: list[requests.Response]) -> None:
        self.headers: dict[str, str] = {}
        self.responses = responses
        self.urls: list[str] = []

    def get(self, url: str, **_: object) -> requests.Response:
        self.urls.append(url)
        return self.responses.pop(0)


class AlmaTimetableContractVariantTests(unittest.TestCase):
    def test_relative_dashboard_terms_use_default_term(self) -> None:
        self.assertEqual(normalize_dashboard_term("this semester"), DEFAULT_DASHBOARD_TERM)
        self.assertEqual(normalize_dashboard_term("current-term"), DEFAULT_DASHBOARD_TERM)
        self.assertEqual(normalize_dashboard_term("Sommer 2026"), "Sommer 2026")

    def test_legacy_helpers_accept_dynamic_jsf_root_ids(self) -> None:
        self.assertEqual(extract_timetable_terms(DYNAMIC_TIMETABLE_HTML)["Sommer 2026"], "229")
        self.assertEqual(
            extract_timetable_export_url(DYNAMIC_TIMETABLE_HTML),
            "https://alma.example/export?hash=abc&termgroup=",
        )

    def test_timetable_contract_accepts_dynamic_jsf_root_ids(self) -> None:
        contract = parse_timetable_contract(DYNAMIC_TIMETABLE_HTML, "https://alma.example/timetable")

        self.assertEqual(contract.selected_term_label, "Sommer 2026")
        self.assertEqual(contract.selected_range_mode_value, "woche")
        self.assertTrue(contract.print_available)
        self.assertTrue(contract.can_refresh_export_url)

    def test_timetable_action_request_uses_dynamic_field_names(self) -> None:
        request = build_timetable_action_request(
            DYNAMIC_TIMETABLE_HTML,
            "https://alma.example/timetable",
            trigger_name="plan:scheduleConfiguration:anzeigeoptionen:refreshChangeTerm",
            field_overrides={"plan:scheduleConfiguration:anzeigeoptionen:changeTerm_input": "236"},
        )

        self.assertEqual(
            request.payload["j_id_7:scheduleConfiguration:anzeigeoptionen:changeTerm_input"],
            "236",
        )
        self.assertEqual(
            request.payload["activePageElementId"],
            "j_id_7:scheduleConfiguration:anzeigeoptionen:refreshChangeTerm",
        )
        self.assertIn("j_id_7:scheduleConfiguration:anzeigeoptionen:refreshChangeTerm", request.payload)

    def test_client_uses_export_url_when_term_selector_is_missing(self) -> None:
        export_url = "https://alma.example/export?hash=abc&termgroup="
        session = _FakeSession([
            _response("https://alma.example/timetable", TERM_SELECTOR_FREE_TIMETABLE_HTML),
            _response(export_url, SIMPLE_ICS),
        ])
        client = AlmaClient(base_url="https://alma.example", session=session)

        timetable = client.fetch_timetable_for_term("Sommer 2026")

        self.assertEqual(timetable.term_id, "")
        self.assertEqual(timetable.export_url, export_url)
        self.assertEqual(timetable.available_terms, {})
        self.assertEqual(session.urls[-1], export_url)

    def test_timetable_room_entries_include_detailed_room_fields(self) -> None:
        entries = extract_timetable_room_entries(ROOM_DETAIL_TIMETABLE_HTML, "https://alma.example/timetable")

        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0].weekday, 2)
        self.assertEqual(entries[0].start_time, "18:00")
        self.assertEqual(entries[0].room_details.floor_default, "EG")
        self.assertEqual(entries[0].room_details.building_default, "Cyber Valley Campus, MVL1")
        self.assertEqual(entries[0].room_details.campus_default, "Morgenstelle")
        self.assertEqual(
            entries[0].room_details.display_text,
            "Hörsaal A1 (A-206), EG, Cyber Valley Campus, MVL1, Morgenstelle",
        )
        self.assertEqual(
            entries[0].room_details.detail_url,
            "https://alma.example/alma/pages/cm/exa/searchRoomDetail.xhtml?roomId=470",
        )

    def test_calendar_occurrences_are_enriched_with_room_details(self) -> None:
        entries = extract_timetable_room_entries(ROOM_DETAIL_TIMETABLE_HTML, "https://alma.example/timetable")
        occurrence = CalendarOccurrence(
            summary="INFO4195b AI for Scientific Discovery",
            start=datetime(2026, 4, 22, 18, 0, tzinfo=ZoneInfo("Europe/Berlin")),
            end=datetime(2026, 4, 22, 20, 0, tzinfo=ZoneInfo("Europe/Berlin")),
            location="Hörsaal A1 (A-206) Cyber Valley Campus, MVL1",
            description=None,
        )

        enriched = enrich_calendar_occurrences((occurrence,), entries)

        self.assertEqual(
            enriched[0].location,
            "Hörsaal A1 (A-206), EG, Cyber Valley Campus, MVL1, Morgenstelle",
        )
        self.assertEqual(enriched[0].room_details, entries[0].room_details)


if __name__ == "__main__":
    unittest.main()

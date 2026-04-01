from __future__ import annotations

from datetime import datetime
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tue_api_wrapper.alma_catalog_client import fetch_course_catalog_page
from tue_api_wrapper.alma_timetable_client import fetch_timetable_pdf, fetch_timetable_view, refresh_timetable_export_url
from tue_api_wrapper.client import AlmaClient
from tue_api_wrapper.models import CalendarOccurrence, TimetableResult


TIMETABLE_HTML = """
<form id="plan" action="/alma/pages/plan/individualTimetable.xhtml?_flowId=individualTimetableSchedule-flow&_flowExecutionKey=e2s1">
  <input type="hidden" name="activePageElementId" value="" />
  <input type="hidden" name="refreshButtonClickedId" value="" />
  <input type="hidden" name="navigationPosition" value="hisinoneMeinStudium,individualTimetableSchedule" />
  <input type="hidden" name="authenticity_token" value="token-1" />
  <input type="hidden" name="javax.faces.ViewState" value="e2s1" />
  <select name="plan:scheduleConfiguration:anzeigeoptionen:changeTerm_input">
    <option value="236">Winter 2025/26</option>
    <option value="229" selected="selected">Sommer 2026</option>
  </select>
  <button name="plan:scheduleConfiguration:anzeigeoptionen:refreshChangeTerm" type="submit" value="aktualisieren"></button>
  <select name="plan:scheduleConfiguration:anzeigeoptionen:auswahl_zeitraum_input">
    <option value="woche" selected="selected">Wochenauswahl</option>
    <option value="zeitraum">Zeitraum</option>
  </select>
  <button name="plan:scheduleConfiguration:anzeigeoptionen:refreshAuswahlZeitraum" type="submit" value="aktualisieren"></button>
  <select name="plan:scheduleConfiguration:anzeigeoptionen:selectWeek_input">
    <option value="11_2026" selected="selected">11. KW: 09.03.2026 - 15.03.2026</option>
    <option value="12_2026">12. KW: 16.03.2026 - 22.03.2026</option>
  </select>
  <button name="plan:scheduleConfiguration:anzeigeoptionen:refreshSelectWeek" type="submit" value="aktualisieren"></button>
  <button name="plan:scheduleConfiguration:anzeigeoptionen:print" type="submit" value="PDF-Dokument erstellen"></button>
  <textarea name="plan:scheduleConfiguration:anzeigeoptionen:ical:cal_add">https://alma.example/export?hash=oldhash&amp;termgroup=</textarea>
  <button name="plan:scheduleConfiguration:anzeigeoptionen:ical:renewSecurityToken" type="submit" value="Sicherheitsmaßnahmen erneuern"></button>
</form>
<div class="planFrame">
  <ul class="plan">
    <li class="column" title="Fr., 14.03.2026">
      <div class="colhead">
        <h2>Fr., 14.03.2026</h2>
        <button name="plan:schedule:scheduleColumn:0:showOnlyOneDay" type="submit"></button>
      </div>
    </li>
    <li class="column" title="Sa., 15.03.2026">
      <div class="colhead">
        <h2>Sa., 15.03.2026</h2>
        <button name="plan:schedule:scheduleColumn:1:showOnlyOneDay" type="submit"></button>
      </div>
    </li>
  </ul>
</div>
"""

TIMETABLE_REFRESHED_HTML = TIMETABLE_HTML.replace("oldhash", "newhash")
TIMETABLE_WEEK_12_HTML = TIMETABLE_HTML.replace('value="11_2026" selected="selected"', 'value="11_2026"').replace(
    'value="12_2026">12. KW: 16.03.2026 - 22.03.2026',
    'value="12_2026" selected="selected">12. KW: 16.03.2026 - 22.03.2026',
)

COURSE_CATALOG_HTML = """
<form id="detailViewData" action="/alma/pages/cm/exa/coursecatalog/showCourseCatalog.xhtml?_flowId=showCourseCatalog-flow&_flowExecutionKey=e7s4">
  <input type="hidden" name="javax.faces.ViewState" value="e7s4" />
  <input type="hidden" name="detailViewData_SUBMIT" value="1" />
  <select name="detailViewData:tabContainer:term-selection-container:termPeriodDropDownList_input">
    <option value="236" selected="selected">Wintersemester 2025/26</option>
    <option value="229">Sommersemester 2026</option>
  </select>
</form>
<table class="treeTableWithIcons">
  <tr class="treeTableCellLevel1">
    <td><img class="imagetop" alt="Studiengang" /></td>
    <td id="node:0:ot_3">Current catalog</td>
    <td id="node:0:ot_4">Default term</td>
    <td><input id="autologinRequestUrl" value="https://alma.example/catalog/current" /></td>
  </tr>
</table>
"""

COURSE_CATALOG_SUMMER_HTML = COURSE_CATALOG_HTML.replace(
    '<option value="236" selected="selected">Wintersemester 2025/26</option>\n    <option value="229">Sommersemester 2026</option>',
    '<option value="236">Wintersemester 2025/26</option>\n    <option value="229" selected="selected">Sommersemester 2026</option>',
).replace("Current catalog", "Summer catalog")


class _FakeResponse:
    def __init__(
        self,
        *,
        url: str,
        text: str = "",
        content: bytes | None = None,
        status_code: int = 200,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.url = url
        self._text = text
        self._content = content if content is not None else text.encode("utf-8")
        self.status_code = status_code
        self.headers = headers or {"content-type": "text/html; charset=utf-8"}

    @property
    def text(self) -> str:
        return self._text or self._content.decode("utf-8", errors="ignore")

    @property
    def content(self) -> bytes:
        return self._content

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise AssertionError(f"Unexpected HTTP status {self.status_code} for {self.url}")


class _RecordingSession:
    def __init__(self, *, get_responses: list[_FakeResponse], post_responses: list[_FakeResponse]) -> None:
        self._get_responses = list(get_responses)
        self._post_responses = list(post_responses)
        self.headers: dict[str, str] = {}
        self.posts: list[tuple[str, dict[str, str]]] = []

    def get(self, url: str, timeout: int, allow_redirects: bool = True) -> _FakeResponse:
        if not self._get_responses:
            raise AssertionError(f"No fake GET response left for {url}")
        return self._get_responses.pop(0)

    def post(self, url: str, data: dict[str, str], timeout: int, allow_redirects: bool = True) -> _FakeResponse:
        self.posts.append((url, dict(data)))
        if not self._post_responses:
            raise AssertionError(f"No fake POST response left for {url}")
        return self._post_responses.pop(0)


class _FakeAlmaClient(AlmaClient):
    def __init__(self, *, session: _RecordingSession, timetable_result: TimetableResult | None = None) -> None:
        super().__init__(base_url="https://alma.example", session=session)
        self._timetable_result = timetable_result

    def fetch_timetable_for_term(self, term_label: str) -> TimetableResult:
        if self._timetable_result is None:
            raise AssertionError("This fake Alma client has no timetable fixture.")
        return self._timetable_result


class AlmaDiscoveryFeatureTests(unittest.TestCase):
    def test_fetch_timetable_view_custom_range_keeps_weekend_days(self) -> None:
        timetable_result = TimetableResult(
            term_label="Sommer 2026",
            term_id="229",
            export_url="https://alma.example/export?hash=oldhash&termgroup=229",
            raw_ics="BEGIN:VCALENDAR",
            events=(),
            occurrences=(
                CalendarOccurrence(
                    summary="Friday lecture",
                    start=datetime.fromisoformat("2026-03-13T10:00:00"),
                    end=None,
                    location="A1",
                    description=None,
                ),
                CalendarOccurrence(
                    summary="Weekend block",
                    start=datetime.fromisoformat("2026-03-14T09:00:00"),
                    end=None,
                    location="A2",
                    description=None,
                ),
                CalendarOccurrence(
                    summary="Sunday tutorial",
                    start=datetime.fromisoformat("2026-03-15T12:00:00"),
                    end=None,
                    location="A3",
                    description=None,
                ),
            ),
            available_terms={"Sommer 2026": "229"},
        )
        session = _RecordingSession(
            get_responses=[_FakeResponse(url="https://alma.example/timetable", text=TIMETABLE_HTML)],
            post_responses=[],
        )
        client = _FakeAlmaClient(session=session, timetable_result=timetable_result)

        view = fetch_timetable_view(client, term="229", from_date="2026-03-14", to_date="2026-03-15")

        self.assertEqual([day.iso_date for day in view.days], ["2026-03-14", "2026-03-15"])
        self.assertEqual([item.summary for item in view.occurrences], ["Weekend block", "Sunday tutorial"])

    def test_refresh_timetable_export_url_posts_refresh_trigger(self) -> None:
        session = _RecordingSession(
            get_responses=[
                _FakeResponse(url="https://alma.example/timetable", text=TIMETABLE_HTML),
                _FakeResponse(url="https://alma.example/timetable", text=TIMETABLE_HTML),
            ],
            post_responses=[_FakeResponse(url="https://alma.example/timetable", text=TIMETABLE_REFRESHED_HTML)],
        )
        client = _FakeAlmaClient(session=session)

        refreshed = refresh_timetable_export_url(client, term="229")

        self.assertEqual(len(session.posts), 1)
        self.assertEqual(
            session.posts[0][1]["plan:scheduleConfiguration:anzeigeoptionen:ical:renewSecurityToken"],
            "Sicherheitsmaßnahmen erneuern",
        )
        self.assertEqual(session.posts[0][1]["DISABLE_VALIDATION"], "true")
        self.assertEqual(session.posts[0][1]["DISABLE_AUTOSCROLL"], "true")
        self.assertIn("hash=newhash", refreshed.calendar_feed_url or "")

    def test_fetch_course_catalog_page_posts_requested_term(self) -> None:
        session = _RecordingSession(
            get_responses=[_FakeResponse(url="https://alma.example/catalog", text=COURSE_CATALOG_HTML)],
            post_responses=[_FakeResponse(url="https://alma.example/catalog", text=COURSE_CATALOG_SUMMER_HTML)],
        )
        client = _FakeAlmaClient(session=session)

        page = fetch_course_catalog_page(client, term="229")

        self.assertEqual(page.selected_term_value, "229")
        self.assertEqual(page.nodes[0].title, "Summer catalog")
        self.assertEqual(
            session.posts[0][1]["detailViewData:tabContainer:term-selection-container:termPeriodDropDownList_input"],
            "229",
        )
        self.assertEqual(session.posts[0][1]["DISABLE_VALIDATION"], "true")
        self.assertEqual(
            session.posts[0][1]["detailViewData:_idcl"],
            "detailViewData:tabContainer:term-planning-container:tabs:parallelGroupsTab",
        )

    def test_fetch_timetable_pdf_switches_week_before_printing(self) -> None:
        session = _RecordingSession(
            get_responses=[_FakeResponse(url="https://alma.example/timetable", text=TIMETABLE_HTML)],
            post_responses=[
                _FakeResponse(url="https://alma.example/timetable", text=TIMETABLE_WEEK_12_HTML),
                _FakeResponse(
                    url="https://alma.example/timetable.pdf",
                    content=b"%PDF-1.4 fake alma pdf",
                    headers={"content-type": "application/pdf"},
                ),
            ],
        )
        client = _FakeAlmaClient(session=session)

        pdf_response = fetch_timetable_pdf(client, week="12_2026")

        self.assertEqual(pdf_response.content, b"%PDF-1.4 fake alma pdf")
        self.assertEqual(
            session.posts[0][1]["plan:scheduleConfiguration:anzeigeoptionen:selectWeek_input"],
            "12_2026",
        )
        self.assertIn("plan:scheduleConfiguration:anzeigeoptionen:print", session.posts[1][1])


if __name__ == "__main__":
    unittest.main()

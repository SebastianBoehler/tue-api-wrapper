from __future__ import annotations

from datetime import datetime
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tue_api_wrapper.alma_course_assignments_client import _slots_for_occurrences
from tue_api_wrapper.alma_course_credits import extract_detail_credits, extract_occurrence_credits
from tue_api_wrapper.alma_detail_html import parse_module_detail_page
from tue_api_wrapper.client import AlmaClient
from tue_api_wrapper.models import CalendarOccurrence


EVENT_DETAIL_HTML = """
<form id="detailViewData" action="/alma/pages/plan/individualTimetable.xhtml?_flowId=individualTimetableSchedule-flow">
  <input type="hidden" name="javax.faces.ViewState" value="e1s9" />
  <input type="hidden" name="detailViewData_SUBMIT" value="1" />
  <input name="detailViewData:tabContainer:term-planning-container:modules:moduleAssignments:moduleAssignmentsNavi2NumRowsInput" value="10" />
  <input name="detailViewData:tabContainer:term-planning-container:courseOfStudies:courseOfStudyAssignments:courseOfStudyAssignmentsNavi2NumRowsInput" value="10" />
  <button
    id="detailViewData:tabContainer:term-planning-container:tabs:modulesCourseOfStudiesTab"
    name="detailViewData:tabContainer:term-planning-container:tabs:modulesCourseOfStudiesTab"
    class="active tabButton"
    type="submit"
    value="Module / Studiengänge"
  >Module / Studiengänge</button>
  <button
    name="detailViewData:tabContainer:term-planning-container:buttons:showAllModules"
    type="submit"
    value="Studiengangsrelevante Module anzeigen"
  ></button>
</form>
<div id="form:dialogHeader:dataBox">
  <span><strong>Probabilistic Machine Learning (Probabilistic Inference and Learning) |</strong></span>
  <span>ML4202 |</span>
  <span>Veranstaltung</span>
</div>
<div class="boxStandard">
  <div class="box_title"><h2>Grunddaten</h2></div>
  <div class="box_content">
    <div class="labelItemLine">
      <label>Titel</label>
      <div class="answer">Probabilistic Machine Learning (Probabilistic Inference and Learning)</div>
    </div>
    <div class="labelItemLine">
      <label>Nummer</label>
      <div class="answer">ML4202</div>
    </div>
    <div class="labelItemLine">
      <label>Kurzkommentar</label>
      <div class="answer">9 CP</div>
    </div>
    <div class="labelItemLine">
      <label>CP</label>
      <div class="answer">9.0</div>
    </div>
  </div>
</div>
<div class="boxStandard">
  <div class="box_title"><h2>Semesterplanung</h2></div>
  <div class="box_content">
    <table><tr><td>
      <table>
        <tr><th>Modulnummer</th><th>Modulname (Kurztext)</th><th>Modulname</th><th>Angebotshäufigkeit</th></tr>
        <tr><td>ML-4202</td><td>88|970|H|2023-ML-4202</td><td>Probabilistic Inference and Learning</td><td>nur im Sommersemester</td></tr>
      </table>
    </td></tr></table>
    <table>
      <tr><th>Standardtext</th><th>Typ</th><th>Abschluss</th><th>Fach</th></tr>
      <tr><td>Master Machine Learning (H-2021-7)</td><td>Vollstudiengang</td><td>Master</td><td>Machine Learning</td></tr>
    </table>
  </div>
</div>
"""

EVENT_DETAIL_EXPANDED_HTML = EVENT_DETAIL_HTML.replace(
    "</table>\n    </td></tr></table>",
    "<tr><td>MACH-FML</td><td>88|705|H|2021-MACH-FML</td><td>Foundations of Machine Learning</td><td></td></tr>"
    "</table>\n    </td></tr></table>",
)


class _FakeResponse:
    def __init__(self, *, url: str, text: str) -> None:
        self.url = url
        self.text = text

    def raise_for_status(self) -> None:
        return None


class _RecordingSession:
    def __init__(self) -> None:
        self.headers: dict[str, str] = {}
        self.posts: list[dict[str, str]] = []

    def get(self, url: str, timeout: int, allow_redirects: bool = True) -> _FakeResponse:
        return _FakeResponse(url=url, text=EVENT_DETAIL_HTML)

    def post(self, url: str, data: dict[str, str], timeout: int, allow_redirects: bool = True) -> _FakeResponse:
        self.posts.append(dict(data))
        return _FakeResponse(url=url, text=EVENT_DETAIL_EXPANDED_HTML)


class AlmaCourseAssignmentTests(unittest.TestCase):
    def test_parse_event_detail_header_and_leaf_assignment_tables(self) -> None:
        detail = parse_module_detail_page(EVENT_DETAIL_HTML, "https://alma.example/detail")

        self.assertEqual(detail.title, "Probabilistic Machine Learning (Probabilistic Inference and Learning)")
        self.assertEqual(detail.number, "ML4202")
        self.assertEqual(len(detail.module_study_program_tables), 2)
        self.assertEqual(
            detail.module_study_program_tables[0].rows[0],
            ("ML-4202", "88|970|H|2023-ML-4202", "Probabilistic Inference and Learning", "nur im Sommersemester"),
        )
        self.assertEqual(
            detail.module_study_program_tables[1].rows[0],
            ("Master Machine Learning (H-2021-7)", "Vollstudiengang", "Master", "Machine Learning"),
        )
        credits = extract_detail_credits(detail)
        self.assertIsNotNone(credits)
        self.assertEqual(credits.value if credits is not None else None, 9)

    def test_fetch_detail_expands_assignment_row_limits(self) -> None:
        session = _RecordingSession()
        client = AlmaClient(base_url="https://alma.example", session=session)

        detail = client.fetch_public_module_detail("https://alma.example/detail")

        self.assertEqual(len(session.posts), 1)
        post = session.posts[0]
        self.assertEqual(
            post["detailViewData:tabContainer:term-planning-container:modules:moduleAssignments:moduleAssignmentsNavi2NumRowsInput"],
            "300",
        )
        self.assertEqual(
            post["detailViewData:tabContainer:term-planning-container:courseOfStudies:courseOfStudyAssignments:courseOfStudyAssignmentsNavi2NumRowsInput"],
            "300",
        )
        self.assertIn("MACH-FML", {row[0] for row in detail.module_study_program_tables[0].rows})

    def test_extract_occurrence_credit_from_timetable_description(self) -> None:
        credits = extract_occurrence_credits([
            CalendarOccurrence(
                summary="INFO4195b AI for Scientific Discovery",
                start=datetime(2026, 4, 15, 18, 0),
                end=datetime(2026, 4, 15, 20, 0),
                location=None,
                description="3 CP",
            )
        ])

        self.assertIsNotNone(credits)
        self.assertEqual(credits.value if credits is not None else None, 3)

    def test_slots_sort_when_locations_are_missing(self) -> None:
        slots = _slots_for_occurrences([
            CalendarOccurrence(
                summary="INFO4195b AI for Scientific Discovery",
                start=datetime(2026, 4, 15, 18, 0),
                end=datetime(2026, 4, 15, 20, 0),
                location="Maria-von-Linden-Str. 6",
                description=None,
            ),
            CalendarOccurrence(
                summary="INFO4195b AI for Scientific Discovery",
                start=datetime(2026, 4, 15, 18, 0),
                end=datetime(2026, 4, 15, 20, 0),
                location=None,
                description=None,
            ),
        ])

        self.assertEqual(len(slots), 2)
        self.assertIsNone(slots[0].location)
        self.assertEqual(slots[1].location, "Maria-von-Linden-Str. 6")


if __name__ == "__main__":
    unittest.main()

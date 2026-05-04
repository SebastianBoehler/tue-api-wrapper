from __future__ import annotations

import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tue_api_wrapper.alma_planner_html import parse_study_planner_page
from tue_api_wrapper.client import AlmaClient


class AlmaStudyPlannerProgressTests(unittest.TestCase):
    def test_parse_study_planner_page_extracts_credit_progress(self) -> None:
        html = """
        <html><head><title>Studienplaner Master Informatik</title></head><body>
        <table id="enrollTree:modulAnchors:modulAnchorsTable">
          <thead>
            <tr><th><div title="Studiensemester">1. Semester<br />WiSe 2025/26</div></th></tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div class="headerModulePlan">
                  <div class="popupDismissable"><span title="INFO-FOKUS - Studienbereich Info Fokus">Info Fokus</span></div>
                  <span title="CP erworben/soll">6/18</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        </body></html>
        """

        page = parse_study_planner_page(html, "https://alma.example/planner")

        self.assertEqual(page.modules[0].credits_earned, 6.0)
        self.assertEqual(page.modules[0].credits_required, 18.0)
        self.assertEqual(page.modules[0].progress_percent, 33.3)

    def test_alma_client_exposes_study_planner_fetch(self) -> None:
        client = AlmaClient(base_url="https://alma.example", session=_FakeSession())

        page = client.fetch_study_planner()

        self.assertEqual(page.modules[0].number, "INFO-FOKUS")


class _FakeSession:
    headers: dict[str, str] = {}

    def get(self, url: str, **kwargs):
        return _FakeResponse(
            url=url.replace("recordRequest=true", "_flowExecutionKey=e1s1"),
            text="""
            <html><head><title>Studienplaner Master Informatik</title></head><body>
            <table id="enrollTree:modulAnchors:modulAnchorsTable">
              <thead><tr><th><div title="Studiensemester">1. Semester</div></th></tr></thead>
              <tbody><tr><td>
                <div class="headerModulePlan">
                  <div class="popupDismissable"><span title="INFO-FOKUS - Studienbereich Info Fokus">Info Fokus</span></div>
                  <span title="CP erworben/soll">6/18</span>
                </div>
              </td></tr></tbody>
            </table>
            </body></html>
            """,
        )


class _FakeResponse:
    def __init__(self, *, url: str, text: str) -> None:
        self.url = url
        self.text = text

    def raise_for_status(self) -> None:
        return None


if __name__ == "__main__":
    unittest.main()

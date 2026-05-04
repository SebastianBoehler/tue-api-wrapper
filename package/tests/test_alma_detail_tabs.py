from __future__ import annotations

import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tue_api_wrapper.alma_detail_html import extract_module_detail_contract
from tue_api_wrapper.alma_detail_tabs import detail_tabs_to_fetch


DETAIL_HTML = """
<form id="detailViewData" action="/alma/pages/startFlow.xhtml?_flowId=detailView-flow&amp;_flowExecutionKey=e1s1">
  <input type="hidden" name="javax.faces.ViewState" value="e1s1" />
  <input type="hidden" name="detailViewData_SUBMIT" value="1" />
  <button id="detailViewData:tabs:appointments" name="detailViewData:tabs:appointments" class="active tabButton" value="Termine">Termine Aktive Registerkarte</button>
  <button id="detailViewData:tabs:content" name="detailViewData:tabs:content" class="inactive tabButton" value="Inhalte">Inhalte</button>
  <button id="detailViewData:tabs:exams" name="detailViewData:tabs:exams" class="inactive tabButton" value="Gekoppelte Prüfungen">Gekoppelte Prüfungen</button>
  <button id="detailViewData:tabs:modules" name="detailViewData:tabs:modules" class="inactive tabButton" value="Module / Studiengänge">Module / Studiengänge</button>
</form>
"""


class AlmaDetailTabsTests(unittest.TestCase):
    def test_detail_tabs_to_fetch_includes_read_only_course_tabs(self) -> None:
        contract = extract_module_detail_contract(DETAIL_HTML, "https://alma.example/detail")

        tabs = detail_tabs_to_fetch(contract)

        self.assertEqual([tab.label for tab in tabs], ["Inhalte", "Gekoppelte Prüfungen", "Module / Studiengänge"])


if __name__ == "__main__":
    unittest.main()

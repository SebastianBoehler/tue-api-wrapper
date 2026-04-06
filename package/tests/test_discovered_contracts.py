from __future__ import annotations

import json
import io
import sys
import tempfile
from pathlib import Path
import unittest
from contextlib import redirect_stdout

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tue_api_wrapper.alma_course_search_html import extract_course_search_form, parse_course_search_page
from tue_api_wrapper.alma_documents_html import extract_studyservice_page
from tue_api_wrapper.alma_planner_html import parse_study_planner_page
from tue_api_wrapper.ilias_feature_html import extract_ilias_search_form
from tue_api_wrapper.route_discovery import discover_routes_from_har
from tue_api_wrapper.route_discovery_cli import main as route_discovery_main


class DiscoveredContractTests(unittest.TestCase):
    def test_parse_study_planner_page_extracts_semesters_modules_and_flags(self) -> None:
        html = """
        <html><head><title>Studienplaner mit Modulplan Master Informatik</title></head><body>
        <button class="submit_checkbox_tick" name="enrollTree:activeView:switchMusterplan" type="submit">Musterplan</button>
        <button class="submit_checkbox_tick" name="enrollTree:activeView:switchMeineModule" type="submit">Meine Module</button>
        <button class="submit_checkbox" name="enrollTree:activeView:switchAlternativeFachsemester" type="submit">Alternative Semester</button>
        <table id="enrollTree:modulAnchors:modulAnchorsTable">
          <thead>
            <tr>
              <th><div title="Studiensemester">1. Semester<br />WiSe 2025/26</div></th>
              <th><div title="Studiensemester">2. Semester<br />SoSe 2026</div></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="column0" colspan="2">
                <div class="headerModulePlan">
                  <button name="enrollTree:modulAnchors:modulAnchorsTable:0:showModMPlan_0:explodeModule" type="submit"></button>
                  <div class="popupDismissable"><span title="INFO-THEO - Studienbereich Theoretische Informatik">Studienbereich Theoretische Informatik</span></div>
                  <span title="CP erworben/soll">-/18</span>
                </div>
                <h3 class="mouseMoveTitle"><span class="mouseMove">INFO-THEO - Studienbereich Theoretische Informatik</span></h3>
                <a href="/alma/pages/startFlow.xhtml?_flowId=detailView-flow&amp;unitId=63136&amp;periodId=236&amp;navigationPosition=hisinoneStudyPlanner">Details</a>
              </td>
            </tr>
          </tbody>
        </table>
        </body></html>
        """
        page = parse_study_planner_page(html, "https://alma.example/planner")

        self.assertEqual(page.semesters[0].label, "1. Semester")
        self.assertEqual(page.semesters[0].term_label, "WiSe 2025/26")
        self.assertEqual(page.modules[0].number, "INFO-THEO")
        self.assertEqual(page.modules[0].title, "Studienbereich Theoretische Informatik")
        self.assertEqual(page.modules[0].column_span, 2)
        self.assertEqual(page.modules[0].credits_summary, "-/18")
        self.assertTrue(page.modules[0].is_expandable)
        self.assertTrue(page.view_state.show_recommended_plan)
        self.assertTrue(page.view_state.show_my_modules)
        self.assertFalse(page.view_state.show_alternative_semesters)

    def test_extract_course_search_form_extracts_query_and_term_options(self) -> None:
        html = """
        <form id="genericSearchMask" action="/alma/search">
          <input type="hidden" name="activePageElementId" value="" />
          <input type="text" name="genericSearchMask:query" value="" placeholder="z. B. Nummer, Titel, Dozent/-in" />
          <select name="genericSearchMask:termSelect_input">
            <option value=""> </option>
            <option value="eq|31|2026">Wintersemester 2026</option>
            <option value="eq|30|2026" selected="selected" data-title="Sommersemester 2026">Sommersemester 2026</option>
          </select>
          <button name="genericSearchMask:buttonsBottom:search" type="submit">Suchen</button>
        </form>
        """
        form = extract_course_search_form(html, "https://alma.example/course-search")

        self.assertEqual(form.query_field_name, "genericSearchMask:query")
        self.assertEqual(form.term_field_name, "genericSearchMask:termSelect_input")
        self.assertEqual(form.search_button_name, "genericSearchMask:buttonsBottom:search")
        self.assertEqual(form.term_options[1].label, "Sommersemester 2026")
        self.assertTrue(form.term_options[1].is_selected)

    def test_parse_course_search_page_extracts_results(self) -> None:
        html = """
        <form id="genericSearchMask" action="/alma/search">
          <input type="hidden" name="activePageElementId" value="" />
          <input type="text" name="genericSearchMask:query" value="informatik" placeholder="z. B. Nummer, Titel, Dozent/-in" />
          <select name="genericSearchMask:termSelect_input">
            <option value="eq|31|2026">Wintersemester 2026</option>
            <option value="eq|30|2026" selected="selected" data-title="Sommersemester 2026">Sommersemester 2026</option>
          </select>
          <button name="genericSearchMask:buttonsBottom:search" type="submit">Suchen</button>
        </form>
        <table id="genSearchRes:abc:abcTable" class="tableWithBorder table">
          <tr><th></th><th>Nummer</th><th>Titel</th><th>Art</th><th>Verantwortlich</th><th>Durchf.</th><th>Organisationseinheit</th><th>Aktionen</th></tr>
          <tr>
            <td><a href="/alma/pages/startFlow.xhtml?_flowId=detailView-flow&amp;unitId=19917&amp;periodId=229&amp;navigationPosition=searchCourses">Details</a></td>
            <td>BIOINF1110</td>
            <td>Einführung in die Bioinformatik</td>
            <td>Vorlesung/Übung</td>
            <td>Dr. rer. nat. Philipp Thiel</td>
            <td></td>
            <td>Fachbereich Informatik</td>
            <td><a href="/alma/pages/startFlow.xhtml?_flowId=detailView-flow&amp;unitId=19917&amp;periodId=229&amp;navigationPosition=searchCourses">Details</a></td>
          </tr>
        </table>
        """
        page = parse_course_search_page(html, "https://alma.example/search", query="informatik")

        self.assertEqual(page.selected_term_value, "eq|30|2026")
        self.assertEqual(page.selected_term_label, "Sommersemester 2026")
        self.assertEqual(page.results[0].number, "BIOINF1110")
        self.assertEqual(page.results[0].title, "Einführung in die Bioinformatik")
        self.assertEqual(page.results[0].organization, "Fachbereich Informatik")
        self.assertEqual(
            page.results[0].detail_url,
            "https://alma.example/alma/pages/startFlow.xhtml?_flowId=detailView-flow&unitId=19917&periodId=229&navigationPosition=searchCourses",
        )

    def test_extract_ilias_search_form_includes_filter_metadata(self) -> None:
        html = """
        <a name="area_anchor">Veranstaltungen (Magazin)</a>
        <form action="/ilias.php?baseClass=ilsearchcontrollergui&amp;cmd=post&amp;fallbackCmd=performSearch&amp;rtoken=abc" method="post">
          <input type="hidden" name="area" value="0" />
          <input type="text" name="term" value="" />
          <div id="type">
            <label><input type="radio" name="type" value="1" checked="checked" />Suche nach Titeln</label>
            <label><input type="radio" name="type" value="2" />Detailsuche</label>
          </div>
          <input type="checkbox" id="filter_type_file" name="filter_type[file]" value="1" checked="checked" />
          <label for="filter_type_file">Dateien</label>
          <input type="checkbox" id="filter_type_frm" name="filter_type[frm]" value="1" />
          <label for="filter_type_frm">Foren</label>
          <input type="checkbox" name="screation" value="1" checked="checked" />
          <select name="screation_ontype">
            <option value="1" selected="selected">Objekte erstellt nach dem...</option>
            <option value="2">Objekte erstellt vor dem...</option>
          </select>
          <input type="text" name="screation_date" value="15.03.2026" />
          <input type="submit" name="cmd[performSearch]" value="Suche" />
        </form>
        """
        form = extract_ilias_search_form(html, "https://ovidius.example/ilias.php?baseClass=ilSearchControllerGUI")

        self.assertEqual(form.filters.area_label, "Veranstaltungen (Magazin)")
        self.assertEqual(form.filters.area_value, "0")
        self.assertEqual(form.filters.search_modes[0].value, "1")
        self.assertTrue(form.filters.search_modes[0].is_selected)
        self.assertEqual(form.filters.content_types[0].value, "file")
        self.assertTrue(form.filters.content_types[0].is_selected)
        self.assertEqual(form.filters.creation_modes[0].label, "Objekte erstellt nach dem...")
        self.assertTrue(form.filters.creation_enabled)
        self.assertEqual(form.filters.creation_date, "15.03.2026")

    def test_extract_studyservice_page_includes_banner_tabs_and_output_requests(self) -> None:
        html = """
        <form id="studyserviceForm" action="/alma/studyservice">
          <input type="hidden" name="javax.faces.ViewState" value="e2s4" />
          <span id="studyserviceForm:outputTextInforbar">Rückgemeldet für Sommersemester 2026</span>
          <div id="studyserviceForm:fieldsetPersoenlicheData">
            <h2>Personendaten: Sebastian Böhler</h2>
          </div>
          <ul>
            <li><button type="submit" name="studyserviceForm:content.2" class="tabButton">Meine Studiengänge</button></li>
            <li><button type="submit" name="studyserviceForm:content.5" class="tabButton">Kontaktdaten</button></li>
            <li><button type="submit" name="studyserviceForm:content.10" class="tabButton active">Bescheide / Bescheinigungen</button></li>
          </ul>
          <a id="studyserviceForm:report:outputRequests:studentOutputRequests:outputRequestButtonsGroups:0:showOutputRequestGroup">
            Leistungsbescheide
            <span>(0)</span>
            <small>Sie haben noch keine Bescheide.</small>
          </a>
          <button name="studyserviceForm:report:reports:reportButtons:jobConfigurationButtons:0:jobConfigurationButtons:3:job2" type="submit">
            <span class="jobname">Immatrikulationsbescheinigung/Studienbescheinigung/Datenkontrollblatt [PDF]</span>
          </button>
          <a href="/alma/rds?state=docdownload&amp;docId=abc-123">Latest PDF</a>
        </form>
        """

        page = extract_studyservice_page(html, "https://alma.example/alma/pages/cm/stu/studyService/start.xhtml")

        self.assertEqual(page.banner_text, "Rückgemeldet für Sommersemester 2026")
        self.assertEqual(page.person_name, "Sebastian Böhler")
        self.assertEqual(page.active_tab_label, "Bescheide / Bescheinigungen")
        self.assertEqual([tab.label for tab in page.tabs], ["Meine Studiengänge", "Kontaktdaten", "Bescheide / Bescheinigungen"])
        self.assertEqual(page.output_requests[0].label, "Leistungsbescheide")
        self.assertEqual(page.output_requests[0].count, 0)
        self.assertEqual(page.output_requests[0].message, "Sie haben noch keine Bescheide.")
        self.assertTrue(page.latest_download_url.endswith("state=docdownload&docId=abc-123"))

    def test_discover_routes_from_har_extracts_post_triggers(self) -> None:
        har_payload = {
            "log": {
                "entries": [
                    {
                        "request": {
                            "method": "GET",
                            "url": "https://alma.example/alma/start",
                            "headers": [],
                        },
                        "response": {
                            "status": 200,
                            "content": {
                                "mimeType": "text/html",
                                "text": """
                                <html>
                                  <head><title>Start</title></head>
                                  <body>
                                    <a href="/alma/planner">Planner</a>
                                    <form action="/alma/search" method="post">
                                      <input name="query" value="" />
                                      <button name="genericSearchMask:buttonsBottom:search" type="submit">Suchen</button>
                                    </form>
                                  </body>
                                </html>
                                """,
                            },
                        },
                    },
                    {
                        "request": {
                            "method": "POST",
                            "url": "https://alma.example/alma/search",
                            "headers": [{"name": "Referer", "value": "https://alma.example/alma/start"}],
                            "postData": {
                                "params": [
                                    {"name": "query", "value": "bioinformatik"},
                                    {"name": "activePageElementId", "value": "genericSearchMask%3AbuttonsBottom%3Asearch"},
                                    {"name": "javax.faces.source", "value": "genericSearchMask%3AbuttonsBottom%3Asearch"},
                                ]
                            },
                        },
                        "response": {
                            "status": 200,
                            "content": {"mimeType": "text/xml"},
                        },
                    },
                ]
            }
        }

        with tempfile.TemporaryDirectory() as tmpdir:
            har_path = Path(tmpdir) / "session.har"
            har_path.write_text(json.dumps(har_payload), encoding="utf-8")
            report = discover_routes_from_har(har_path=har_path, allowed_hosts={"alma.example"})

        search_route = next(route for route in report["routes"] if route["path"] == "/alma/search")
        self.assertEqual(search_route["methods"], ["POST"])
        self.assertIn("har-request", search_route["sources"])

        synthetic_form = next(form for form in report["forms"] if form["action_url"] == "https://alma.example/alma/search")
        self.assertIn("query", synthetic_form["field_names"])
        self.assertIn("genericSearchMask:buttonsBottom:search", synthetic_form["button_names"])

    def test_route_discovery_cli_supports_generic_har_imports(self) -> None:
        har_payload = {
            "log": {
                "entries": [
                    {
                        "request": {
                            "method": "GET",
                            "url": "https://example.test/library",
                            "headers": [],
                        },
                        "response": {
                            "status": 200,
                            "content": {
                                "mimeType": "text/html",
                                "text": "<html><body><a href='/library/item/1'>Item</a></body></html>",
                            },
                        },
                    }
                ]
            }
        }

        with tempfile.TemporaryDirectory() as tmpdir:
            har_path = Path(tmpdir) / "generic.har"
            har_path.write_text(json.dumps(har_payload), encoding="utf-8")

            stdout = io.StringIO()
            with redirect_stdout(stdout):
                exit_code = route_discovery_main(["generic", "--har", str(har_path), "--format", "json"])

        self.assertEqual(exit_code, 0)
        payload = json.loads(stdout.getvalue())
        self.assertEqual(payload["site"], "generic")
        route = next(route for route in payload["routes"] if route["path"] == "/library/item/1")
        self.assertEqual(route["methods"], ["GET"])


if __name__ == "__main__":
    unittest.main()

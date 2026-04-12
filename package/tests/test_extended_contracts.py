from __future__ import annotations

import sys
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tue_api_wrapper.alma_feature_html import extract_current_lectures_form, parse_current_lectures_page
from tue_api_wrapper.course_identifier import extract_course_identifiers, identifier_search_terms
from tue_api_wrapper.course_detail_linking import build_unified_course_detail
from tue_api_wrapper.ilias_feature_html import extract_ilias_search_form, parse_ilias_info_page, parse_ilias_search_page
from tue_api_wrapper.ilias_feature_models import IliasSearchResult
from tue_api_wrapper.models import AlmaDetailField, AlmaDetailSection, AlmaModuleDetail


class ExtendedContractTests(unittest.TestCase):
    def test_course_detail_bundle_ranks_ilias_result_by_shared_number(self) -> None:
        detail = AlmaModuleDetail(
            title="Computer Graphics",
            number="INF-4201",
            permalink="https://alma.example/detail/1",
            source_url="https://alma.example/source",
            active_tab="Modulbeschreibung",
            available_tabs=("Modulbeschreibung",),
            sections=(
                AlmaDetailSection(
                    title="Kommentar",
                    fields=(
                        AlmaDetailField(
                            label="Anmeldung",
                            value="Bitte melden Sie sich zusaetzlich ueber ILIAS an.",
                        ),
                    ),
                ),
            ),
            module_study_program_tables=(),
        )
        ilias_result = IliasSearchResult(
            title="INF-4201 Computer Graphics",
            url="https://ovidius.example/goto.php/crs/42",
            description="Course registration and materials",
            info_url="https://ovidius.example/ilias.php?cmd=infoScreen&ref_id=42",
            add_to_favorites_url=None,
            breadcrumbs=("Sommersemester 2026",),
            properties=("Online",),
            item_type="crs",
        )

        with patch(
            "tue_api_wrapper.course_detail_linking.search_ilias",
            return_value=SimpleNamespace(results=(ilias_result,)),
        ) as search_mock:
            bundle = build_unified_course_detail(detail, ilias_client=object())

        self.assertEqual(bundle.lookup_queries[0].query, "INF-4201")
        self.assertEqual(search_mock.call_count, 1)
        self.assertEqual(search_mock.call_args.kwargs["term"], "INF-4201")
        self.assertEqual(search_mock.call_args.kwargs["content_types"], ("crs", "grp", "cat"))
        self.assertEqual(bundle.ilias_results[0].matched_identifier, "INF-4201")
        self.assertIn("shared Alma number", bundle.ilias_results[0].match_reason)
        self.assertEqual(bundle.registration_hints[0].source, "alma")

    def test_course_detail_bundle_uses_title_fallback_after_identifier_miss(self) -> None:
        detail = AlmaModuleDetail(
            title="Statistical Machine Learning",
            number="ML-4420",
            permalink="https://alma.example/detail/1",
            source_url="https://alma.example/source",
            active_tab="Modulbeschreibung",
            available_tabs=("Modulbeschreibung",),
            sections=(),
            module_study_program_tables=(),
        )
        ilias_result = IliasSearchResult(
            title="Statistical Machine Learning",
            url="https://ovidius.example/goto.php/crs/42",
            description=None,
            info_url=None,
            add_to_favorites_url=None,
            breadcrumbs=(),
            properties=(),
            item_type="crs",
        )

        with patch(
            "tue_api_wrapper.course_detail_linking.search_ilias",
            side_effect=(
                SimpleNamespace(results=()),
                SimpleNamespace(results=()),
                SimpleNamespace(results=()),
                SimpleNamespace(results=(ilias_result,)),
            ),
        ) as search_mock:
            bundle = build_unified_course_detail(detail, ilias_client=object())

        self.assertEqual(
            [call.kwargs["term"] for call in search_mock.call_args_list],
            ["ML-4420", "ML4420", "ML 4420", "Statistical Machine Learning"],
        )
        self.assertEqual(bundle.lookup_queries[-1].reason, "Alma title")
        self.assertEqual(bundle.ilias_results[0].match_query, "Statistical Machine Learning")

    def test_course_identifier_variants_cover_common_alma_and_ilias_formats(self) -> None:
        self.assertEqual(extract_course_identifiers("Data Literacy (ML 4102)"), ("ML 4102",))
        self.assertEqual(identifier_search_terms("ML 4102"), ("ML 4102", "ML4102", "ML-4102"))

    def test_course_detail_bundle_keeps_alma_when_ilias_is_unavailable(self) -> None:
        detail = AlmaModuleDetail(
            title="Computer Graphics",
            number=None,
            permalink=None,
            source_url="https://alma.example/source",
            active_tab=None,
            available_tabs=(),
            sections=(),
            module_study_program_tables=(),
        )

        bundle = build_unified_course_detail(
            detail,
            ilias_client=None,
            ilias_error="Set UNI_USERNAME and UNI_PASSWORD before using authenticated endpoints.",
        )

        self.assertEqual(bundle.alma.title, "Computer Graphics")
        self.assertEqual(bundle.ilias_results, ())
        self.assertIsNotNone(bundle.lookup_queries[0].error)

    def test_extract_ilias_search_form(self) -> None:
        html = """
        <form action="/ilias.php?baseClass=ilsearchcontrollergui&amp;cmd=post&amp;fallbackCmd=performSearch&amp;rtoken=abc" method="post">
          <input type="text" name="term" value="" />
          <input type="radio" name="type" value="1" checked="checked" />
          <input type="submit" name="cmd[performSearch]" value="Suche" />
        </form>
        """
        form = extract_ilias_search_form(html, "https://ovidius.example/ilias.php?baseClass=ilSearchControllerGUI")

        self.assertEqual(form.term_field_name, "term")
        self.assertEqual(form.search_button_name, "cmd[performSearch]")
        self.assertEqual(form.payload["type"], "1")

    def test_parse_ilias_search_page_extracts_results_and_paging(self) -> None:
        html = """
        <div class="ilTableNav">
          <a href="/ilias.php?page_number=2">weiter</a>
        </div>
        <table class="table table-striped fullwidth">
          <tr><th>Typ</th><th>Titel / Beschreibung</th><th>Aktionen</th></tr>
          <tr>
            <td></td>
            <td>
              <div class="il_ContainerListItem">
                <div class="il_ContainerItemTitle form-inline">
                  <h3 class="il_ContainerItemTitle"><a class="il_ContainerItemTitle" href="/goto.php/cat/42">Computer Graphics</a></h3>
                </div>
                <div class="ilListItemSection il_Description">Group homepage</div>
                <div class="ilListItemSection il_ItemProperties">
                  <span class="il_ItemProperty">Status: Online</span>
                </div>
                <div class="il_ItemProperties">
                  <ol class="breadcrumb hidden-print">
                    <li><a href="/goto.php/root/1">Veranstaltungen (Magazin)</a></li>
                    <li><a href="/goto.php/cat/9">Sommersemester 2026</a></li>
                  </ol>
                </div>
              </div>
            </td>
            <td>
              <a href="/ilias.php?baseClass=ilrepositorygui&amp;cmd=infoScreen&amp;ref_id=42">Info</a>
              <a href="/ilias.php?cmd=addToDesk&amp;item_ref_id=42&amp;type=cat">Zu Favoriten hinzufügen</a>
            </td>
          </tr>
        </table>
        """
        page = parse_ilias_search_page(html, "https://ovidius.example/ilias.php", query="graphics", page_number=1)

        self.assertEqual(page.query, "graphics")
        self.assertEqual(page.next_page_url, "https://ovidius.example/ilias.php?page_number=2")
        self.assertEqual(page.results[0].title, "Computer Graphics")
        self.assertEqual(page.results[0].url, "https://ovidius.example/goto.php/cat/42")
        self.assertEqual(page.results[0].item_type, "cat")
        self.assertEqual(page.results[0].breadcrumbs, ("Veranstaltungen (Magazin)", "Sommersemester 2026"))

    def test_parse_ilias_info_page_extracts_sections(self) -> None:
        html = """
        <h1>MPC Materials</h1>
        <div><h2>Allgemein</h2></div>
        <div class="form-group row">
          <div class="il_InfoScreenProperty control-label">Sprache</div>
          <div class="il_InfoScreenPropertyValue">Englisch</div>
        </div>
        <div><h2>Gruppenbeitritt</h2></div>
        <div class="form-group row">
          <div class="il_InfoScreenProperty control-label">Freie Plätze</div>
          <div class="il_InfoScreenPropertyValue">0</div>
        </div>
        """
        page = parse_ilias_info_page(html, "https://ovidius.example/info")

        self.assertEqual(page.title, "MPC Materials")
        self.assertEqual(page.sections[0].title, "Allgemein")
        self.assertEqual(page.sections[0].fields[0].label, "Sprache")
        self.assertEqual(page.sections[0].fields[0].value, "Englisch")
        self.assertEqual(page.sections[1].fields[0].value, "0")

    def test_extract_current_lectures_form(self) -> None:
        html = """
        <form id="showEventsAndExaminationsOnDateForm" action="/alma/currentLectures">
          <input type="hidden" name="javax.faces.ViewState" value="e1s1" />
          <input type="text" name="showEventsAndExaminationsOnDateForm:tabContainer:date-selection-container:date" value="14.03.2026" />
          <button type="submit" name="showEventsAndExaminationsOnDateForm:searchButtonId">Suchen</button>
        </form>
        """
        form = extract_current_lectures_form(html, "https://alma.example/current")

        self.assertTrue(form.date_field_name.endswith(":date"))
        self.assertTrue(form.search_button_name.endswith(":searchButtonId"))
        self.assertEqual(form.payload["javax.faces.ViewState"], "e1s1")
        self.assertIsNone(form.filter_field_name)
        self.assertEqual(form.filter_values, ())

    def test_extract_current_lectures_form_defaults_all_courses_filter(self) -> None:
        html = """
        <form id="showEventsAndExaminationsOnDateForm" action="/alma/currentLectures">
          <input type="hidden" name="javax.faces.ViewState" value="e1s1" />
          <input type="text" name="showEventsAndExaminationsOnDateForm:tabContainer:date-selection-container:date" value="14.03.2026" />
          <input type="checkbox" name="showEventsAndExaminationsOnDateForm:tabContainer:filter-container:selectCheckbox" value="selectAllCourses" />
          <input type="checkbox" name="showEventsAndExaminationsOnDateForm:tabContainer:filter-container:selectCheckbox" value="selectChangedCourses" />
          <button type="submit" name="showEventsAndExaminationsOnDateForm:searchButtonId">Suchen</button>
        </form>
        """
        form = extract_current_lectures_form(html, "https://alma.example/current")

        self.assertEqual(
            form.filter_field_name,
            "showEventsAndExaminationsOnDateForm:tabContainer:filter-container:selectCheckbox",
        )
        self.assertEqual(form.filter_values, ("selectAllCourses",))

    def test_parse_current_lectures_page_extracts_rows(self) -> None:
        html = """
        <input type="text" name="showEventsAndExaminationsOnDateForm:tabContainer:date-selection-container:date" value="14.03.2026" />
        <table id="showEventsAndExaminationsOnDateForm:tabContainer:term-planning-container:coursesAndExaminationsOnDateListTable:coursesAndExaminationsOnDateListTableTable" class="tableWithSelect table">
          <tr><th>Aktion</th><th>Titel</th></tr>
          <tr>
            <td><a href="/alma/pages/startFlow.xhtml?_flowId=detailView-flow&amp;unitId=42&amp;periodId=236">Details</a></td>
            <td><a href="/alma/pages/startFlow.xhtml?_flowId=detailView-flow&amp;unitId=42&amp;periodId=236">Computer Graphics</a></td>
            <td>09:00</td>
            <td>11:00</td>
            <td>INF-4201</td>
            <td>1. PG</td>
            <td>Vorlesung</td>
            <td>Prof. Lensch</td>
            <td>Prof. Lensch</td>
            <td>Sand 14</td>
            <td>A301</td>
            <td>Sommersemester 2026</td>
            <td>mit Übung</td>
            <td></td>
          </tr>
        </table>
        """
        page = parse_current_lectures_page(html, "https://alma.example/current")

        self.assertEqual(page.selected_date, "14.03.2026")
        self.assertEqual(page.results[0].title, "Computer Graphics")
        self.assertEqual(page.results[0].detail_url, "https://alma.example/alma/pages/startFlow.xhtml?_flowId=detailView-flow&unitId=42&periodId=236")
        self.assertEqual(page.results[0].event_type, "Vorlesung")


if __name__ == "__main__":
    unittest.main()

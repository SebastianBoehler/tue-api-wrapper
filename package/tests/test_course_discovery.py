from __future__ import annotations

import os
import sys
import tempfile
import unittest
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tue_api_wrapper.course_discovery_models import CourseDiscoveryDocument, CourseDiscoveryFilters
from tue_api_wrapper.course_discovery_service import CourseDiscoveryService
from tue_api_wrapper.course_discovery_store import InMemoryDiscoveryStore
from tue_api_wrapper.models import AlmaDetailTable, AlmaModuleDetail, AlmaModuleSearchFilters, AlmaModuleSearchResult, AlmaSearchOption


@dataclass(frozen=True)
class FakeModuleResponse:
    results: tuple[AlmaModuleSearchResult, ...]


class FakePublicAlma:
    def search_public_module_descriptions(
        self,
        *,
        query: str = "",
        degrees: tuple[str, ...] = (),
        subjects: tuple[str, ...] = (),
        max_results: int = 100,
    ):
        return FakeModuleResponse(
            results=(
                AlmaModuleSearchResult(
                    number="INF3171",
                    title="Machine Learning",
                    element_type="Module",
                    detail_url="https://alma.example/module",
                ),
                AlmaModuleSearchResult(
                    number="BIO1000",
                    title="Plant Biology",
                    element_type="Module",
                    detail_url="https://alma.example/bio",
                ),
            )
        )

    def fetch_public_module_search_filters(self):
        return AlmaModuleSearchFilters(
            element_types=(),
            languages=(),
            degrees=(AlmaSearchOption("msc-ml", "M.Sc. Machine Learning"),),
            subjects=(AlmaSearchOption("informatics", "Informatics"),),
            faculties=(),
        )

    def fetch_public_module_detail(self, detail_url: str):
        return AlmaModuleDetail(
            title="Machine Learning",
            number="ML4201",
            permalink=None,
            source_url=detail_url,
            active_tab="Module / Studiengänge",
            available_tabs=("Module / Studiengänge",),
            sections=(),
            module_study_program_tables=(
                AlmaDetailTable(
                    title="Module / Studiengänge",
                    headers=("Studiengang", "Abschluss", "Modul"),
                    rows=(("Informatik", "Master", "INFO-ML"),),
                ),
            ),
        )


class CourseDiscoveryTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tempdir = tempfile.TemporaryDirectory()
        self._previous_cache = os.environ.get("TUE_DISCOVERY_CACHE")
        os.environ["TUE_DISCOVERY_CACHE"] = str(Path(self._tempdir.name) / "cache.json")

    def tearDown(self) -> None:
        if self._previous_cache is None:
            os.environ.pop("TUE_DISCOVERY_CACHE", None)
        else:
            os.environ["TUE_DISCOVERY_CACHE"] = self._previous_cache
        self._tempdir.cleanup()

    def test_store_ranks_title_and_module_code_matches(self) -> None:
        store = InMemoryDiscoveryStore()
        store.replace(
            (
                CourseDiscoveryDocument(
                    id="one",
                    source="alma",
                    kind="module",
                    title="Machine Learning",
                    text="Neural networks and representation learning",
                    module_code="INF3171",
                ),
                CourseDiscoveryDocument(
                    id="two",
                    source="moodle",
                    kind="course",
                    title="Statistics",
                    text="Regression and probability",
                    module_code="STAT1000",
                ),
            )
        )

        results = store.search("INF3171 learning", CourseDiscoveryFilters(sources=("alma",)), 5)

        self.assertEqual([result.document.id for result in results], ["one"])
        self.assertGreater(results[0].score, 1)

    def test_service_search_uses_public_alma_modules(self) -> None:
        service = CourseDiscoveryService(public_alma=FakePublicAlma())  # type: ignore[arg-type]

        response = service.search("machine learning", limit=5)

        self.assertEqual(response.results[0].document.title, "Machine Learning")
        self.assertEqual(response.results[0].document.source, "alma")
        self.assertFalse(response.status.semantic_available)
        self.assertEqual(response.errors, ())

    def test_refresh_persists_index_for_later_search(self) -> None:
        first = CourseDiscoveryService(public_alma=FakePublicAlma())  # type: ignore[arg-type]
        status = first.refresh(limit=20)
        second = CourseDiscoveryService(public_alma=FakePublicAlma())  # type: ignore[arg-type]

        response = second.search("machine", limit=5)

        self.assertEqual(status.document_count, 2)
        self.assertEqual(status.facets.degrees[0].label, "M.Sc. Machine Learning")
        self.assertEqual(status.facets.module_codes[0].value, "INFO-ML")
        self.assertEqual(response.results[0].document.title, "Machine Learning")
        self.assertIsNotNone(response.status.last_refresh)


if __name__ == "__main__":
    unittest.main()

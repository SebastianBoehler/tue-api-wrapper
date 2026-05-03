from __future__ import annotations

import sys
import unittest
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tue_api_wrapper.course_discovery_models import CourseDiscoveryDocument, CourseDiscoveryFilters
from tue_api_wrapper.course_discovery_service import CourseDiscoveryService
from tue_api_wrapper.course_discovery_store import InMemoryDiscoveryStore
from tue_api_wrapper.models import AlmaModuleSearchResult


@dataclass(frozen=True)
class FakeModuleResponse:
    results: tuple[AlmaModuleSearchResult, ...]


class FakePublicAlma:
    def search_public_module_descriptions(self, *, query: str, max_results: int):
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


class CourseDiscoveryTests(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()

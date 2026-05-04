from __future__ import annotations

import sys
from pathlib import Path
import unittest
from types import SimpleNamespace
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tue_api_wrapper.alma_course_search_matching import select_course_search_result
from tue_api_wrapper.alma_course_search_models import AlmaCourseSearchResult
from tue_api_wrapper.course_detail_linking import resolve_alma_course_detail


def _result(number: str | None, title: str, url: str) -> AlmaCourseSearchResult:
    return AlmaCourseSearchResult(
        number=number,
        title=title,
        event_type=None,
        responsible_lecturer=None,
        lecturer=None,
        organization=None,
        detail_url=url,
    )


class AlmaCourseSearchMatchingTests(unittest.TestCase):
    def test_selects_matching_number_and_title_from_multiple_results(self) -> None:
        results = (
            _result("ML4202", "Probabilistic Machine Learning", "https://alma.example/ml4202"),
            _result("ML4510", "Practical Machine Learning", "https://alma.example/ml4510"),
        )

        selected = select_course_search_result(
            results,
            number="ML4202",
            title="Probabilistic Machine Learning",
        )

        self.assertEqual(selected, results[0])

    def test_selects_same_number_when_timetable_title_contains_code(self) -> None:
        results = (
            _result("ML4510", "Practical Machine Learning: Build your own StudyOS with Modern Agentic Systems", "https://alma.example/ml4510"),
            _result("ML4202", "Probabilistic Machine Learning", "https://alma.example/ml4202"),
        )

        selected = select_course_search_result(
            results,
            number="ML4510",
            title="Practical Machine Learning: Build your own StudyOS with Modern Agentic Systems",
        )

        self.assertEqual(selected, results[0])

    def test_returns_none_for_ambiguous_low_signal_results(self) -> None:
        results = (
            _result(None, "Academic Writing", "https://alma.example/a"),
            _result(None, "Presentation Skills", "https://alma.example/b"),
        )

        selected = select_course_search_result(results, number=None, title="Machine Learning")

        self.assertIsNone(selected)

    def test_title_resolution_uses_number_then_best_matching_title(self) -> None:
        detail_client = object()
        search_client = object()
        results = (
            _result("ML4202", "Probabilistic Machine Learning", "https://alma.example/ml4202"),
            _result("ML4510", "Practical Machine Learning", "https://alma.example/ml4510"),
        )

        with patch(
            "tue_api_wrapper.course_detail_linking.search_courses",
            return_value=SimpleNamespace(results=results),
        ) as search_mock, patch(
            "tue_api_wrapper.course_detail_linking.fetch_public_module_detail",
            return_value="detail",
        ) as detail_mock:
            detail = resolve_alma_course_detail(
                detail_client,
                title="ML4202 Probabilistic Machine Learning",
                search_client=search_client,
            )

        self.assertEqual(detail, "detail")
        self.assertEqual(search_mock.call_args.kwargs["query"], "ML4202")
        detail_mock.assert_called_once_with(detail_client, "https://alma.example/ml4202")


if __name__ == "__main__":
    unittest.main()

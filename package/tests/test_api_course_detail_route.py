from __future__ import annotations

import sys
from pathlib import Path
import unittest
from unittest.mock import patch

from fastapi import HTTPException

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tue_api_wrapper import api_routes_extended
from tue_api_wrapper.client import AlmaClient
from tue_api_wrapper.config import AlmaParseError
from tue_api_wrapper.models import AlmaModuleDetail


def _detail() -> AlmaModuleDetail:
    return AlmaModuleDetail(
        title="Probabilistic Machine Learning",
        number="ML4202",
        permalink="https://alma.example/alma/pages/startFlow.xhtml?unitId=42",
        source_url="https://alma.example/alma/pages/startFlow.xhtml?unitId=42",
        active_tab=None,
        available_tabs=(),
        sections=(),
        module_study_program_tables=(),
    )


class CourseDetailRouteTests(unittest.TestCase):
    def test_url_lookup_uses_authenticated_alma_for_detail_resolution(self) -> None:
        authenticated = object()
        calls: dict[str, object] = {}

        def resolve(detail_client, **kwargs):
            calls["detail_client"] = detail_client
            calls["search_client"] = kwargs["search_client"]
            return _detail()

        def build(detail, **kwargs):
            calls["alma_client"] = kwargs["alma_client"]
            calls["alma_error"] = kwargs["alma_error"]
            return {"portal_statuses": []}

        with patch.object(api_routes_extended.portal_service, "_alma_client", return_value=authenticated), \
             patch.object(api_routes_extended, "_ilias_client", side_effect=AlmaParseError("No ILIAS")), \
             patch.object(api_routes_extended, "build_moodle_client", side_effect=AlmaParseError("No Moodle")), \
             patch.object(api_routes_extended, "resolve_alma_course_detail", side_effect=resolve), \
             patch.object(api_routes_extended, "build_unified_course_detail", side_effect=build):
            result = api_routes_extended.unified_course_detail(
                url="https://alma.example/alma/pages/startFlow.xhtml?unitId=42"
            )

        self.assertEqual(result, {"portal_statuses": []})
        self.assertIs(calls["detail_client"], authenticated)
        self.assertIsNone(calls["search_client"])
        self.assertIs(calls["alma_client"], authenticated)
        self.assertIsNone(calls["alma_error"])

    def test_url_lookup_uses_public_detail_client_when_auth_is_unavailable(self) -> None:
        calls: dict[str, object] = {}

        def resolve(detail_client, **kwargs):
            calls["detail_client"] = detail_client
            calls["search_client"] = kwargs["search_client"]
            return _detail()

        def build(detail, **kwargs):
            calls["alma_client"] = kwargs["alma_client"]
            calls["alma_error"] = kwargs["alma_error"]
            return {"portal_statuses": []}

        with patch.object(api_routes_extended.portal_service, "_alma_client", side_effect=AlmaParseError("No Alma")), \
             patch.object(api_routes_extended, "_ilias_client", side_effect=AlmaParseError("No ILIAS")), \
             patch.object(api_routes_extended, "build_moodle_client", side_effect=AlmaParseError("No Moodle")), \
             patch.object(api_routes_extended, "resolve_alma_course_detail", side_effect=resolve), \
             patch.object(api_routes_extended, "build_unified_course_detail", side_effect=build):
            result = api_routes_extended.unified_course_detail(
                url="https://alma.example/alma/pages/startFlow.xhtml?unitId=42"
            )

        self.assertEqual(result, {"portal_statuses": []})
        self.assertIsInstance(calls["detail_client"], AlmaClient)
        self.assertIsNone(calls["search_client"])
        self.assertIsNone(calls["alma_client"])
        self.assertEqual(calls["alma_error"], "No Alma")

    def test_title_lookup_surfaces_missing_backend_credentials(self) -> None:
        missing_credentials = (
            "Set UNI_USERNAME and UNI_PASSWORD before using authenticated endpoints. "
            "Legacy ALMA_* and ILIAS_* env vars are still supported as fallbacks."
        )

        with patch.object(api_routes_extended.portal_service, "_alma_client", side_effect=AlmaParseError(missing_credentials)):
            with self.assertRaises(HTTPException) as context:
                api_routes_extended.unified_course_detail(title="ML4202 Probabilistic Machine Learning")

        self.assertEqual(context.exception.status_code, 503)
        self.assertEqual(context.exception.detail, missing_credentials)


if __name__ == "__main__":
    unittest.main()

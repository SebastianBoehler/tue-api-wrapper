from __future__ import annotations

import sys
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tue_api_wrapper.course_detail_linking import build_unified_course_detail
from tue_api_wrapper.models import AlmaModuleDetail, IliasMembershipItem
from tue_api_wrapper.moodle_models import MoodleCourseSummary


class _FakeIliasClient:
    def __init__(self, memberships=()) -> None:
        self._memberships = memberships

    def fetch_membership_overview(self):
        return self._memberships


class _FakeMoodleClient:
    def __init__(self, courses=()) -> None:
        self._courses = courses

    def fetch_enrolled_courses(self, *, limit: int, offset: int):
        return SimpleNamespace(items=self._courses if offset == 0 else (), next_offset=None)


class CoursePortalStatusTests(unittest.TestCase):
    def test_course_detail_portal_statuses_match_memberships_and_moodle_courses(self) -> None:
        detail = AlmaModuleDetail(
            title="Statistical Machine Learning",
            number="ML-4420",
            permalink="https://alma.example/detail/1",
            source_url="https://alma.example/source",
            active_tab=None,
            available_tabs=(),
            sections=(),
            module_study_program_tables=(),
        )
        membership = IliasMembershipItem(
            title="ML-4420 Statistical Machine Learning",
            url="https://ovidius.example/goto.php/crs/42",
            kind="Kurs",
            description=None,
            info_url=None,
            properties=(),
        )
        moodle_course = MoodleCourseSummary(
            id=1559,
            title="Statistical Machine Learning",
            shortname="ML-4420",
            category_name="Sommersemester 2026",
            visible=True,
            end_date=None,
            url="https://moodle.example/course/view.php?id=1559",
            image_url=None,
        )

        with patch("tue_api_wrapper.course_detail_linking.search_ilias", return_value=SimpleNamespace(results=())):
            bundle = build_unified_course_detail(
                detail,
                ilias_client=_FakeIliasClient(memberships=(membership,)),
                moodle_client=_FakeMoodleClient(courses=(moodle_course,)),
            )

        statuses = {status.portal: status for status in bundle.portal_statuses}
        self.assertEqual(statuses["ilias"].status, "joined")
        self.assertTrue(statuses["ilias"].signed_up)
        self.assertEqual(statuses["moodle"].status, "enrolled")
        self.assertTrue(statuses["moodle"].signed_up)


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tue_api_wrapper.moodle_client import MoodleClient
from tue_api_wrapper.moodle_feed_html import (
    parse_moodle_grades_page,
    parse_moodle_messages_page,
    parse_moodle_notifications_page,
)
from tue_api_wrapper.moodle_html import (
    extract_moodle_page_config,
    parse_moodle_category_page,
    parse_moodle_course_detail_page,
)


class _FakeResponse:
    def __init__(self, *, url: str, text: str = "", json_data: object | None = None, status_code: int = 200) -> None:
        self.url = url
        self.text = text
        self._json_data = json_data
        self.status_code = status_code

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise RuntimeError(f"{self.status_code} for {self.url}")

    def json(self) -> object:
        return self._json_data


class _FakeSession:
    def __init__(self, *, get_pages: dict[str, _FakeResponse], post_pages: dict[tuple[str, str], _FakeResponse]) -> None:
        self.get_pages = get_pages
        self.post_pages = post_pages
        self.headers: dict[str, str] = {}

    def get(self, url: str, timeout: int, allow_redirects: bool = True) -> _FakeResponse:
        return self.get_pages[url]

    def post(self, url: str, timeout: int, allow_redirects: bool = True, **kwargs) -> _FakeResponse:
        info = ""
        params = kwargs.get("params")
        if isinstance(params, dict):
            info = str(params.get("info", ""))
        return self.post_pages[(url, info)]


class MoodleContractTests(unittest.TestCase):
    def test_extract_moodle_page_config(self) -> None:
        html = """
        <script>
        var M = {};
        M.cfg = {"wwwroot":"https://moodle.example","sesskey":"abc123","userId":42,"courseId":1559,"contextid":188760};
        </script>
        """
        config = extract_moodle_page_config(html)

        self.assertEqual(config.sesskey, "abc123")
        self.assertEqual(config.user_id, 42)
        self.assertEqual(config.course_id, 1559)

    def test_parse_moodle_category_page_extracts_categories_and_courses(self) -> None:
        html = """
        <html><head><title>Courses</title></head><body>
          <h1>Course catalog</h1>
          <div class="category">
            <a href="/course/index.php?categoryid=235">Machine Learning</a>
            <div class="categorydescription">AI lectures and labs</div>
          </div>
          <div class="coursebox" data-courseid="1559">
            <h3 class="coursename"><a href="/course/view.php?id=1559">Introduction to Neural Networks</a></h3>
            <div class="summary">Foundations and practical assignments.</div>
            <ul class="teachers"><li><a href="/user/profile.php?id=1">Andreas Zell</a></li></ul>
          </div>
        </body></html>
        """
        page = parse_moodle_category_page(html, "https://moodle.example/course/index.php?categoryid=2")

        self.assertEqual(page.category_id, 2)
        self.assertEqual(page.categories[0].id, 235)
        self.assertEqual(page.categories[0].description, "AI lectures and labs")
        self.assertEqual(page.courses[0].id, 1559)
        self.assertEqual(page.courses[0].teachers, ("Andreas Zell",))

    def test_parse_moodle_course_detail_page_extracts_enrolment_contract(self) -> None:
        html = """
        <html><body>
          <div class="coursebox clearfix" data-courseid="1559">
            <div class="info"><h3 class="coursename"><a href="/course/view.php?id=1559">Introduction to Neural Networks</a></h3></div>
            <div class="summary">Foundations and practical assignments.</div>
            <ul class="teachers"><li><a href="/user/profile.php?id=1">Andreas Zell</a></li></ul>
          </div>
          <form action="/enrol/index.php" method="post">
            <input name="id" type="hidden" value="1559" />
            <input name="instance" type="hidden" value="13357" />
            <input name="sesskey" type="hidden" value="LhA8Yn3dCE" />
            <input name="_qf__13357_enrol_self_enrol_form" type="hidden" value="1" />
            <legend>Selbsteinschreibung (Studierende*r)</legend>
            <div>Kein Einschreibekennwort notwendig</div>
            <input type="submit" name="submitbutton" value="Einschreiben" />
          </form>
        </body></html>
        """
        page = parse_moodle_course_detail_page(html, "https://moodle.example/enrol/index.php?id=1559")

        self.assertEqual(page.id, 1559)
        self.assertEqual(page.title, "Introduction to Neural Networks")
        self.assertTrue(page.self_enrolment_available)
        self.assertFalse(page.requires_enrolment_key)
        self.assertEqual(page.enrolment_payload["instance"], "13357")

    def test_parse_moodle_grades_page_extracts_rows(self) -> None:
        html = """
        <html><body>
          <table class="generaltable">
            <thead><tr><th>Kurs</th><th>Bewertung</th><th>Prozent</th><th>Bereich</th></tr></thead>
            <tbody>
              <tr>
                <td><a href="/course/view.php?id=1559">Introduction to Neural Networks</a></td>
                <td>1,3</td>
                <td>92 %</td>
                <td>0-100</td>
              </tr>
            </tbody>
          </table>
        </body></html>
        """
        page = parse_moodle_grades_page(html, "https://moodle.example/grade/report/overview/index.php")

        self.assertEqual(page.items[0].course_title, "Introduction to Neural Networks")
        self.assertEqual(page.items[0].grade, "1,3")
        self.assertEqual(page.items[0].percentage, "92 %")

    def test_parse_moodle_messages_and_notifications_extract_items(self) -> None:
        messages_html = """
        <div class="message-app">
          <div class="list-group-item unread">
            <a href="/message/index.php?id=44"><strong>ML Exercise Group</strong></a>
            <div class="text-muted">Please submit by Friday.</div>
            <time>26 Mar 2026, 15:20</time>
          </div>
        </div>
        """
        notifications_html = """
        <ul>
          <li class="notification unread">
            <a href="/mod/assign/view.php?id=88"><strong>Assignment updated</strong></a>
            <span class="content">The deadline has changed.</span>
            <time>26 Mar 2026, 16:00</time>
          </li>
        </ul>
        """

        messages = parse_moodle_messages_page(messages_html, "https://moodle.example/message/index.php")
        notifications = parse_moodle_notifications_page(
            notifications_html,
            "https://moodle.example/message/output/popup/notifications.php",
        )

        self.assertEqual(messages.items[0].title, "ML Exercise Group")
        self.assertTrue(messages.items[0].unread)
        self.assertEqual(notifications.items[0].title, "Assignment updated")
        self.assertEqual(notifications.items[0].body, "The deadline has changed.")

    def test_moodle_client_fetch_dashboard_uses_ajax_contracts(self) -> None:
        dashboard_html = """
        <script>
        var M = {};
        M.cfg = {"wwwroot":"https://moodle.example","sesskey":"abc123","userId":42};
        </script>
        """
        client = MoodleClient(
            base_url="https://moodle.example",
            session=_FakeSession(
                get_pages={
                    "https://moodle.example/my/": _FakeResponse(url="https://moodle.example/my/", text=dashboard_html),
                },
                post_pages={
                    ("https://moodle.example/lib/ajax/service.php", "core_calendar_get_action_events_by_timesort"): _FakeResponse(
                        url="https://moodle.example/lib/ajax/service.php",
                        json_data=[{"data": [{"id": 1, "name": "Quiz 1", "timesort": 1774531200, "formattedtime": "Tomorrow"}]}],
                    ),
                    ("https://moodle.example/lib/ajax/service.php", "block_recentlyaccesseditems_get_recent_items"): _FakeResponse(
                        url="https://moodle.example/lib/ajax/service.php",
                        json_data=[{"data": [{"id": 12, "name": "Lecture slides", "coursename": "Neural Networks", "viewurl": "/mod/resource/view.php?id=12"}]}],
                    ),
                    ("https://moodle.example/lib/ajax/service.php", "core_course_get_enrolled_courses_by_timeline_classification"): _FakeResponse(
                        url="https://moodle.example/lib/ajax/service.php",
                        json_data=[{"data": {"courses": [{"id": 1559, "fullname": "Introduction to Neural Networks", "shortname": "NN", "visible": 1, "enddate": 1777680000}]}}],
                    ),
                },
            ),
        )

        dashboard = client.fetch_dashboard()

        self.assertEqual(dashboard.events[0].title, "Quiz 1")
        self.assertEqual(dashboard.recent_items[0].title, "Lecture slides")
        self.assertEqual(dashboard.courses[0].title, "Introduction to Neural Networks")


if __name__ == "__main__":
    unittest.main()

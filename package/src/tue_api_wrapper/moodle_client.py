from __future__ import annotations

import json
from datetime import datetime, timedelta
from urllib.parse import urljoin, urlparse

import requests

from .config import AlmaLoginError, AlmaParseError, DEFAULT_TIMEOUT_SECONDS, GERMAN_TIMEZONE
from .ilias_html import extract_hidden_form, extract_idp_error, extract_idp_login_form
from .moodle_html import (
    extract_moodle_page_config,
    extract_moodle_page_message,
    extract_moodle_shib_login_url,
    parse_moodle_category_page,
    parse_moodle_course_detail_page,
)
from .moodle_feed_html import parse_moodle_grades_page, parse_moodle_messages_page, parse_moodle_notifications_page
from .moodle_json import (
    extract_ajax_result,
    extract_next_offset,
    normalize_dashboard_events,
    normalize_enrolled_courses,
    normalize_recent_items,
)
from .moodle_models import (
    MoodleCalendarPage,
    MoodleCategoryPage,
    MoodleCourseDetail,
    MoodleCoursesPage,
    MoodleDashboardPage,
    MoodleEnrolmentResult,
    MoodleGradesPage,
    MoodleMessagesPage,
    MoodleNotificationsPage,
)


class MoodleClient:
    def __init__(
        self,
        *,
        base_url: str = "https://moodle.zdv.uni-tuebingen.de",
        timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
        session: requests.Session | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds
        self.session = session or requests.Session()
        self.session.headers.setdefault(
            "User-Agent",
            "tue-api-wrapper/0.1 (+https://moodle.zdv.uni-tuebingen.de/)",
        )

    @property
    def login_url(self) -> str:
        return f"{self.base_url}/login/index.php"

    @property
    def dashboard_url(self) -> str:
        return f"{self.base_url}/my/"

    def login(self, username: str, password: str) -> str:
        response = self.session.get(self.login_url, timeout=self.timeout_seconds)
        response.raise_for_status()

        response = self.session.get(
            extract_moodle_shib_login_url(response.text, response.url),
            timeout=self.timeout_seconds,
            allow_redirects=True,
        )
        response.raise_for_status()

        form = extract_idp_login_form(response.text, response.url)
        payload = dict(form.payload)
        payload["j_username"] = username
        payload["j_password"] = password
        payload["_eventId_proceed"] = payload.get("_eventId_proceed", "")
        response = self.session.post(form.action_url, data=payload, timeout=self.timeout_seconds, allow_redirects=True)
        response.raise_for_status()

        error = extract_idp_error(response.text)
        if error:
            raise AlmaLoginError(error)

        response = self._complete_saml_handoff(response)
        self._ensure_authenticated(response.text, response.url)
        return response.text

    def fetch_dashboard(self, *, event_limit: int = 6, course_limit: int = 12, recent_limit: int = 9) -> MoodleDashboardPage:
        html, page_url = self._get_authenticated_page(self.dashboard_url)
        config = extract_moodle_page_config(html)
        now = datetime.now(tz=GERMAN_TIMEZONE)
        events_payload = self._ajax_call(
            method_name="core_calendar_get_action_events_by_timesort",
            args={
                "limitnum": event_limit,
                "timesortfrom": int(now.timestamp()),
                "timesortto": int((now + timedelta(days=30)).timestamp()),
                "limittononsuspendedevents": True,
            },
            sesskey=config.sesskey,
            referer=page_url,
        )
        recent_payload = self._ajax_call(
            method_name="block_recentlyaccesseditems_get_recent_items",
            args={"limit": recent_limit},
            sesskey=config.sesskey,
            referer=page_url,
        )
        courses_payload = self._ajax_call(
            method_name="core_course_get_enrolled_courses_by_timeline_classification",
            args=self._course_query_args(limit=course_limit),
            sesskey=config.sesskey,
            referer=page_url,
        )
        return MoodleDashboardPage(
            source_url=page_url,
            events=normalize_dashboard_events(events_payload, base_url=self.base_url),
            recent_items=normalize_recent_items(recent_payload, base_url=self.base_url),
            courses=normalize_enrolled_courses(courses_payload, base_url=self.base_url),
        )

    def fetch_calendar(self, *, days: int = 30, limit: int = 50) -> MoodleCalendarPage:
        html, page_url = self._get_authenticated_page(self.dashboard_url)
        config = extract_moodle_page_config(html)
        start = datetime.now(tz=GERMAN_TIMEZONE)
        end = start + timedelta(days=max(1, days))
        payload = self._ajax_call(
            method_name="core_calendar_get_action_events_by_timesort",
            args={
                "limitnum": max(1, limit),
                "timesortfrom": int(start.timestamp()),
                "timesortto": int(end.timestamp()),
                "limittononsuspendedevents": True,
            },
            sesskey=config.sesskey,
            referer=page_url,
        )
        return MoodleCalendarPage(
            source_url=page_url,
            from_timestamp=int(start.timestamp()),
            to_timestamp=int(end.timestamp()),
            items=normalize_dashboard_events(payload, base_url=self.base_url),
        )

    def fetch_enrolled_courses(self, *, classification: str = "all", limit: int = 24, offset: int = 0) -> MoodleCoursesPage:
        html, page_url = self._get_authenticated_page(f"{self.base_url}/my/courses.php")
        config = extract_moodle_page_config(html)
        payload = self._ajax_call(
            method_name="core_course_get_enrolled_courses_by_timeline_classification",
            args=self._course_query_args(limit=limit, offset=offset, classification=classification),
            sesskey=config.sesskey,
            referer=page_url,
        )
        return MoodleCoursesPage(
            source_url=page_url,
            items=normalize_enrolled_courses(payload, base_url=self.base_url),
            next_offset=extract_next_offset(payload),
        )

    def fetch_category_page(self, category_id: int | None = None) -> MoodleCategoryPage:
        url = f"{self.base_url}/course/index.php?categoryid={category_id}" if category_id is not None else self.base_url
        html, page_url = self._get_authenticated_page(url)
        return parse_moodle_category_page(html, page_url)

    def fetch_course_detail(self, course_id: int) -> MoodleCourseDetail:
        html, page_url = self._get_authenticated_page(f"{self.base_url}/enrol/index.php?id={course_id}")
        return parse_moodle_course_detail_page(html, page_url)

    def enrol_in_course(self, course_id: int, *, enrolment_key: str | None = None) -> MoodleEnrolmentResult:
        detail = self.fetch_course_detail(course_id)
        if detail.enrolment_action_url is None or not detail.enrolment_payload:
            raise AlmaParseError("Moodle did not expose a self-enrol form for this course.")
        if detail.requires_enrolment_key and not enrolment_key:
            raise AlmaParseError("This Moodle course requires an enrolment key.")

        payload = dict(detail.enrolment_payload)
        if detail.enrolment_key_field_name and enrolment_key is not None:
            payload[detail.enrolment_key_field_name] = enrolment_key
        payload.setdefault("submitbutton", "Einschreiben")
        response = self.session.post(detail.enrolment_action_url, data=payload, timeout=self.timeout_seconds, allow_redirects=True)
        response.raise_for_status()
        message = extract_moodle_page_message(response.text)
        success = urlparse(response.url).path == "/course/view.php" and message is None
        return MoodleEnrolmentResult(
            success=success,
            page_url=response.url,
            course_id=course_id,
            course_url=response.url if success else detail.course_url,
            title=parse_moodle_course_detail_page(response.text, response.url).title if "/enrol/index.php" in response.url else None,
            message=message,
        )

    def fetch_grades(self) -> MoodleGradesPage:
        html, page_url = self._get_authenticated_page(f"{self.base_url}/grade/report/overview/index.php")
        return parse_moodle_grades_page(html, page_url)

    def fetch_messages(self) -> MoodleMessagesPage:
        html, page_url = self._get_authenticated_page(f"{self.base_url}/message/index.php")
        return parse_moodle_messages_page(html, page_url)

    def fetch_notifications(self) -> MoodleNotificationsPage:
        html, page_url = self._get_authenticated_page(f"{self.base_url}/message/output/popup/notifications.php")
        return parse_moodle_notifications_page(html, page_url)

    def _course_query_args(self, *, limit: int, offset: int = 0, classification: str = "all") -> dict[str, object]:
        return {
            "offset": max(0, offset),
            "limit": max(0, limit),
            "classification": classification,
            "sort": "fullname",
            "customfieldname": "",
            "customfieldvalue": "",
            "requiredfields": ["id", "fullname", "shortname", "showcoursecategory", "showshortname", "visible", "enddate"],
        }

    def _ajax_call(self, *, method_name: str, args: dict[str, object], sesskey: str, referer: str) -> object:
        response = self.session.post(
            f"{self.base_url}/lib/ajax/service.php",
            params={"sesskey": sesskey, "info": method_name},
            json=[{"index": 0, "methodname": method_name, "args": args}],
            headers={"Referer": referer},
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        return extract_ajax_result(response.json())

    def _get_authenticated_page(self, url: str) -> tuple[str, str]:
        response = self.session.get(url, timeout=self.timeout_seconds, allow_redirects=True)
        response.raise_for_status()
        self._ensure_authenticated(response.text, response.url)
        return response.text, response.url

    def _ensure_authenticated(self, html: str, page_url: str) -> None:
        parsed = urlparse(page_url)
        if parsed.path == "/login/index.php" or "/auth/shibboleth/index.php" in page_url:
            raise AlmaLoginError("Session is not authenticated; Moodle redirected back to login.")
        if parsed.netloc == urlparse(self.base_url).netloc and "sesskey" in html:
            return
        if "/my/" in parsed.path or "/course/" in parsed.path or "/message/" in parsed.path or "/grade/" in parsed.path:
            return
        raise AlmaLoginError("Could not confirm an authenticated Moodle page.")

    def _complete_saml_handoff(self, response: requests.Response) -> requests.Response:
        for _ in range(6):
            parsed = urlparse(response.url)
            if parsed.netloc == urlparse(self.base_url).netloc and parsed.path not in {"", "/login/index.php"}:
                return response
            if "SAMLResponse" in response.text and "RelayState" in response.text:
                form = extract_hidden_form(response.text, response.url, {"SAMLResponse", "RelayState"})
                response = self.session.post(form.action_url, data=form.payload, timeout=self.timeout_seconds, allow_redirects=True)
                response.raise_for_status()
                continue
            if parsed.netloc == "idp.uni-tuebingen.de" and "_eventId_proceed" in response.text:
                form = extract_hidden_form(response.text, response.url, {"_eventId_proceed"})
                response = self.session.post(form.action_url, data=form.payload, timeout=self.timeout_seconds, allow_redirects=True)
                response.raise_for_status()
                continue
            break
        raise AlmaParseError("Could not complete the Moodle SAML handoff into an authenticated page.")

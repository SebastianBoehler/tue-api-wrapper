from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from ..alma_course_assignments_client import fetch_timetable_course_assignments
from ..alma_course_search_client import search_courses
from ..alma_planner_client import fetch_study_planner
from ..client import AlmaClient
from ..course_discovery_service import CourseDiscoveryService
from ..ilias_client import IliasClient
from ..ilias_feature_client import fetch_ilias_info_page, fetch_ilias_search_filters, search_ilias
from ..mail_client import MailClient
from ..moodle_client import MoodleClient
from .credentials import UniversityCredentials
from .discovery import CourseDiscoveryApi
from .public import TuebingenPublicClient


@dataclass(slots=True)
class AuthenticatedAlmaApi:
    credentials: UniversityCredentials
    _client: AlmaClient | None = None

    @property
    def client(self) -> AlmaClient:
        if self._client is None:
            client = AlmaClient()
            client.login(self.credentials.username, self.credentials.password)
            self._client = client
        return self._client

    def timetable(self, term: str):
        return self.client.fetch_timetable_for_term(term)

    def timetable_course_assignments(self, term: str, *, limit: int | None = None):
        return fetch_timetable_course_assignments(self.client, term=term, limit=limit)

    def course_offerings(self, *, query: str = "", term: str | None = None, limit: int | None = 20):
        return search_courses(self.client, query=query, term=term, limit=limit)

    def study_planner(self):
        return fetch_study_planner(self.client)

    def exams(self):
        return self.client.fetch_exam_overview()

    def enrollments(self):
        return self.client.fetch_enrollment_page()

    def documents(self):
        return self.client.list_studyservice_reports()

    def download_current_document(self):
        return self.client.download_current_studyservice_document()


@dataclass(slots=True)
class AuthenticatedIliasApi:
    credentials: UniversityCredentials
    _client: IliasClient | None = None

    @property
    def client(self) -> IliasClient:
        if self._client is None:
            client = IliasClient()
            client.login(self.credentials.username, self.credentials.password)
            self._client = client
        return self._client

    def root(self):
        return self.client.fetch_root_page()

    def memberships(self):
        return self.client.fetch_membership_overview()

    def tasks(self):
        return self.client.fetch_task_overview()

    def content(self, target: str):
        return self.client.fetch_content_page(target)

    def forum_topics(self, target: str):
        return self.client.fetch_forum_topics(target)

    def exercise_assignments(self, target: str):
        return self.client.fetch_exercise_assignments(target)

    def search_filters(self):
        return fetch_ilias_search_filters(self.client)

    def search(self, term: str, *, page: int = 1):
        return search_ilias(self.client, term=term, page=page)

    def info(self, target: str):
        return fetch_ilias_info_page(self.client, target=target)


@dataclass(slots=True)
class AuthenticatedMoodleApi:
    credentials: UniversityCredentials
    _client: MoodleClient | None = None

    @property
    def client(self) -> MoodleClient:
        if self._client is None:
            client = MoodleClient()
            client.login(self.credentials.username, self.credentials.password)
            self._client = client
        return self._client

    def dashboard(self, *, event_limit: int = 6, course_limit: int = 12, recent_limit: int = 9):
        return self.client.fetch_dashboard(
            event_limit=event_limit,
            course_limit=course_limit,
            recent_limit=recent_limit,
        )

    def deadlines(self, *, days: int = 30, limit: int = 50):
        return self.client.fetch_calendar(days=days, limit=limit)

    def courses(self, *, classification: str = "all", limit: int = 24, offset: int = 0):
        return self.client.fetch_enrolled_courses(classification=classification, limit=limit, offset=offset)

    def grades(self):
        return self.client.fetch_grades()

    def messages(self):
        return self.client.fetch_messages()

    def notifications(self):
        return self.client.fetch_notifications()


@dataclass(slots=True)
class AuthenticatedMailApi:
    credentials: UniversityCredentials
    _client: MailClient | None = None

    @property
    def client(self) -> MailClient:
        if self._client is None:
            username, password = self.credentials.mail_login
            client = MailClient()
            client.login(username, password)
            self._client = client
        return self._client

    def inbox(self, *, limit: int = 12):
        return self.client.fetch_inbox_summary(limit=limit)

    def mailbox(self, *, name: str = "INBOX", limit: int = 12, unread_only: bool = False, query: str = ""):
        return self.client.fetch_mailbox_summary(
            mailbox=name,
            limit=limit,
            unread_only=unread_only,
            query=query,
        )

    def mailboxes(self):
        return self.client.list_mailboxes()

    def message(self, uid: str, *, mailbox: str = "INBOX"):
        return self.client.fetch_message_detail(uid, mailbox=mailbox)

    def close(self) -> None:
        if self._client is not None:
            self._client.close()
            self._client = None


class TuebingenAuthenticatedClient:
    def __init__(self, credentials: UniversityCredentials) -> None:
        self.credentials = credentials
        self.public = TuebingenPublicClient()
        self.alma = AuthenticatedAlmaApi(credentials)
        self.ilias = AuthenticatedIliasApi(credentials)
        self.moodle = AuthenticatedMoodleApi(credentials)
        self.mail = AuthenticatedMailApi(credentials)
        self.discovery = CourseDiscoveryApi(
            CourseDiscoveryService(
                alma_loader=lambda: self.alma.client,
                ilias_loader=lambda: self.ilias.client,
            )
        )

    @classmethod
    def login(
        cls,
        *,
        username: str,
        password: str,
        mail_username: str | None = None,
        mail_password: str | None = None,
    ) -> "TuebingenAuthenticatedClient":
        return cls(UniversityCredentials(username, password, mail_username, mail_password))

    @classmethod
    def from_env(cls, env_file: str | Path | None = ".env") -> "TuebingenAuthenticatedClient":
        return cls(UniversityCredentials.from_env(env_file))

    def close(self) -> None:
        self.mail.close()

from __future__ import annotations

from typing import Any

from .client import AlmaClient
from .config import AlmaParseError, MailError
from .credentials import read_mail_credentials, read_uni_credentials
from .dashboard_builder import build_dashboard_payload
from .ilias_client import IliasClient
from .mail_client import MailClient
from .portal_common import DEFAULT_DASHBOARD_TERM, normalize_dashboard_term, serialize
from .portal_search import (
    build_dashboard_search_index,
    fetch_dashboard_index_item,
    search_dashboard_index,
)


class PortalService:
    def _alma_client(self) -> AlmaClient:
        username, password = read_uni_credentials()
        if not username or not password:
            raise AlmaParseError(
                "Set UNI_USERNAME and UNI_PASSWORD before using authenticated endpoints. "
                "Legacy ALMA_* and ILIAS_* env vars are still supported as fallbacks."
            )

        client = AlmaClient()
        client.login(username=username, password=password)
        return client

    def _ilias_client(self) -> IliasClient:
        username, password = read_uni_credentials()
        if not username or not password:
            raise AlmaParseError(
                "Set UNI_USERNAME and UNI_PASSWORD before using authenticated endpoints. "
                "Legacy ALMA_* and ILIAS_* env vars are still supported as fallbacks."
            )

        client = IliasClient()
        client.login(username=username, password=password)
        return client

    def _mail_client(self) -> MailClient:
        username, password = read_mail_credentials()
        if not username or not password:
            raise MailError(
                "Set UNI_USERNAME and UNI_PASSWORD before using mail endpoints. "
                "MAIL_USERNAME and MAIL_PASSWORD remain available as optional overrides."
            )

        client = MailClient()
        client.login(username=username, password=password)
        return client

    def _mail_panel(self, *, limit: int = 6) -> dict[str, Any]:
        try:
            client = self._mail_client()
            try:
                inbox = client.fetch_inbox_summary(limit=limit)
            finally:
                client.close()
        except MailError as error:
            return {
                "available": False,
                "account": None,
                "mailbox": "INBOX",
                "unreadCount": 0,
                "items": [],
                "error": str(error),
            }

        return {
            "available": True,
            "account": inbox.account,
            "mailbox": inbox.mailbox,
            "unreadCount": inbox.unread_count,
            "items": serialize(inbox.messages),
            "error": None,
        }

    def build_dashboard(
        self,
        *,
        term_label: str = DEFAULT_DASHBOARD_TERM,
        limit: int = 8,
        include_course_assignments: bool = True,
    ) -> dict[str, Any]:
        return build_dashboard_payload(
            term_label=term_label,
            limit=limit,
            include_course_assignments=include_course_assignments,
            load_alma_client=self._alma_client,
            load_ilias_client=self._ilias_client,
            load_mail_panel=self._mail_panel,
        )

    def build_search_index(self, *, term_label: str = DEFAULT_DASHBOARD_TERM) -> list[dict[str, Any]]:
        dashboard = self.build_dashboard(term_label=normalize_dashboard_term(term_label), limit=12)
        return build_dashboard_search_index(dashboard)

    def search(self, query: str, *, term_label: str = DEFAULT_DASHBOARD_TERM) -> list[dict[str, Any]]:
        return search_dashboard_index(query, self.build_search_index(term_label=term_label))

    def fetch_item(self, item_id: str, *, term_label: str = DEFAULT_DASHBOARD_TERM) -> dict[str, Any]:
        return fetch_dashboard_index_item(item_id, self.build_search_index(term_label=term_label))

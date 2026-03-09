from __future__ import annotations

from dataclasses import asdict, is_dataclass
from datetime import date, datetime
import os
from typing import Any

from .client import AlmaClient
from .config import AlmaParseError
from .ilias_client import IliasClient

DEFAULT_DASHBOARD_TERM = "Sommer 2026"


def serialize(value: Any) -> Any:
    if is_dataclass(value):
        return {key: serialize(item) for key, item in asdict(value).items()}
    if isinstance(value, dict):
        return {str(key): serialize(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [serialize(item) for item in value]
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


class PortalService:
    def _alma_client(self) -> AlmaClient:
        username = os.getenv("ALMA_USERNAME")
        password = os.getenv("ALMA_PASSWORD")
        if not username or not password:
            raise AlmaParseError("Set ALMA_USERNAME and ALMA_PASSWORD before using Alma endpoints.")

        client = AlmaClient()
        client.login(username=username, password=password)
        return client

    def _ilias_client(self) -> IliasClient:
        username = (
            os.getenv("ILIAS_USERNAME")
            or os.getenv("UNI_USERNAME")
            or os.getenv("ALMA_USERNAME")
        )
        password = (
            os.getenv("ILIAS_PASSWORD")
            or os.getenv("UNI_PASSWORD")
            or os.getenv("ALMA_PASSWORD")
        )
        if not username or not password:
            raise AlmaParseError(
                "Set ILIAS_USERNAME and ILIAS_PASSWORD, or UNI_USERNAME / UNI_PASSWORD, before using ILIAS endpoints."
            )

        client = IliasClient()
        client.login(username=username, password=password)
        return client

    def build_dashboard(self, *, term_label: str = DEFAULT_DASHBOARD_TERM, limit: int = 8) -> dict[str, Any]:
        alma = self._alma_client()
        ilias = self._ilias_client()

        timetable = alma.fetch_timetable_for_term(term_label)
        enrollments = alma.fetch_enrollment_page()
        exams = alma.fetch_exam_overview()[:limit]
        documents = alma.list_studyservice_reports()[:limit]
        ilias_root = ilias.fetch_root_page()

        return {
            "generatedAt": datetime.utcnow().isoformat() + "Z",
            "termLabel": timetable.term_label,
            "hero": {
                "title": "Study Hub",
                "subtitle": "A single surface for Alma schedule data, study-service documents, and ILIAS navigation.",
            },
            "metrics": [
                {"label": "Upcoming events", "value": len(timetable.occurrences)},
                {"label": "Exam rows", "value": len(exams)},
                {"label": "Document jobs", "value": len(documents)},
                {
                    "label": "ILIAS entry points",
                    "value": len(ilias_root.mainbar_links) + len(ilias_root.top_categories),
                },
            ],
            "agenda": {
                "exportUrl": timetable.export_url,
                "items": serialize(timetable.occurrences[:limit]),
            },
            "documents": serialize(documents),
            "exams": serialize(exams),
            "enrollment": serialize(enrollments),
            "ilias": {
                "title": ilias_root.title,
                "mainbarLinks": serialize(ilias_root.mainbar_links),
                "topCategories": serialize(ilias_root.top_categories),
            },
        }

    def build_search_index(self, *, term_label: str = DEFAULT_DASHBOARD_TERM) -> list[dict[str, Any]]:
        dashboard = self.build_dashboard(term_label=term_label, limit=12)
        items: list[dict[str, Any]] = []

        for index, event in enumerate(dashboard["agenda"]["items"], start=1):
            items.append(
                {
                    "id": f"event:{index}",
                    "title": event["summary"],
                    "url": dashboard["agenda"]["exportUrl"],
                    "text": (
                        f'{event["summary"]}\n'
                        f'Start: {event["start"]}\n'
                        f'End: {event["end"]}\n'
                        f'Location: {event["location"] or "-"}'
                    ),
                    "metadata": {"kind": "agenda", "termLabel": dashboard["termLabel"]},
                }
            )

        for report in dashboard["documents"]:
            items.append(
                {
                    "id": f'document:{report["trigger_name"]}',
                    "title": report["label"],
                    "url": "https://alma.uni-tuebingen.de/alma/pages/cm/exa/enrollment/info/start.xhtml?_flowId=studyservice-flow",
                    "text": f'Document export job: {report["label"]}',
                    "metadata": {"kind": "document"},
                }
            )

        for exam in dashboard["exams"]:
            exam_number = exam["number"] or exam["title"]
            items.append(
                {
                    "id": f"exam:{exam_number}",
                    "title": exam["title"],
                    "url": "https://alma.uni-tuebingen.de/alma/pages/sul/examAssessment/personExamsReadonly.xhtml?_flowId=examsOverviewForPerson-flow",
                    "text": (
                        f'Title: {exam["title"]}\n'
                        f'Number: {exam["number"] or "-"}\n'
                        f'Grade: {exam["grade"] or "-"}\n'
                        f'Status: {exam["status"] or "-"}'
                    ),
                    "metadata": {"kind": "exam"},
                }
            )

        for link in dashboard["ilias"]["mainbarLinks"]:
            items.append(
                {
                    "id": f'mainbar:{link["label"]}',
                    "title": link["label"],
                    "url": link["url"],
                    "text": f'ILIAS main navigation link: {link["label"]}',
                    "metadata": {"kind": "ilias-mainbar"},
                }
            )

        for link in dashboard["ilias"]["topCategories"]:
            items.append(
                {
                    "id": f'category:{link["label"]}',
                    "title": link["label"],
                    "url": link["url"],
                    "text": f'ILIAS top category: {link["label"]}',
                    "metadata": {"kind": "ilias-category"},
                }
            )

        return items

    def search(self, query: str, *, term_label: str = DEFAULT_DASHBOARD_TERM) -> list[dict[str, Any]]:
        normalized_query = query.strip().lower()
        if not normalized_query:
            raise AlmaParseError("A non-empty search query is required.")

        matches: list[dict[str, Any]] = []
        for item in self.build_search_index(term_label=term_label):
            haystack = "\n".join(
                [
                    item["title"],
                    item["text"],
                    " ".join(f"{key}:{value}" for key, value in item.get("metadata", {}).items()),
                ]
            ).lower()
            if normalized_query in haystack:
                matches.append(item)
        return matches

    def fetch_item(self, item_id: str, *, term_label: str = DEFAULT_DASHBOARD_TERM) -> dict[str, Any]:
        normalized_id = item_id.strip()
        if not normalized_id:
            raise AlmaParseError("A non-empty item id is required.")

        for item in self.build_search_index(term_label=term_label):
            if item["id"] == normalized_id:
                return item
        raise AlmaParseError(f"No unified portal item was found for id '{normalized_id}'.")

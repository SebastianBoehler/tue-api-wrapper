from __future__ import annotations

from dataclasses import asdict, is_dataclass
from datetime import date, datetime
from typing import Any

from .client import AlmaClient
from .config import AlmaParseError
from .credentials import read_uni_credentials
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

    def build_dashboard(self, *, term_label: str = DEFAULT_DASHBOARD_TERM, limit: int = 8) -> dict[str, Any]:
        alma = self._alma_client()
        ilias = self._ilias_client()

        timetable = alma.fetch_timetable_for_term(term_label)
        enrollments = alma.fetch_enrollment_page()
        exams = alma.fetch_exam_overview()[:limit]
        studyservice_contract = alma.fetch_studyservice_contract()
        documents = studyservice_contract.reports[:limit]
        ilias_root = ilias.fetch_root_page()
        memberships = ilias.fetch_membership_overview()[:limit]
        tasks = ilias.fetch_task_overview()[:limit]

        passed_exams = [
            exam for exam in exams
            if (exam.status or "").strip().upper() in {"BE", "PASSED", "BESTANDEN"}
            or bool(exam.grade and exam.grade.strip() not in {"", "-", "5,0"})
        ]
        credit_values = [
            float((exam.cp or "0").replace(",", "."))
            for exam in exams
            if exam.cp and exam.cp.strip() not in {"", "-"}
        ]

        return {
            "generatedAt": datetime.utcnow().isoformat() + "Z",
            "termLabel": timetable.term_label,
            "hero": {
                "title": "Study Hub",
                "subtitle": "Your next classes, open course work, study records, and learning spaces in one place.",
            },
            "metrics": [
                {"label": "Upcoming events", "value": len(timetable.occurrences)},
                {"label": "Open tasks", "value": len(tasks)},
                {"label": "Learning spaces", "value": len(memberships)},
                {"label": "Passed exams", "value": len(passed_exams)},
            ],
            "agenda": {
                "exportUrl": timetable.export_url,
                "items": serialize(timetable.occurrences[:limit]),
            },
            "study": {
                "selectedTerm": enrollments.selected_term,
                "message": enrollments.message,
                "passedExamCount": len(passed_exams),
                "trackedCredits": round(sum(credit_values), 1),
                "availableTerms": serialize(enrollments.available_terms),
            },
            "documents": {
                "reports": serialize(documents),
                "currentDownloadAvailable": studyservice_contract.latest_download_url is not None,
                "currentDownloadUrl": "/api/alma/documents/current"
                if studyservice_contract.latest_download_url is not None
                else None,
                "sourcePageUrl": alma.studyservice_url,
            },
            "exams": serialize(exams),
            "enrollment": serialize(enrollments),
            "ilias": {
                "title": ilias_root.title,
                "mainbarLinks": serialize(ilias_root.mainbar_links),
                "topCategories": serialize(ilias_root.top_categories),
                "memberships": serialize(memberships),
                "tasks": serialize(tasks),
            },
            "quickLinks": [
                {
                    "label": "Progress",
                    "href": "/progress",
                    "description": "Review grades, credits, and term-level study status.",
                },
                {
                    "label": "Tasks",
                    "href": "/tasks",
                    "description": "See active ILIAS due items without opening multiple spaces.",
                },
                {
                    "label": "Learning spaces",
                    "href": "/spaces",
                    "description": "Open course, group, and materials spaces from your memberships.",
                },
                {
                    "label": "Documents",
                    "href": "/documents",
                    "description": "Access Alma study-service PDFs and report jobs.",
                },
            ],
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

        for report in dashboard["documents"]["reports"]:
            items.append(
                {
                    "id": f'document:{report["trigger_name"]}',
                    "title": report["label"],
                    "url": dashboard["documents"]["sourcePageUrl"],
                    "text": f'Document export job: {report["label"]}',
                    "metadata": {
                        "kind": "document",
                        "triggerName": report["trigger_name"],
                    },
                }
            )

        if dashboard["documents"]["currentDownloadUrl"] is not None:
            items.append(
                {
                    "id": "document:current",
                    "title": "Current study-service PDF",
                    "url": dashboard["documents"]["currentDownloadUrl"],
                    "text": "Download the PDF currently exposed by Alma on the study-service page.",
                    "metadata": {"kind": "document-download"},
                }
            )

        for index, link in enumerate(dashboard["quickLinks"], start=1):
            items.append(
                {
                    "id": f"quicklink:{index}",
                    "title": link["label"],
                    "url": link["href"],
                    "text": link["description"],
                    "metadata": {"kind": "quicklink"},
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

        for membership in dashboard["ilias"]["memberships"]:
            items.append(
                {
                    "id": f'membership:{membership["title"]}',
                    "title": membership["title"],
                    "url": membership["url"],
                    "text": "\n".join(
                        [
                            membership.get("description") or "",
                            *membership.get("properties", []),
                        ]
                    ).strip(),
                    "metadata": {
                        "kind": "ilias-membership",
                        "type": membership.get("kind") or "",
                    },
                }
            )

        for task in dashboard["ilias"]["tasks"]:
            items.append(
                {
                    "id": f'task:{task["title"]}',
                    "title": task["title"],
                    "url": task["url"],
                    "text": "\n".join(
                        [
                            f'Type: {task.get("item_type") or "-"}',
                            f'Start: {task.get("start") or "-"}',
                            f'End: {task.get("end") or "-"}',
                        ]
                    ),
                    "metadata": {"kind": "ilias-task"},
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

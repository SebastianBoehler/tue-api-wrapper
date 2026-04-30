from __future__ import annotations

from typing import Any

from .config import AlmaParseError


def build_dashboard_search_index(dashboard: dict[str, Any]) -> list[dict[str, Any]]:
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

    for message in dashboard.get("mail", {}).get("items", []):
        sender = message.get("from_address") or message.get("from_name") or "Unknown sender"
        items.append(
            {
                "id": f'mail:{message["uid"]}',
                "title": message["subject"],
                "url": f'/mail/{message["uid"]}',
                "text": f"From: {sender}\nPreview: {message.get('preview') or '-'}",
                "metadata": {"kind": "mail", "unread": bool(message.get("is_unread"))},
            }
        )

    for talk in dashboard.get("talks", {}).get("items", []):
        items.append(
            {
                "id": f'talk:{talk["id"]}',
                "title": talk["title"],
                "url": talk["source_url"],
                "text": "\n".join(
                    [
                        f'Speaker: {talk.get("speaker_name") or "-"}',
                        f'Time: {talk.get("timestamp") or "-"}',
                        f'Location: {talk.get("location") or "-"}',
                        talk.get("description") or "",
                    ]
                ).strip(),
                "metadata": {"kind": "talk"},
            }
        )

    for exam in dashboard["exams"]:
        exam_number = exam["number"] or exam["title"]
        items.append(
            {
                "id": f"exam:{exam_number}",
                "title": exam["title"],
                "url": (
                    "https://alma.uni-tuebingen.de/alma/pages/sul/examAssessment/"
                    "personExamsReadonly.xhtml?_flowId=examsOverviewForPerson-flow"
                ),
                "text": (
                    f'Title: {exam["title"]}\n'
                    f'Number: {exam["number"] or "-"}\n'
                    f'Grade: {exam["grade"] or "-"}\n'
                    f'Status: {exam["status"] or "-"}'
                ),
                "metadata": {"kind": "exam"},
            }
        )

    _append_ilias_links(items, dashboard)
    _append_ilias_memberships(items, dashboard)
    _append_ilias_tasks(items, dashboard)
    return items


def search_dashboard_index(query: str, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized_query = query.strip().lower()
    if not normalized_query:
        raise AlmaParseError("A non-empty search query is required.")

    matches: list[dict[str, Any]] = []
    for item in items:
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


def fetch_dashboard_index_item(item_id: str, items: list[dict[str, Any]]) -> dict[str, Any]:
    normalized_id = item_id.strip()
    if not normalized_id:
        raise AlmaParseError("A non-empty item id is required.")

    for item in items:
        if item["id"] == normalized_id:
            return item
    raise AlmaParseError(f"No unified portal item was found for id '{normalized_id}'.")


def _append_ilias_links(items: list[dict[str, Any]], dashboard: dict[str, Any]) -> None:
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


def _append_ilias_memberships(items: list[dict[str, Any]], dashboard: dict[str, Any]) -> None:
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


def _append_ilias_tasks(items: list[dict[str, Any]], dashboard: dict[str, Any]) -> None:
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

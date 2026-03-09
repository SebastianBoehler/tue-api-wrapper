from __future__ import annotations

from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .config import AlmaParseError
from .models import IliasExerciseAssignment, IliasForumTopic


def parse_forum_topics(html: str, page_url: str) -> tuple[IliasForumTopic, ...]:
    soup = BeautifulSoup(html, "html.parser")
    topics: list[IliasForumTopic] = []
    for item in soup.select(".il-item.il-std-item"):
        title_link = item.select_one(".il-item-title a[href]")
        if title_link is None:
            continue
        properties = _extract_item_properties(item)
        topics.append(
            IliasForumTopic(
                title=" ".join(title_link.get_text(" ", strip=True).split()),
                url=urljoin(page_url, title_link["href"]),
                author=properties.get("Angelegt von"),
                posts=properties.get("Beiträge"),
                last_post=properties.get("Letzter Beitrag"),
                visits=properties.get("Besuche"),
            )
        )
    if not topics and "ILIAS Universität Tübingen" not in html:
        raise AlmaParseError("The response did not look like an authenticated ILIAS forum page.")
    return tuple(topics)


def parse_exercise_assignments(html: str, page_url: str) -> tuple[IliasExerciseAssignment, ...]:
    soup = BeautifulSoup(html, "html.parser")
    assignments: list[IliasExerciseAssignment] = []
    for item in soup.select(".il-item.il-std-item"):
        title_link = item.select_one(".il-item-title a[href]")
        if title_link is None:
            continue
        properties = _extract_item_properties(item)
        team_button = item.find("button", attrs={"data-action": True})
        due_hint = None
        first_col = item.select_one(".col-sm-3")
        if first_col is not None:
            due_hint = " ".join(first_col.get_text(" ", strip=True).split()) or None
        assignments.append(
            IliasExerciseAssignment(
                title=" ".join(title_link.get_text(" ", strip=True).split()),
                url=urljoin(page_url, title_link["href"]),
                due_hint=due_hint,
                due_at=properties.get("Abgabetermin"),
                requirement=properties.get("Anforderung"),
                last_submission=properties.get("Datum der letzten Abgabe"),
                submission_type=properties.get("Type"),
                status=properties.get("Status"),
                team_action_url=urljoin(page_url, team_button["data-action"]) if team_button else None,
            )
        )
    if not assignments and "ILIAS Universität Tübingen" not in html:
        raise AlmaParseError("The response did not look like an authenticated ILIAS exercise page.")
    return tuple(assignments)


def _extract_item_properties(item) -> dict[str, str]:
    properties: dict[str, str] = {}
    for name_node in item.select(".il-item-property-name"):
        value_node = name_node.find_next_sibling(class_="il-item-property-value")
        name = " ".join(name_node.get_text(" ", strip=True).split())
        value = " ".join(value_node.get_text(" ", strip=True).split()) if value_node else ""
        if name:
            properties[name] = value
    return properties

from __future__ import annotations

import json
import re
from urllib.parse import parse_qs, urljoin, urlparse

from bs4 import BeautifulSoup

from .config import AlmaParseError
from .moodle_models import (
    MoodleCategoryPage,
    MoodleCategorySummary,
    MoodleCourseDetail,
    MoodleCourseSummary,
    MoodlePageConfig,
)

_CFG_PATTERN = re.compile(r"M\.cfg\s*=\s*(\{.*?\});", re.DOTALL)


def extract_moodle_shib_login_url(html: str, page_url: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for link in soup.find_all("a", href=True):
        href = str(link["href"])
        if "/auth/shibboleth/index.php" in href:
            return urljoin(page_url, href)
    raise AlmaParseError("Could not find the Moodle Shibboleth login link.")


def extract_moodle_page_config(html: str) -> MoodlePageConfig:
    match = _CFG_PATTERN.search(html)
    if match is None:
        raise AlmaParseError("Could not find the Moodle page config payload.")
    payload = json.loads(match.group(1))
    sesskey = str(payload.get("sesskey", "")).strip()
    if not sesskey:
        raise AlmaParseError("Could not find a Moodle sesskey in the page config.")
    return MoodlePageConfig(
        sesskey=sesskey,
        user_id=_as_int(payload.get("userId")),
        course_id=_as_int(payload.get("courseId")),
        context_id=_as_int(payload.get("contextid")),
    )


def extract_moodle_page_message(html: str) -> str | None:
    soup = BeautifulSoup(html, "html.parser")
    for selector in (".alert-danger", ".alert-warning", ".notifyproblem", ".errorbox", ".loginerrors"):
        node = soup.select_one(selector)
        if node is not None:
            message = _clean_text(node.get_text(" ", strip=True))
            if message:
                return message
    return None


def parse_moodle_category_page(html: str, page_url: str) -> MoodleCategoryPage:
    soup = BeautifulSoup(html, "html.parser")
    categories: list[MoodleCategorySummary] = []
    seen_category_ids: set[int | None] = set()
    for link in soup.select('a[href*="/course/index.php?categoryid="]'):
        url = urljoin(page_url, link["href"])
        category_id = _category_id_from_url(url)
        if category_id in seen_category_ids:
            continue
        seen_category_ids.add(category_id)
        title = _clean_text(link.get_text(" ", strip=True))
        if not title:
            continue
        container = link.find_parent(class_=lambda value: isinstance(value, str) and "category" in value.lower())
        description = None
        if container is not None:
            description = _first_text(container.select(".categorydescription, .content .description"))
        categories.append(
            MoodleCategorySummary(
                id=category_id,
                title=title,
                url=url,
                description=description,
                course_count=None,
            )
        )

    courses: list[MoodleCourseSummary] = []
    seen_course_ids: set[int | None] = set()
    for coursebox in soup.select(".coursebox"):
        course_id = _as_int(coursebox.get("data-courseid"))
        if course_id in seen_course_ids:
            continue
        title_link = coursebox.select_one('.coursename a[href], a[href*="/course/view.php?id="]')
        title = _clean_text(title_link.get_text(" ", strip=True)) if title_link is not None else None
        if not title:
            continue
        seen_course_ids.add(course_id)
        courses.append(
            MoodleCourseSummary(
                id=course_id or _course_id_from_url(title_link["href"]) if title_link is not None else None,
                title=title,
                shortname=None,
                category_name=None,
                visible=None,
                end_date=None,
                url=urljoin(page_url, title_link["href"]) if title_link is not None else None,
                image_url=_image_url(coursebox, page_url),
                summary=_first_text(coursebox.select(".summary, .content .summary")),
                teachers=tuple(_texts(coursebox.select(".teachers a, .teachers li"))),
            )
        )

    return MoodleCategoryPage(
        category_id=_category_id_from_url(page_url),
        title=_page_title(soup),
        source_url=page_url,
        categories=tuple(categories),
        courses=tuple(courses),
    )


def parse_moodle_course_detail_page(html: str, page_url: str) -> MoodleCourseDetail:
    soup = BeautifulSoup(html, "html.parser")
    coursebox = soup.select_one(".coursebox") or soup
    title = _first_text(coursebox.select(".coursename a, h1")) or _page_title(soup)
    teachers = tuple(_texts(coursebox.select(".teachers a, .teachers li")))
    summary = _first_text(coursebox.select(".summary, .content .summary"))

    enrol_form = None
    for form in soup.find_all("form"):
        action = urljoin(page_url, form.get("action", ""))
        if "/enrol/index.php" in action:
            enrol_form = form
            break

    payload: dict[str, str] = {}
    enrolment_key_field_name = None
    if enrol_form is not None:
        for field in enrol_form.select("input[name]"):
            field_name = str(field.get("name", "")).strip()
            if not field_name:
                continue
            if field.get("type") in {"submit", "password"}:
                continue
            payload[field_name] = field.get("value", "")
        password_field = enrol_form.select_one('input[type="password"][name]')
        if password_field is not None:
            enrolment_key_field_name = str(password_field["name"])

    enrolment_label = _first_text(soup.select("legend, .enrolmenticons [aria-label], .enrolmenticons [title]"))
    no_key_text = "Kein Einschreibekennwort notwendig" in html
    course_url = None
    title_link = coursebox.select_one('.coursename a[href], a[href*="/course/view.php?id="]')
    if title_link is not None:
        course_url = urljoin(page_url, title_link["href"])

    return MoodleCourseDetail(
        id=_course_id_from_url(course_url or page_url) or _as_int(payload.get("id")) or _as_int(coursebox.get("data-courseid")),
        title=title,
        source_url=page_url,
        course_url=course_url,
        summary=summary,
        teachers=teachers,
        self_enrolment_available=enrol_form is not None,
        requires_enrolment_key=bool(enrol_form is not None and not no_key_text and enrolment_key_field_name),
        enrolment_label=enrolment_label,
        enrolment_action_url=urljoin(page_url, enrol_form.get("action", "")) if enrol_form is not None else None,
        enrolment_payload=payload,
        enrolment_key_field_name=enrolment_key_field_name,
    )

def _page_title(soup: BeautifulSoup) -> str:
    heading = soup.select_one("h1, title")
    if heading is None:
        raise AlmaParseError("Could not determine the Moodle page title.")
    return _clean_text(heading.get_text(" ", strip=True))


def _first_text(nodes: list[object]) -> str | None:
    for node in nodes:
        text = _clean_text(node.get_text(" ", strip=True))
        if text:
            return text
    return None


def _texts(nodes: list[object]) -> list[str]:
    values: list[str] = []
    for node in nodes:
        text = _clean_text(node.get_text(" ", strip=True))
        if text and text not in values:
            values.append(text)
    return values


def _clean_text(value: str) -> str:
    return " ".join(value.split())


def _as_int(value: object) -> int | None:
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.strip():
        try:
            return int(value.strip())
        except ValueError:
            return None
    return None


def _category_id_from_url(url: str) -> int | None:
    return _extract_query_int(url, "categoryid")


def _course_id_from_url(url: str) -> int | None:
    return _extract_query_int(url, "id")


def _extract_query_int(url: str, key: str) -> int | None:
    values = parse_qs(urlparse(url).query).get(key, [])
    return _as_int(values[0]) if values else None


def _image_url(node: object, page_url: str) -> str | None:
    image = node.select_one("img[src]")
    return urljoin(page_url, image["src"]) if image is not None else None

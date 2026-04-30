from __future__ import annotations

import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup, Tag
import requests

from .config import AlmaParseError, DEFAULT_TIMEOUT_SECONDS
from .directory_models import (
    DirectoryAction,
    DirectoryContactSection,
    DirectoryField,
    DirectoryForm,
    DirectoryOrganization,
    DirectoryOrganizationSummary,
    DirectoryPerson,
    DirectoryPersonSection,
    DirectoryPersonSummary,
    DirectorySearchResponse,
)

DIRECTORY_START_URL = "https://epv-welt.uni-tuebingen.de/RestrictedPages/StartSearch.aspx"


class UniversityDirectoryClient:
    def __init__(self, *, timeout: int = DEFAULT_TIMEOUT_SECONDS, session: requests.Session | None = None) -> None:
        self.timeout = timeout
        self.session = session or requests.Session()
        self.session.headers.update({"User-Agent": "tue-api-wrapper-desktop/0.1"})

    def search(self, query: str) -> DirectorySearchResponse:
        query = query.strip()
        if len(query) < 2:
            raise AlmaParseError("Enter at least two characters to search the public university directory.")

        page = self.session.get(DIRECTORY_START_URL, timeout=self.timeout)
        page.raise_for_status()
        form, query_field, button_name, button_value = _search_form(page.text, page.url)
        response = self.session.post(
            form.action_url,
            data=_set_payload(_set_payload(form.payload, query_field, query), button_name, button_value),
            timeout=self.timeout,
        )
        response.raise_for_status()
        return parse_directory_response(response.text, query=query, page_url=response.url)

    def submit(self, *, query: str, form: DirectoryForm, action: DirectoryAction) -> DirectorySearchResponse:
        payload = _apply_action(form.payload, action)
        response = self.session.post(form.action_url, data=payload, timeout=self.timeout)
        response.raise_for_status()
        return parse_directory_response(response.text, query=query.strip(), page_url=response.url)


def parse_directory_response(html: str, *, query: str, page_url: str) -> DirectorySearchResponse:
    soup = BeautifulSoup(html, "html.parser")
    primary = _primary_content(soup)
    title = _text(primary.find("h1")) or "People"
    page = page_url.rsplit("/", 1)[-1].lower()

    if page == "searchresultpersons.aspx":
        return DirectorySearchResponse(query, title, "people", form=_page_form(soup, page_url), sections=_person_sections(primary, title))
    if page == "singleperson.aspx":
        return DirectorySearchResponse(query, title, "person", person=_person(primary, title))
    if page == "searchresultorganizations.aspx":
        return DirectorySearchResponse(
            query,
            title,
            "organizations",
            form=_page_form(soup, page_url),
            organizations=_organizations(primary),
        )
    if page == "singleorganization.aspx":
        return DirectorySearchResponse(
            query,
            title,
            "organization",
            form=_page_form(soup, page_url),
            organization=_organization(primary, title),
        )
    if page == "sizelimitexceeded.aspx":
        return DirectorySearchResponse(query, title, "tooManyResults", message=_page_message(primary))
    if page == "emptyresult.aspx":
        return DirectorySearchResponse(query, title, "empty", message=_page_message(primary))
    raise AlmaParseError("The public university directory returned an unsupported result page.")


def _search_form(html: str, page_url: str) -> tuple[DirectoryForm, str, str, str]:
    soup = BeautifulSoup(html, "html.parser")
    form = _page_form(soup, page_url)
    query_input = soup.find("input", attrs={"type": re.compile("^text$", re.I), "name": re.compile("NameTextBox")})
    button = soup.find("input", attrs={"type": re.compile("^submit$", re.I), "name": re.compile("SearchButton")})
    if not isinstance(query_input, Tag) or not isinstance(button, Tag):
        raise AlmaParseError("The public directory search form is incomplete.")
    return form, str(query_input.get("name")), str(button.get("name")), str(button.get("value", ""))


def _page_form(soup: BeautifulSoup, page_url: str) -> DirectoryForm:
    form = soup.find("form")
    if not isinstance(form, Tag):
        raise AlmaParseError("The public directory did not return a form.")
    return DirectoryForm(
        action_url=urljoin(page_url, str(form.get("action", ""))),
        payload=tuple(
            (str(node.get("name")), str(node.get("value", "")))
            for node in form.find_all("input")
            if node.get("name") and str(node.get("type", "")).lower() not in {"checkbox", "radio", "button", "image", "file", "reset", "submit"}
        ),
    )


def _primary_content(soup: BeautifulSoup) -> BeautifulSoup | Tag:
    return soup.find(id="content") or soup


def _person_sections(primary: BeautifulSoup | Tag, title: str) -> tuple[DirectoryPersonSection, ...]:
    sections: list[DirectoryPersonSection] = []
    for heading in primary.find_all("h2"):
        list_node = heading.find_next_sibling("ul")
        if not isinstance(list_node, Tag):
            continue
        items = _person_items(list_node)
        if items:
            sections.append(DirectoryPersonSection(_text(heading), items))
    if not sections:
        items = _person_items(primary)
        if items:
            sections.append(DirectoryPersonSection(title, items))
    if not sections:
        raise AlmaParseError("The directory returned a people-results page without visible entries.")
    return tuple(sections)


def _person_items(node: BeautifulSoup | Tag) -> tuple[DirectoryPersonSummary, ...]:
    items: list[DirectoryPersonSummary] = []
    for item in node.find_all("li"):
        link = item.find("a")
        action = _event_action(link)
        name = _text(link)
        if action is None or not name:
            continue
        subtitle_node = item.find("span")
        subtitle = _text(subtitle_node).strip("() ") or None
        items.append(DirectoryPersonSummary(name, subtitle, action))
    return tuple(items)


def _organizations(primary: BeautifulSoup | Tag) -> tuple[DirectoryOrganizationSummary, ...]:
    items: list[DirectoryOrganizationSummary] = []
    for link in primary.find_all("a"):
        action = _event_action(link)
        name = _text(link)
        if action and name:
            items.append(DirectoryOrganizationSummary(name, action))
    if not items:
        raise AlmaParseError("The directory returned an organization-results page without visible entries.")
    return tuple(items)


def _person(primary: BeautifulSoup | Tag, title: str) -> DirectoryPerson:
    tables = primary.find_all("table")
    sections: list[DirectoryContactSection] = []
    for header in primary.select(".cp_title"):
        content = header.find_next_sibling(class_=re.compile(r"\bcp_content\b"))
        table = content.find("table") if isinstance(content, Tag) else None
        fields = _fields(table) if isinstance(table, Tag) else ()
        if fields:
            sections.append(DirectoryContactSection(_text(header), fields))
    return DirectoryPerson(
        name=title,
        summary=_text(primary.find("h3")) or None,
        attributes=_fields(tables[0]) if tables else (),
        contact_sections=tuple(sections),
    )


def _organization(primary: BeautifulSoup | Tag, title: str) -> DirectoryOrganization:
    button = primary.find("input", attrs={"type": re.compile("^submit$", re.I), "name": re.compile("PersonListButton")})
    action = DirectoryAction("submit", name=str(button.get("name")), value=str(button.get("value", ""))) if isinstance(button, Tag) else None
    table = primary.find("table")
    return DirectoryOrganization(name=title, fields=_fields(table) if isinstance(table, Tag) else (), person_list_action=action)


def _fields(table: Tag) -> tuple[DirectoryField, ...]:
    rows: list[DirectoryField] = []
    for row in table.find_all("tr"):
        cells = row.find_all(["td", "th"])
        if len(cells) >= 2:
            label = _text(cells[0]).rstrip(":")
            value = _text(cells[1])
            if label and value:
                rows.append(DirectoryField(label, value))
    return tuple(rows)


def _event_action(link: Tag | None) -> DirectoryAction | None:
    href = str(link.get("href", "")) if isinstance(link, Tag) else ""
    match = re.search(r"__doPostBack\(['\"]([^'\"]+)['\"]", href)
    return DirectoryAction("event", target=match.group(1)) if match else None


def _page_message(primary: BeautifulSoup | Tag) -> str:
    return "\n\n".join(_text(node) for node in primary.find_all("p") if _text(node))


def _apply_action(payload: tuple[tuple[str, str], ...], action: DirectoryAction) -> tuple[tuple[str, str], ...]:
    if action.kind == "event" and action.target:
        return _set_payload(_set_payload(payload, "__EVENTTARGET", action.target), "__EVENTARGUMENT", "")
    if action.kind == "submit" and action.name:
        return _set_payload(payload, action.name, action.value or "")
    raise AlmaParseError("The public directory action is not valid.")


def _set_payload(payload: tuple[tuple[str, str], ...], name: str, value: str) -> tuple[tuple[str, str], ...]:
    changed = False
    next_payload: list[tuple[str, str]] = []
    for field_name, field_value in payload:
        if field_name == name:
            changed = True
            next_payload.append((field_name, value))
        else:
            next_payload.append((field_name, field_value))
    return tuple(next_payload if changed else next_payload + [(name, value)])


def _text(node: Tag | None) -> str:
    if not isinstance(node, Tag):
        return ""
    for image in node.find_all("img", alt=re.compile("^At$", re.I)):
        image.replace_with("@")
    for br in node.find_all("br"):
        br.replace_with("\n")
    raw = re.sub(r"\s*@\s*", "@", node.get_text(" ", strip=True))
    return "\n".join(" ".join(line.split()) for line in raw.splitlines() if line.strip())

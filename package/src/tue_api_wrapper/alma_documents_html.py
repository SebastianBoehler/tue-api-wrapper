from __future__ import annotations

import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .alma_studyservice_models import (
    AlmaStudyServiceOutputRequest,
    AlmaStudyServicePage,
    AlmaStudyServiceTab,
)
from .config import AlmaParseError
from .models import AlmaDocumentReport


def _clean_text(value: str) -> str:
    return " ".join(value.split())


def _extract_tabs(form) -> tuple[AlmaStudyServiceTab, ...]:
    tabs: list[AlmaStudyServiceTab] = []
    for button in form.find_all("button", attrs={"name": lambda value: bool(value and value.startswith("studyserviceForm:content."))}):
        label = _clean_text(button.get_text(" ", strip=True))
        if not label:
            continue
        tabs.append(
            AlmaStudyServiceTab(
                button_name=button["name"],
                label=label,
                is_active="active" in button.get("class", []),
            )
        )
    return tuple(tabs)


def _extract_output_requests(form) -> tuple[AlmaStudyServiceOutputRequest, ...]:
    requests: list[AlmaStudyServiceOutputRequest] = []
    for link in form.find_all("a", id=lambda value: bool(value and value.endswith(":showOutputRequestGroup"))):
        parts = [_clean_text(text) for text in link.stripped_strings if _clean_text(text)]
        if not parts:
            continue
        count = None
        message = None
        label = parts[0]
        for part in parts[1:]:
            if re.fullmatch(r"\(\d+\)", part):
                count = int(part[1:-1])
                continue
            if message is None:
                message = part
        requests.append(
            AlmaStudyServiceOutputRequest(
                trigger_name=link["id"],
                label=label,
                count=count,
                message=message,
            )
        )
    return tuple(requests)


def extract_studyservice_page(html: str, page_url: str) -> AlmaStudyServicePage:
    soup = BeautifulSoup(html, "html.parser")
    form = soup.find("form", id="studyserviceForm")
    if form is None:
        raise AlmaParseError("Could not find the Alma study service form.")

    payload: dict[str, str] = {}
    for field in form.find_all("input"):
        name = field.get("name")
        field_type = field.get("type", "")
        if not name or field_type in {"button", "checkbox", "file", "image", "password", "submit"}:
            continue
        payload[name] = field.get("value", "")

    reports: list[AlmaDocumentReport] = []
    for button in form.find_all("button"):
        name = button.get("name")
        if not name or not name.endswith(":job2"):
            continue
        label_node = button.find(class_="jobname")
        label = label_node.get_text(" ", strip=True) if label_node else button.get_text(" ", strip=True)
        if label:
            reports.append(AlmaDocumentReport(label=label, trigger_name=name))

    latest_link = form.find("a", href=lambda href: href and "state=docdownload" in href)
    latest_download_url = urljoin(page_url, latest_link["href"]) if latest_link else None
    banner = form.find(id="studyserviceForm:outputTextInforbar")
    person_heading = form.find("h2", string=lambda value: bool(value and "Personendaten:" in value))
    person_name = None
    if person_heading is not None:
        match = re.search(r"Personendaten:\s*(.+)$", _clean_text(person_heading.get_text(" ", strip=True)))
        if match:
            person_name = match.group(1).strip() or None

    tabs = _extract_tabs(form)
    active_tab_label = next((tab.label for tab in tabs if tab.is_active), None)
    output_requests = _extract_output_requests(form)

    return AlmaStudyServicePage(
        action_url=urljoin(page_url, form["action"]),
        payload=payload,
        reports=tuple(reports),
        latest_download_url=latest_download_url,
        banner_text=_clean_text(banner.get_text(" ", strip=True)) if banner is not None else None,
        person_name=person_name,
        active_tab_label=active_tab_label,
        tabs=tabs,
        output_requests=output_requests,
    )

from __future__ import annotations

from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .config import AlmaParseError
from .models import AlmaDocumentReport, AlmaStudyServicePage


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

    return AlmaStudyServicePage(
        action_url=urljoin(page_url, form["action"]),
        payload=payload,
        reports=tuple(reports),
        latest_download_url=latest_download_url,
    )

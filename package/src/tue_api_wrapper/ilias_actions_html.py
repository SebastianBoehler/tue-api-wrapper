from __future__ import annotations

import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .config import AlmaParseError
from .ilias_actions_models import IliasWaitlistResult, IliasWaitlistSupport


def find_waitlist_join_url(html: str, page_url: str) -> str | None:
    soup = BeautifulSoup(html, "html.parser")
    form = soup.find("form", action=lambda value: bool(value and "ilCourseRegistrationGUI" in value))
    if form is not None:
        return urljoin(page_url, form.get("action", page_url))
    if "ilCourseRegistrationGUI" in page_url:
        return page_url
    link = soup.find("a", href=lambda value: bool(value and "ilCourseRegistrationGUI" in value))
    return urljoin(page_url, link["href"]) if link else None


def build_waitlist_payload(html: str, *, accept_agreement: bool = False) -> dict[str, str]:
    soup = BeautifulSoup(html, "html.parser")
    payload: dict[str, str] = {}
    form = soup.find("form", action=lambda value: bool(value and "ilCourseRegistrationGUI" in value))
    if form is not None:
        for field in form.find_all(["input", "button"]):
            name = field.get("name")
            if not name:
                continue
            field_type = field.get("type", "").lower()
            if field_type in {"button", "file", "image", "password", "reset"}:
                continue
            if field_type in {"checkbox", "radio"} and not field.has_attr("checked"):
                continue
            if name == "agreement" and not accept_agreement:
                continue
            payload[name] = field.get("value") or field.get_text(" ", strip=True)

    join_name = next((name for name in payload if name in {"cmd[join]", "cmd%5Bjoin%5D"}), None)
    if join_name is None:
        payload["cmd[join]"] = "In Warteliste eintragen"
    if accept_agreement:
        payload["agreement"] = "1"
    return payload


def parse_waitlist_support(html: str, page_url: str) -> IliasWaitlistSupport:
    join_url = find_waitlist_join_url(html, page_url)
    text = _page_text(html)
    supported = join_url is not None or "Warteliste" in text or "cmd[join]" in html
    return IliasWaitlistSupport(
        supported=supported,
        requires_agreement=_requires_agreement(html),
        join_url=join_url,
        message=_first_relevant_message(text),
    )


def parse_waitlist_result(html: str, final_url: str) -> IliasWaitlistResult:
    text = _page_text(html)
    position = _waitlist_position(text)
    requires_agreement = _requires_agreement(html)
    if requires_agreement:
        status = "requires_agreement"
    elif position is not None or "Warteliste aufgenommen" in text or "Eingetragen auf der Warteliste" in text:
        status = "joined_waitlist"
    elif "bereits" in text and ("Mitglied" in text or "Warteliste" in text):
        status = "already_registered"
    else:
        status = "submitted"
    return IliasWaitlistResult(
        status=status,
        message=_first_relevant_message(text),
        final_url=final_url,
        waitlist_position=position,
        requires_agreement=requires_agreement,
    )


def require_waitlist_url(url: str) -> None:
    if "ilCourseRegistrationGUI" not in url:
        raise AlmaParseError("The ILIAS URL does not expose the course-registration GUI.")


def _requires_agreement(html: str) -> bool:
    soup = BeautifulSoup(html, "html.parser")
    agreement = soup.find(attrs={"name": "agreement"})
    if agreement is not None:
        return True
    text = _page_text(html)
    return "Nutzungsvereinbarung" in text and "Einverständnis" not in text


def _page_text(html: str) -> str:
    return " ".join(BeautifulSoup(html, "html.parser").get_text(" ", strip=True).split())


def _waitlist_position(text: str) -> int | None:
    match = re.search(r"Platz\s+(\d+)\s+auf\s+der\s+Warteliste", text)
    return int(match.group(1)) if match else None


def _first_relevant_message(text: str) -> str | None:
    for pattern in (
        r"Sie sind in die Warteliste aufgenommen worden\.",
        r"Sie haben Platz \d+ auf der Warteliste\.",
        r"Status der Mitgliedschaft:\s*[^.]+",
        r"Zu dieser Nutzungsvereinbarung haben Sie ihr Einverständnis erklärt\.",
    ):
        match = re.search(pattern, text)
        if match:
            return match.group(0)
    return None

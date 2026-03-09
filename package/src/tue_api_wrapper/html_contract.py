from __future__ import annotations

from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse

from bs4 import BeautifulSoup

from .config import AlmaParseError
from .models import LoginForm


def extract_login_form(html: str, page_url: str) -> LoginForm:
    soup = BeautifulSoup(html, "html.parser")
    form = soup.find("form", id="loginForm") or soup.find("form", id="mobileLoginForm")
    if form is None:
        raise AlmaParseError("Could not find Alma login form.")

    payload: dict[str, str] = {}
    for field in form.find_all("input"):
        name = field.get("name")
        field_type = field.get("type", "")
        if not name or field_type in {"checkbox", "button"}:
            continue
        payload[name] = field.get("value", "")

    payload.setdefault("submit", "")
    return LoginForm(action_url=urljoin(page_url, form["action"]), payload=payload)


def extract_timetable_terms(html: str) -> dict[str, str]:
    soup = BeautifulSoup(html, "html.parser")
    select = soup.find("select", attrs={"name": "plan:scheduleConfiguration:anzeigeoptionen:changeTerm_input"})
    if select is None:
        raise AlmaParseError("Could not find the timetable term selector.")

    terms: dict[str, str] = {}
    for option in select.find_all("option"):
        label = option.get_text(strip=True)
        value = option.get("value", "").strip()
        if label and value:
            terms[label] = value
    return terms


def extract_timetable_export_url(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    field = soup.find("textarea", attrs={"name": "plan:scheduleConfiguration:anzeigeoptionen:ical:cal_add"})
    if field is None:
        raise AlmaParseError("Could not find the timetable iCalendar export field.")

    export_url = field.get_text(strip=True)
    if not export_url:
        raise AlmaParseError("The timetable iCalendar export field was empty.")
    return export_url


def build_term_export_url(export_url: str, term_id: str) -> str:
    parsed = urlparse(export_url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query["termgroup"] = term_id
    return urlunparse(parsed._replace(query=urlencode(query)))

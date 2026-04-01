from __future__ import annotations

from datetime import datetime
from html import unescape
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .alma_timetable_models import (
    AlmaTimetableContract,
    AlmaTimetableDay,
    AlmaTimetableFormRequest,
    AlmaTimetableOption,
)
from .config import AlmaParseError


def _clean_text(value: str) -> str:
    return " ".join(value.split())


def _parse_select_options(soup: BeautifulSoup, field_name: str) -> tuple[AlmaTimetableOption, ...]:
    field = soup.find("select", attrs={"name": field_name})
    if field is None:
        return ()

    options: list[AlmaTimetableOption] = []
    for option in field.find_all("option"):
        value = option.get("value", "").strip()
        label = option.get("data-title", "").strip() or _clean_text(option.get_text(" ", strip=True))
        if not value or not label:
            continue
        options.append(
            AlmaTimetableOption(
                value=value,
                label=label,
                is_selected=option.has_attr("selected"),
            )
        )
    return tuple(options)


def _selected_option(options: tuple[AlmaTimetableOption, ...]) -> AlmaTimetableOption | None:
    return next((option for option in options if option.is_selected), None)


def _parse_day_date(value: str) -> str | None:
    for token in value.split():
        try:
            return datetime.strptime(token, "%d.%m.%Y").date().isoformat()
        except ValueError:
            continue
    return None


def _extract_form_payload(form) -> dict[str, str]:
    payload: dict[str, str] = {}
    for field in form.find_all(["input", "select", "textarea"]):
        name = field.get("name")
        if not name:
            continue

        if field.name == "select":
            selected = field.find("option", selected=True)
            payload[name] = selected.get("value", "") if selected is not None else ""
            continue

        if field.name == "textarea":
            payload[name] = field.get_text()
            continue

        field_type = field.get("type", "").lower()
        if field_type in {"button", "file", "image", "password", "reset", "submit"}:
            continue
        payload[name] = field.get("value", "")
    return payload


def _extract_days(soup: BeautifulSoup) -> tuple[AlmaTimetableDay, ...]:
    days: list[AlmaTimetableDay] = []
    for column in soup.select("div.planFrame > ul.plan > li.column"):
        header = column.find("h2")
        label = _clean_text(header.get_text(" ", strip=True)) if header is not None else _clean_text(column.get("title", ""))
        if not label:
            continue

        restrict_button = column.find(
            attrs={"name": lambda value: bool(value and value.endswith(":showOnlyOneDay"))}
        ) or column.find(id=lambda value: bool(value and value.endswith(":showOnlyOneDay")))
        restrict_view_name = None
        if restrict_button is not None:
            restrict_view_name = restrict_button.get("name") or restrict_button.get("id")

        note = None
        column_head = column.find(class_="colhead")
        if column_head is not None:
            note_tokens = [
                token for token in (_clean_text(text) for text in column_head.stripped_strings) if token and token != label
            ]
            note = " ".join(note_tokens) or None

        days.append(
            AlmaTimetableDay(
                label=label,
                iso_date=_parse_day_date(column.get("title", "") or label),
                restrict_view_name=restrict_view_name,
                note=note,
            )
        )
    return tuple(days)


def _extract_export_url(soup: BeautifulSoup) -> str | None:
    field = soup.find("textarea", attrs={"name": "plan:scheduleConfiguration:anzeigeoptionen:ical:cal_add"})
    if field is None:
        return None
    value = field.get_text(strip=True) or field.get("data-page-permalink", "").strip()
    return unescape(value) if value else None


def build_timetable_action_request(
    html: str,
    page_url: str,
    *,
    trigger_name: str,
    field_overrides: dict[str, str] | None = None,
    extra_fields: dict[str, str] | None = None,
) -> AlmaTimetableFormRequest:
    soup = BeautifulSoup(html, "html.parser")
    form = soup.find("form", attrs={"id": "plan"}) or soup.find(
        "form",
        attrs={"id": lambda value: bool(value and "individualTimetable" in value)},
    )
    if form is None:
        raise AlmaParseError("Could not find the Alma timetable form.")

    trigger = form.find(attrs={"name": trigger_name}) or form.find(id=trigger_name)
    if trigger is None:
        raise AlmaParseError(f"Could not find Alma timetable trigger '{trigger_name}'.")

    payload = _extract_form_payload(form)
    if field_overrides:
        payload.update(field_overrides)

    if "activePageElementId" in payload and not payload["activePageElementId"]:
        payload["activePageElementId"] = trigger_name
    if "refreshButtonClickedId" in payload and not payload["refreshButtonClickedId"]:
        payload["refreshButtonClickedId"] = trigger_name

    trigger_value = ""
    if trigger.name in {"button", "input"}:
        trigger_value = trigger.get("value", "")
        trigger_field_name = trigger.get("name") or trigger_name
        payload[trigger_field_name] = trigger_value

    if extra_fields:
        payload.update(extra_fields)

    return AlmaTimetableFormRequest(
        page_url=page_url,
        action_url=urljoin(page_url, form.get("action", page_url)),
        payload=payload,
    )


def parse_timetable_contract(html: str, page_url: str) -> AlmaTimetableContract:
    soup = BeautifulSoup(html, "html.parser")

    terms = _parse_select_options(soup, "plan:scheduleConfiguration:anzeigeoptionen:changeTerm_input")
    range_modes = _parse_select_options(soup, "plan:scheduleConfiguration:anzeigeoptionen:auswahl_zeitraum_input")
    weeks = _parse_select_options(soup, "plan:scheduleConfiguration:anzeigeoptionen:selectWeek_input")
    days = _extract_days(soup)

    selected_term = _selected_option(terms)
    selected_range_mode = _selected_option(range_modes)
    selected_week = _selected_option(weeks)

    export_url = _extract_export_url(soup)
    print_available = soup.find(attrs={"name": "plan:scheduleConfiguration:anzeigeoptionen:print"}) is not None
    can_refresh_export_url = (
        soup.find(attrs={"name": "plan:scheduleConfiguration:anzeigeoptionen:ical:renewSecurityToken"}) is not None
    )
    supports_custom_range = any(option.value == "zeitraum" for option in range_modes)

    if not terms and not days and export_url is None:
        raise AlmaParseError("The response did not look like an Alma timetable page.")

    return AlmaTimetableContract(
        page_url=page_url,
        terms=terms,
        range_modes=range_modes,
        weeks=weeks,
        days=days,
        selected_term_value=selected_term.value if selected_term is not None else None,
        selected_term_label=selected_term.label if selected_term is not None else None,
        selected_range_mode_value=selected_range_mode.value if selected_range_mode is not None else None,
        selected_range_mode_label=selected_range_mode.label if selected_range_mode is not None else None,
        selected_week_value=selected_week.value if selected_week is not None else None,
        selected_week_label=selected_week.label if selected_week is not None else None,
        export_url=export_url,
        print_available=print_available,
        can_refresh_export_url=can_refresh_export_url,
        supports_custom_range=supports_custom_range,
    )

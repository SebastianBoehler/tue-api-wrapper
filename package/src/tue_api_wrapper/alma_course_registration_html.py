from __future__ import annotations

from dataclasses import dataclass
import re
from urllib.parse import parse_qs, unquote, urljoin, urlparse

from bs4 import BeautifulSoup
from bs4.element import Tag

from .alma_course_registration_models import AlmaCourseRegistrationOption
from .alma_detail_forms import set_assignment_row_limits
from .alma_detail_html import parse_module_detail_page
from .config import AlmaParseError
from .html_forms import extract_form_payload

REGISTRATION_ACTION = "ANMELDUNG"
DETAIL_ACTION_FIELDS = {"unitId", "periodUsageId", "planelementId", "wunschVerbuchungspfad", "belegungsAktion"}


@dataclass(frozen=True)
class AlmaRegistrationStartRequest:
    action_url: str
    payload: dict[str, str]
    enctype: str | None
    title: str | None
    number: str | None
    action: str


@dataclass(frozen=True)
class AlmaRegistrationConfirmRequest:
    action_url: str
    payload: dict[str, str]
    selected_option: AlmaCourseRegistrationOption


def extract_registration_start_request(html: str, page_url: str) -> AlmaRegistrationStartRequest | None:
    soup = BeautifulSoup(html, "html.parser")
    form = soup.find("form", id="detailViewData") or soup.find("form", attrs={"name": "detailViewData"})
    if not isinstance(form, Tag):
        return None

    target, js_fields = _find_registration_start_target(form)
    if target is None:
        return None

    payload = extract_form_payload(form)
    payload.update({key: value for key, value in js_fields.items() if key in DETAIL_ACTION_FIELDS})
    set_assignment_row_limits(payload)
    form_id = form.get("id") or form.get("name") or "detailViewData"
    payload.setdefault(f"{form_id}_SUBMIT", "1")
    payload[f"{form_id}:_idcl"] = target
    payload["belegungsAktion"] = payload.get("belegungsAktion") or REGISTRATION_ACTION
    _fill_detail_identifiers(payload, page_url)

    title, number = _safe_detail_identity(html, page_url)
    return AlmaRegistrationStartRequest(
        action_url=urljoin(page_url, form.get("action", page_url)),
        payload=payload,
        enctype=form.get("enctype"),
        title=title,
        number=number,
        action=payload["belegungsAktion"],
    )


def build_registration_confirm_request(
    html: str,
    page_url: str,
    *,
    planelement_id: str | None = None,
) -> AlmaRegistrationConfirmRequest:
    soup = BeautifulSoup(html, "html.parser")
    form = soup.find("form", id="enrollForm") or soup.find("form", attrs={"name": "enrollForm"})
    if not isinstance(form, Tag):
        raise AlmaParseError("Alma did not expose the course-registration confirmation form.")

    options = extract_registration_options(html)
    selected = _select_option(options, planelement_id)
    form_id = form.get("id") or form.get("name") or "enrollForm"
    payload = extract_form_payload(form)
    payload.setdefault(f"{form_id}_SUBMIT", "1")
    payload["planelementId"] = selected.planelement_id
    payload["belegungsAktion"] = REGISTRATION_ACTION
    payload[f"{form_id}:_idcl"] = selected.action_name

    return AlmaRegistrationConfirmRequest(
        action_url=urljoin(page_url, form.get("action", page_url)),
        payload=payload,
        selected_option=selected,
    )


def extract_registration_options(html: str) -> tuple[AlmaCourseRegistrationOption, ...]:
    soup = BeautifulSoup(html, "html.parser")
    form = soup.find("form", id="enrollForm") or soup.find("form", attrs={"name": "enrollForm"})
    if not isinstance(form, Tag):
        return ()

    options: list[AlmaCourseRegistrationOption] = []
    seen: set[tuple[str, str]] = set()
    for control in form.find_all(["button", "input", "a"]):
        action_name = _registration_confirm_action_name(control)
        if action_name is None:
            continue
        planelement_id = _extract_planelement_id(control)
        if not planelement_id:
            continue
        key = (planelement_id, action_name)
        if key in seen:
            continue
        seen.add(key)
        options.append(
            AlmaCourseRegistrationOption(
                planelement_id=planelement_id,
                label=_option_label(control, len(options)),
                action_name=action_name,
            )
        )
    return tuple(options)


def extract_registration_messages(html: str) -> tuple[str, ...]:
    soup = BeautifulSoup(html, "html.parser")
    messages: list[str] = []
    seen: set[str] = set()
    for selector in (
        "ul.listMessages li",
        ".messages-infobox-scroll-container li",
        ".ui-messages li",
        "[class*=messages] li",
        "[id*=messages] li",
    ):
        for node in soup.select(selector):
            message = _clean_text(node.get_text(" ", strip=True))
            if message and message not in seen:
                seen.add(message)
                messages.append(message)
    return tuple(messages)


def extract_registration_status(html: str, messages: tuple[str, ...]) -> str | None:
    soup = BeautifulSoup(html, "html.parser")
    text = _clean_text(" ".join((*messages, soup.get_text(" ", strip=True))))
    text_without_negative = re.sub(r"\bnicht\s+angemeldet\b", "", text, flags=re.IGNORECASE)
    if re.search(r"\bangemeldet\b", text_without_negative, re.IGNORECASE):
        return "registered"
    if re.search(r"\b(nicht\s+angemeldet|abgemeldet)\b", text, re.IGNORECASE):
        return "not_registered"
    return None


def _find_registration_start_target(form: Tag) -> tuple[str | None, dict[str, str]]:
    for control in form.find_all(["button", "input", "a"]):
        identity = _control_identity(control)
        if "anmeld" not in identity and "beleg" not in identity:
            continue
        target = control.get("name") or control.get("id")
        js_fields = _extract_jsf_fields(control.get("onclick", ""))
        if target is None:
            target = _first_registration_target(js_fields)
        return target, js_fields
    return None, {}


def _registration_confirm_action_name(control: Tag) -> str | None:
    name = control.get("name") or control.get("id")
    identity = _control_identity(control)
    if name and ("anechtzeit" in name.casefold() or "anmeld" in identity or "beleg" in identity):
        return name
    js_fields = _extract_jsf_fields(control.get("onclick", ""))
    return _first_confirm_target(js_fields)


def _extract_planelement_id(control: Tag) -> str | None:
    fields = _extract_jsf_fields(control.get("onclick", ""))
    if fields.get("planelementId"):
        return fields["planelementId"]
    row = control.find_parent("tr")
    if row is not None:
        hidden = row.find(attrs={"name": "planelementId"})
        if hidden is not None and hidden.get("value"):
            return hidden["value"]
    return None


def _extract_jsf_fields(onclick: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    for key, value in re.findall(r"""['"]([^'"]+)['"]\s*:\s*['"]([^'"]*)['"]""", onclick):
        fields[unquote(key)] = unquote(value)
    return fields


def _first_registration_target(fields: dict[str, str]) -> str | None:
    return next((key for key in fields if key.endswith(":anmelden")), None)


def _first_confirm_target(fields: dict[str, str]) -> str | None:
    return next((key for key in fields if key.casefold().endswith(":anechtzeit")), None)


def _select_option(
    options: tuple[AlmaCourseRegistrationOption, ...],
    planelement_id: str | None,
) -> AlmaCourseRegistrationOption:
    if not options:
        raise AlmaParseError("Alma did not expose a selectable course-registration path.")
    requested = (planelement_id or "").strip()
    if requested:
        for option in options:
            if option.planelement_id == requested:
                return option
        raise AlmaParseError(f"Unknown Alma course-registration path '{requested}'.")
    if len(options) > 1:
        raise AlmaParseError("Multiple Alma course-registration paths are available; pass planelement_id.")
    return options[0]


def _fill_detail_identifiers(payload: dict[str, str], page_url: str) -> None:
    query = parse_qs(urlparse(page_url).query)
    for name in ("unitId", "periodUsageId", "planelementId"):
        payload.setdefault(name, query.get(name, [""])[0])
    payload.setdefault("wunschVerbuchungspfad", "")


def _safe_detail_identity(html: str, page_url: str) -> tuple[str | None, str | None]:
    try:
        detail = parse_module_detail_page(html, page_url)
    except AlmaParseError:
        return None, None
    return detail.title, detail.number


def _option_label(control: Tag, index: int) -> str:
    row = control.find_parent("tr")
    text = _clean_text((row or control).get_text(" ", strip=True))
    return text or f"Registration path {index + 1}"


def _control_identity(control: Tag) -> str:
    return " ".join(
        (
            control.get("name", ""),
            control.get("id", ""),
            control.get("value", ""),
            control.get("title", ""),
            control.get("aria-label", ""),
            control.get_text(" ", strip=True),
            control.get("onclick", ""),
        )
    ).casefold()


def _clean_text(value: str) -> str:
    return " ".join(value.split())

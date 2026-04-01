from __future__ import annotations

from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .alma_catalog_models import AlmaCourseCatalogContract, AlmaCourseCatalogPage, AlmaCourseCatalogTermOption
from .alma_academics_html import parse_course_catalog_page
from .config import AlmaParseError


def _clean_text(value: str) -> str:
    return " ".join(value.split())


def _extract_payload(form) -> dict[str, str]:
    payload: dict[str, str] = {}
    for field in form.find_all(["input", "select"]):
        name = field.get("name")
        if not name:
            continue

        if field.name == "select":
            selected = field.find("option", selected=True)
            payload[name] = selected.get("value", "") if selected is not None else ""
            continue

        field_type = field.get("type", "")
        if field_type in {"button", "file", "image", "password", "radio", "reset", "submit"}:
            continue
        payload[name] = field.get("value", "")
    return payload


def extract_course_catalog_contract(html: str, page_url: str) -> AlmaCourseCatalogContract:
    soup = BeautifulSoup(html, "html.parser")
    form = soup.find("form", attrs={"id": "detailViewData"}) or soup.find(
        "form",
        attrs={"id": lambda value: bool(value and "detailViewData" in value)},
    )
    nodes = parse_course_catalog_page(html)

    if form is None:
        return AlmaCourseCatalogContract(
            page_url=page_url,
            action_url=page_url,
            payload={},
            submit_marker_name=None,
            term_field_name=None,
            term_options=(),
            nodes=nodes,
        )

    payload = _extract_payload(form)
    term_select = form.find("select", attrs={"name": lambda value: bool(value and value.endswith("termPeriodDropDownList_input"))})
    term_options: list[AlmaCourseCatalogTermOption] = []
    if term_select is not None:
        for option in term_select.find_all("option"):
            value = option.get("value", "").strip()
            label = option.get("data-title", "").strip() or _clean_text(option.get_text(" ", strip=True))
            if not value or not label:
                continue
            term_options.append(
                AlmaCourseCatalogTermOption(
                    value=value,
                    label=label,
                    is_selected=option.has_attr("selected"),
                )
            )

    submit_marker = next((name for name in payload if name.endswith("_SUBMIT")), None)
    term_field_name = term_select.get("name") if term_select is not None else None

    return AlmaCourseCatalogContract(
        page_url=page_url,
        action_url=urljoin(page_url, form.get("action", page_url)),
        payload=payload,
        submit_marker_name=submit_marker,
        term_field_name=term_field_name,
        term_options=tuple(term_options),
        nodes=nodes,
    )


def parse_course_catalog_contract_page(html: str, page_url: str) -> AlmaCourseCatalogPage:
    contract = extract_course_catalog_contract(html, page_url)
    selected_term = next((option for option in contract.term_options if option.is_selected), None)
    if not contract.nodes and not contract.term_options:
        raise AlmaParseError("The response did not look like an Alma course catalog page.")

    return AlmaCourseCatalogPage(
        page_url=contract.page_url,
        selected_term_value=selected_term.value if selected_term is not None else None,
        selected_term_label=selected_term.label if selected_term is not None else None,
        term_options=contract.term_options,
        nodes=contract.nodes,
    )

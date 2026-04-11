from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .config import AlmaParseError
from .models import AlmaDetailField, AlmaDetailSection, AlmaDetailTable, AlmaModuleDetail


MODULE_STUDY_PROGRAM_LABELS = (
    "Module / Studiengänge",
    "Module / Studiengaenge",
    "Module/Studiengänge",
    "Module/Studiengaenge",
    "Studiengänge",
    "Studiengaenge",
)


@dataclass(frozen=True)
class AlmaDetailTabControl:
    label: str
    name: str | None
    value: str | None
    element_id: str | None
    is_active: bool


@dataclass(frozen=True)
class AlmaDetailPageContract:
    action_url: str | None
    payload: dict[str, str]
    form_id: str
    submit_marker_name: str | None
    tabs: tuple[AlmaDetailTabControl, ...]


def _normalize_text(value: str) -> str:
    return " ".join(value.split())


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
            payload[name] = field.get_text("", strip=False)
            continue

        field_type = field.get("type", "")
        if field_type in {"button", "checkbox", "file", "image", "password", "radio", "reset", "submit"}:
            continue
        payload[name] = field.get("value", "")
    return payload


def extract_module_detail_contract(html: str, page_url: str) -> AlmaDetailPageContract:
    soup = BeautifulSoup(html, "html.parser")
    form = soup.find("form", id="detailViewData") or soup.find("form", attrs={"name": "detailViewData"})
    form_id = (form.get("id") or form.get("name")) if form is not None else "detailViewData"
    payload = _extract_form_payload(form) if form is not None else {}
    submit_marker_name = next((name for name in payload if name.endswith("_SUBMIT")), None)

    tabs: list[AlmaDetailTabControl] = []
    tab_scope = form if form is not None else soup
    for button in tab_scope.select("button.tabButton, input.tabButton"):
        label = _tab_label(button)
        if not label:
            continue
        tabs.append(
            AlmaDetailTabControl(
                label=label,
                name=button.get("name"),
                value=button.get("value"),
                element_id=button.get("id"),
                is_active=_has_class(button, "active"),
            )
        )

    return AlmaDetailPageContract(
        action_url=urljoin(page_url, form.get("action")) if form is not None and form.get("action") else None,
        payload=payload,
        form_id=form_id,
        submit_marker_name=submit_marker_name,
        tabs=tuple(tabs),
    )


def find_module_study_program_tab(contract: AlmaDetailPageContract) -> AlmaDetailTabControl | None:
    return next((tab for tab in contract.tabs if _is_module_study_program_label(tab.label)), None)


def parse_module_detail_page(html: str, page_url: str) -> AlmaModuleDetail:
    soup = BeautifulSoup(html, "html.parser")
    title = None
    permalink = None
    number = None

    permalink_input = soup.find("input", attrs={"id": "autologinRequestUrl"})
    if permalink_input is not None:
        permalink = permalink_input.get("value")

    contract = extract_module_detail_contract(html, page_url)
    available_tabs = tuple(tab.label for tab in contract.tabs)
    active_tab = next((tab.label for tab in contract.tabs if tab.is_active), None)

    sections: list[AlmaDetailSection] = []
    for section in _extract_detail_sections(soup):
        sections.append(section)
        if section.title == "Grunddaten":
            for field in section.fields:
                if field.label == "Titel":
                    title = field.value
                elif field.label == "Nummer":
                    number = field.value

    if title is None:
        raise AlmaParseError("Could not extract Alma module details from the public detail page.")

    return AlmaModuleDetail(
        title=title,
        number=number,
        permalink=permalink,
        source_url=page_url,
        active_tab=active_tab,
        available_tabs=available_tabs,
        sections=tuple(sections),
        module_study_program_tables=tuple(_extract_module_study_program_tables(soup, active_tab)),
    )


def merge_module_detail_tabs(base: AlmaModuleDetail, extra: AlmaModuleDetail) -> AlmaModuleDetail:
    return AlmaModuleDetail(
        title=base.title,
        number=base.number,
        permalink=base.permalink or extra.permalink,
        source_url=base.source_url,
        active_tab=base.active_tab,
        available_tabs=_merge_strings(base.available_tabs, extra.available_tabs),
        sections=_merge_sections(base.sections, extra.sections),
        module_study_program_tables=_merge_tables(
            base.module_study_program_tables,
            extra.module_study_program_tables,
        ),
    )


def _tab_label(button) -> str:
    raw = button.get("value") or button.get_text(" ", strip=True)
    return _normalize_text(raw.replace("Aktive Registerkarte", ""))


def _has_class(node, class_name: str) -> bool:
    classes = node.get("class", [])
    if isinstance(classes, str):
        classes = classes.split()
    return class_name in classes


def _is_module_study_program_label(label: str) -> bool:
    normalized = label.casefold().replace(" ", "")
    return any(normalized == item.casefold().replace(" ", "") for item in MODULE_STUDY_PROGRAM_LABELS)


def _extract_detail_sections(soup: BeautifulSoup) -> tuple[AlmaDetailSection, ...]:
    sections: list[AlmaDetailSection] = []
    for panel in soup.select(".boxStandard"):
        heading = panel.select_one(".box_title h2")
        if heading is None:
            continue
        section_title = _normalize_text(heading.get_text(" ", strip=True))
        fields: list[AlmaDetailField] = []
        for row in panel.select(".box_content .labelItemLine"):
            label_node = row.select_one("label")
            value_node = row.select_one(".answer")
            label = _normalize_text(label_node.get_text(" ", strip=True)) if label_node is not None else ""
            value = _normalize_text(value_node.get_text(" ", strip=True)) if value_node is not None else ""
            if label and value:
                fields.append(AlmaDetailField(label=label, value=value))
        if fields:
            sections.append(AlmaDetailSection(title=section_title, fields=tuple(fields)))
    return tuple(sections)


def _extract_module_study_program_tables(soup: BeautifulSoup, active_tab: str | None) -> tuple[AlmaDetailTable, ...]:
    tables: list[AlmaDetailTable] = []
    active_module_study_tab = active_tab is not None and _is_module_study_program_label(active_tab)
    for panel in soup.select(".boxStandard"):
        heading = panel.select_one(".box_title h2")
        section_title = _normalize_text(heading.get_text(" ", strip=True)) if heading is not None else ""
        if section_title and not active_module_study_tab and not _is_module_study_program_label(section_title):
            continue
        for table in panel.find_all("table"):
            parsed = _parse_table(table, section_title or _nearest_table_title(table))
            if parsed is not None:
                tables.append(parsed)
    return tuple(tables)


def _parse_table(table, title: str) -> AlmaDetailTable | None:
    headers = tuple(_normalize_text(cell.get_text(" ", strip=True)) for cell in table.find_all("th"))
    rows: list[tuple[str, ...]] = []
    for row in table.find_all("tr"):
        cells = row.find_all("td")
        if not cells:
            continue
        values = tuple(_normalize_text(cell.get_text(" ", strip=True)) for cell in cells)
        if any(values):
            rows.append(values)

    if not rows:
        return None
    if not headers:
        headers = tuple(f"Spalte {index + 1}" for index in range(max(len(row) for row in rows)))
    return AlmaDetailTable(title=title or "Module / Studiengänge", headers=headers, rows=tuple(rows))


def _nearest_table_title(table) -> str:
    for sibling in table.find_previous_siblings():
        if sibling.name in {"h2", "h3", "h4"}:
            return _normalize_text(sibling.get_text(" ", strip=True))
    caption = table.find("caption")
    return _normalize_text(caption.get_text(" ", strip=True)) if caption is not None else ""


def _merge_strings(first: tuple[str, ...], second: tuple[str, ...]) -> tuple[str, ...]:
    return tuple(dict.fromkeys((*first, *second)))


def _merge_sections(
    first: tuple[AlmaDetailSection, ...],
    second: tuple[AlmaDetailSection, ...],
) -> tuple[AlmaDetailSection, ...]:
    seen = {(section.title, section.fields) for section in first}
    merged = list(first)
    for section in second:
        key = (section.title, section.fields)
        if key not in seen:
            seen.add(key)
            merged.append(section)
    return tuple(merged)


def _merge_tables(
    first: tuple[AlmaDetailTable, ...],
    second: tuple[AlmaDetailTable, ...],
) -> tuple[AlmaDetailTable, ...]:
    seen = {(table.title, table.headers, table.rows) for table in first}
    merged = list(first)
    for table in second:
        key = (table.title, table.headers, table.rows)
        if key not in seen:
            seen.add(key)
            merged.append(table)
    return tuple(merged)

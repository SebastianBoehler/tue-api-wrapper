from __future__ import annotations

from urllib.parse import parse_qsl, urljoin, urlparse

from bs4 import BeautifulSoup

from .config import AlmaParseError
from .ilias_feature_models import (
    IliasInfoField,
    IliasInfoPage,
    IliasSearchFilters,
    IliasInfoSection,
    IliasSearchOption,
    IliasSearchForm,
    IliasSearchPage,
    IliasSearchResult,
)


ILIAS_SEARCH_URL = "https://ovidius.uni-tuebingen.de/ilias.php?baseClass=ilSearchControllerGUI"


def _normalize_text(value: str) -> str:
    return " ".join(value.split())


def _extract_search_filters(soup: BeautifulSoup) -> IliasSearchFilters:
    area_value = None
    area_label = None
    area_input = soup.find("input", attrs={"name": "area"})
    if area_input is not None:
        area_value = area_input.get("value", "").strip() or None
    area_anchor = soup.find("a", attrs={"name": "area_anchor"})
    if area_anchor is not None:
        area_label = _normalize_text(area_anchor.get_text(" ", strip=True)) or None

    search_modes = tuple(
        IliasSearchOption(
            value=radio.get("value", ""),
            label=_normalize_text(label.get_text(" ", strip=True)) if label is not None else radio.get("value", ""),
            is_selected=radio.has_attr("checked"),
        )
        for radio in soup.select("#type input[type='radio']")
        for label in [radio.find_parent("label")]
    )

    content_types = tuple(
        IliasSearchOption(
            value=checkbox.get("name", "").split("[", 1)[-1].rstrip("]"),
            label=_normalize_text(label.get_text(" ", strip=True)) if label is not None else checkbox.get("name", ""),
            is_selected=checkbox.has_attr("checked"),
        )
        for checkbox in soup.select("input[name^='filter_type[']")
        for label in [soup.find("label", attrs={"for": checkbox.get("id")})]
    )

    creation_select = soup.find("select", attrs={"name": "screation_ontype"})
    creation_modes = tuple(
        IliasSearchOption(
            value=option.get("value", ""),
            label=_normalize_text(option.get_text(" ", strip=True)),
            is_selected=option.has_attr("selected"),
        )
        for option in creation_select.find_all("option")
    ) if creation_select is not None else ()
    creation_checkbox = soup.find("input", attrs={"name": "screation"})
    creation_enabled = creation_checkbox.has_attr("checked") if creation_checkbox is not None else False
    creation_date_input = soup.find("input", attrs={"name": "screation_date"})
    creation_date = creation_date_input.get("value", "").strip() or None if creation_date_input is not None else None

    return IliasSearchFilters(
        area_value=area_value,
        area_label=area_label,
        search_modes=search_modes,
        content_types=content_types,
        creation_modes=creation_modes,
        creation_enabled=creation_enabled,
        creation_date=creation_date,
    )


def extract_ilias_search_form(html: str, page_url: str) -> IliasSearchForm:
    soup = BeautifulSoup(html, "html.parser")
    form = soup.find("form", attrs={"action": lambda value: bool(value and "performSearch" in value)})
    if form is None:
        raise AlmaParseError("Could not find the ILIAS search form.")

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
        if field_type in {"button", "file", "image", "password", "reset", "submit"}:
            continue
        if field_type in {"checkbox", "radio"}:
            if field.has_attr("checked"):
                payload[name] = field.get("value", "1")
            continue
        payload[name] = field.get("value", "")

    search_button = form.find("input", attrs={"type": "submit", "name": "cmd[performSearch]"})
    if search_button is None:
        raise AlmaParseError("Could not identify the ILIAS search submit button.")

    return IliasSearchForm(
        action_url=urljoin(page_url, form.get("action", page_url)),
        payload=payload,
        term_field_name="term",
        search_button_name=search_button["name"],
        search_mode_field_name="type",
        creation_enabled_field_name="screation",
        creation_mode_field_name="screation_ontype",
        creation_date_field_name="screation_date",
        filters=_extract_search_filters(soup),
    )


def parse_ilias_search_page(
    html: str,
    page_url: str,
    *,
    query: str,
    page_number: int,
) -> IliasSearchPage:
    soup = BeautifulSoup(html, "html.parser")
    table = soup.select_one("table.table.table-striped.fullwidth")
    results: list[IliasSearchResult] = []
    if table is not None:
        for tr in table.find_all("tr"):
            cells = tr.find_all("td")
            if len(cells) < 3:
                continue

            container = cells[1].find("div", class_="il_ContainerListItem")
            if container is None:
                continue

            title_link = container.select_one("a.il_ContainerItemTitle[href]")
            title_node = title_link or container.select_one("h3.il_ContainerItemTitle")
            if title_node is None:
                continue

            description_node = container.select_one(".il_Description")
            breadcrumb_links = container.select("ol.breadcrumb a[href]")
            info_link = next((link.get("href") for link in tr.find_all("a", href=True) if "cmd=infoScreen" in link.get("href", "")), None)
            favorite_link = next((link.get("href") for link in tr.find_all("a", href=True) if "cmd=addToDesk" in link.get("href", "")), None)

            properties: list[str] = []
            for node in container.select(".il_ItemAlertProperty, .il_ItemProperty"):
                value = " ".join(node.get_text(" ", strip=True).split())
                if value:
                    properties.append(value)

            item_type = None
            if favorite_link:
                query_map = dict(parse_qsl(urlparse(favorite_link).query, keep_blank_values=True))
                item_type = query_map.get("type")

            results.append(
                IliasSearchResult(
                    title=" ".join(title_node.get_text(" ", strip=True).split()),
                    url=urljoin(page_url, title_link["href"]) if title_link is not None else None,
                    description=(
                        " ".join(description_node.get_text(" ", strip=True).split())
                        if description_node is not None
                        else None
                    ),
                    info_url=urljoin(page_url, info_link) if info_link else None,
                    add_to_favorites_url=urljoin(page_url, favorite_link) if favorite_link else None,
                    breadcrumbs=tuple(" ".join(link.get_text(" ", strip=True).split()) for link in breadcrumb_links),
                    properties=tuple(properties),
                    item_type=item_type,
                )
            )

    if table is None and "Suchergebnisse" not in html and "ILIAS Universität Tübingen" not in html:
        raise AlmaParseError("The response did not look like an authenticated ILIAS search page.")

    previous_page_url = None
    next_page_url = None
    for link in soup.select(".ilTableNav a[href]"):
        label = _normalize_text(link.get_text(" ", strip=True)).lower()
        if label == "zurück":
            previous_page_url = urljoin(page_url, link["href"])
        elif label == "weiter":
            next_page_url = urljoin(page_url, link["href"])

    return IliasSearchPage(
        page_url=page_url,
        query=query,
        page_number=page_number,
        previous_page_url=previous_page_url,
        next_page_url=next_page_url,
        filters=_extract_search_filters(soup),
        results=tuple(results),
    )


def parse_ilias_info_page(html: str, page_url: str) -> IliasInfoPage:
    soup = BeautifulSoup(html, "html.parser")
    title_node = soup.find("h1")
    title = " ".join(title_node.get_text(" ", strip=True).split()) if title_node is not None else (
        soup.title.get_text(" ", strip=True) if soup.title else "ILIAS Info"
    )

    sections: list[IliasInfoSection] = []
    for heading in soup.find_all("h2"):
        section_title = " ".join(heading.get_text(" ", strip=True).split())
        if not section_title:
            continue

        rows: list[IliasInfoField] = []
        node = heading.parent
        sibling = node.find_next_sibling() if node is not None else None
        while sibling is not None:
            if sibling.find("h2") is not None:
                break
            classes = set(sibling.get("class", []))
            if {"form-group", "row"}.issubset(classes):
                children = [child for child in sibling.find_all("div", recursive=False)]
                if children:
                    label = " ".join(children[0].get_text(" ", strip=True).split()) or None
                    value_node = children[-1]
                    value = " ".join(value_node.get_text(" ", strip=True).split())
                    if value:
                        rows.append(IliasInfoField(label=label, value=value))
            sibling = sibling.find_next_sibling()

        if rows:
            sections.append(IliasInfoSection(title=section_title, fields=tuple(rows)))

    if not sections and "ILIAS Universität Tübingen" not in html:
        raise AlmaParseError("The response did not look like an authenticated ILIAS info page.")

    return IliasInfoPage(title=title, page_url=page_url, sections=tuple(sections))

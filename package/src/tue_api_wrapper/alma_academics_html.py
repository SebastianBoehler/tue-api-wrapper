from __future__ import annotations

import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .alma_detail_html import parse_module_detail_page
from .config import AlmaParseError
from .models import (
    AlmaCourseCatalogNode,
    AlmaEnrollmentPage,
    AlmaExamNode,
    AlmaAdvancedModuleSearchForm,
    AlmaModuleSearchForm,
    AlmaModuleSearchPage,
    AlmaModuleSearchFieldMap,
    AlmaModuleSearchFilters,
    AlmaModuleSearchResult,
    AlmaModuleSearchResultsPage,
    AlmaSearchOption,
)


def parse_enrollment_page(html: str) -> AlmaEnrollmentPage:
    soup = BeautifulSoup(html, "html.parser")
    form = soup.find("form", id="studentOverviewForm")
    if form is None:
        raise AlmaParseError("Could not find the Alma enrollment overview form.")

    select = form.find("select", attrs={"name": "studentOverviewForm:enrollmentsDiv:termSelector:termPeriodDropDownList_input"})
    if select is None:
        raise AlmaParseError("Could not find the Alma enrollment term selector.")

    terms: dict[str, str] = {}
    selected_term: str | None = None
    for option in select.find_all("option"):
        label = option.get_text(" ", strip=True)
        value = option.get("value", "").strip()
        if label and value:
            terms[label] = value
            if option.has_attr("selected"):
                selected_term = label

    message = None
    text = " ".join(form.get_text(" ", strip=True).split())
    match = re.search(r"Sie haben bisher.+?(?:angemeldet\.|zugelassen\.)", text)
    if match:
        message = match.group(0)

    return AlmaEnrollmentPage(selected_term=selected_term, available_terms=terms, message=message)


def parse_exam_overview(html: str) -> tuple[AlmaExamNode, ...]:
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", class_="treeTableWithIcons")
    if table is None:
        raise AlmaParseError("Could not find the Alma exam overview tree table.")

    rows: list[AlmaExamNode] = []
    for tr in table.find_all("tr"):
        classes = tr.get("class", [])
        level_match = next((re.search(r"treeTableCellLevel(\d+)", item) for item in classes if "treeTableCellLevel" in item), None)
        if level_match is None:
            continue
        level = int(level_match.group(1))
        cells = tr.find_all("td")
        if len(cells) < 10:
            continue

        title_node = tr.find(id=re.compile(r":(?:defaulttext|unDeftxt)$"))
        if title_node is None:
            continue
        kind_icon = tr.find("img", class_="submitImageTable")
        def field_value(suffix: str) -> str | None:
            node = tr.find(id=re.compile(fr":{re.escape(suffix)}$"))
            if node is None:
                return None
            value = " ".join(node.get_text(" ", strip=True).split())
            return value or None
        rows.append(
            AlmaExamNode(
                level=level,
                kind=kind_icon.get("alt") if kind_icon else None,
                title=" ".join(title_node.get_text(" ", strip=True).split()),
                number=field_value("elementnr"),
                attempt=field_value("attempt"),
                grade=field_value("grade"),
                cp=field_value("bonus"),
                malus=field_value("malus"),
                status=field_value("workstatus"),
                free_trial=field_value("freeTrial"),
                remark=field_value("remark"),
                exception=field_value("exceptionNein") or field_value("exceptionJa"),
                release_date=field_value("geplantesFreigabedatum"),
            )
        )
    return tuple(rows)


def parse_course_catalog_page(html: str) -> tuple[AlmaCourseCatalogNode, ...]:
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", class_="treeTableWithIcons")
    if table is None:
        raise AlmaParseError("Could not find the Alma course catalog tree table.")

    rows: list[AlmaCourseCatalogNode] = []
    for tr in table.find_all("tr"):
        classes = tr.get("class", [])
        level_match = next((re.search(r"treeTableCellLevel(\d+)", item) for item in classes if "treeTableCellLevel" in item), None)
        if level_match is None:
            continue
        level = int(level_match.group(1))
        title_node = tr.find(id=re.compile(r":ot_3$"))
        if title_node is None:
            continue
        description_node = tr.find(id=re.compile(r":ot_4$"))
        permalink = tr.find("input", attrs={"id": "autologinRequestUrl"})
        icon = tr.find("img", class_="imagetop")
        rows.append(
            AlmaCourseCatalogNode(
                level=level,
                kind=icon.get("alt") if icon else None,
                title=" ".join(title_node.get_text(" ", strip=True).split()),
                description=" ".join(description_node.get_text(" ", strip=True).split()) if description_node else None,
                permalink=permalink.get("value") if permalink else None,
                expandable=tr.find("button", class_="treeTableIcon") is not None,
            )
        )
    return tuple(rows)


def _extract_form_payload(form) -> dict[str, str]:
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
        if field_type in {"button", "checkbox", "file", "image", "password", "radio", "reset", "submit"}:
            continue
        payload[name] = field.get("value", "")
    return payload


def _normalize_text(value: str) -> str:
    return " ".join(value.split())


def _extract_select_options(select) -> tuple[AlmaSearchOption, ...]:
    options: list[AlmaSearchOption] = []
    for option in select.find_all("option"):
        value = option.get("value", "").strip()
        label = _normalize_text(option.get_text(" ", strip=True))
        if not value or not label or label == "ISNULL (nicht gefüllt)":
            continue
        options.append(AlmaSearchOption(value=value, label=label))
    return tuple(options)


def _find_search_button_name(form) -> str:
    for button in form.find_all("button", attrs={"name": True}):
        name = button.get("name", "")
        label = _normalize_text(button.get_text(" ", strip=True))
        if name.endswith(":search") and label == "Suchen":
            return name
    raise AlmaParseError("Could not identify the Alma module search submit button.")


def extract_module_search_form(html: str, page_url: str) -> AlmaModuleSearchForm:
    soup = BeautifulSoup(html, "html.parser")
    form = soup.find("form", id="genericSearchMask")
    if form is None:
        raise AlmaParseError("Could not find the Alma module search form.")

    payload = _extract_form_payload(form)
    query_field_name: str | None = None
    for field in form.find_all("input"):
        name = field.get("name")
        field_type = field.get("type", "")
        if not name or field_type in {"button", "checkbox", "file", "image", "password", "radio", "submit"}:
            continue
        if query_field_name is None and "searchModuleDescription" in name and field_type in {"text", "search", ""}:
            query_field_name = name
    if query_field_name is None:
        raise AlmaParseError("Could not identify the Alma module search query field.")

    payload.setdefault("genericSearchMask_SUBMIT", "1")
    return AlmaModuleSearchForm(
        action_url=urljoin(page_url, form["action"]),
        payload=payload,
        query_field_name=query_field_name,
    )


def extract_advanced_module_search_form(html: str, page_url: str) -> AlmaAdvancedModuleSearchForm:
    soup = BeautifulSoup(html, "html.parser")
    form = soup.find("form", id="genericSearchMask")
    if form is None:
        raise AlmaParseError("Could not find the Alma advanced module search form.")

    payload = _extract_form_payload(form)
    toggle_button = form.find("button", attrs={"name": re.compile(r"toggleSearchShowAllCriteria$")})
    label_mapping = {
        "Suchbegriffe": "query",
        "Titel": "title",
        "Nummer": "number",
        "Elementtyp": "element_type",
        "Lehrsprache": "language",
        "Abschluss": "degree",
        "Fach": "subject",
        "Fachbereich": "faculty",
    }
    field_names: dict[str, str | None] = {value: None for value in label_mapping.values()}
    filter_options = {
        "element_type": (),
        "language": (),
        "degree": (),
        "subject": (),
        "faculty": (),
    }

    for label in form.select("label.form-label"):
        label_text = _normalize_text(label.get_text(" ", strip=True))
        field_key = label_mapping.get(label_text)
        if field_key is None:
            continue

        wrapper = label.find_parent("div")
        if wrapper is None:
            continue

        if field_key in {"query", "title", "number"}:
            input_field = next(
                (
                    field
                    for field in wrapper.find_all("input", attrs={"name": True})
                    if field.get("type", "text") in {"text", "search", ""}
                    and not field.get("name", "").endswith(("_filter", "_focus", "_ValueFromAutoComplete"))
                ),
                None,
            )
            if input_field is not None:
                field_names[field_key] = input_field.get("name")
            continue

        select_field = next(
            (
                field
                for field in wrapper.find_all("select", attrs={"name": True})
                if field.get("name", "").endswith("_input") and not field.get("name", "").endswith("not_input")
            ),
            None,
        )
        if select_field is None:
            continue

        field_names[field_key] = select_field.get("name")
        if field_key in filter_options:
            filter_options[field_key] = _extract_select_options(select_field)

    query_field_name = field_names["query"]
    if query_field_name is None:
        raise AlmaParseError("Could not identify the Alma advanced search query field.")

    return AlmaAdvancedModuleSearchForm(
        action_url=urljoin(page_url, form["action"]),
        payload=payload,
        query_field_name=query_field_name,
        search_button_name=_find_search_button_name(form),
        toggle_advanced_button_name=toggle_button.get("name") if toggle_button is not None else None,
        fields=AlmaModuleSearchFieldMap(
            query=query_field_name,
            title=field_names["title"],
            number=field_names["number"],
            element_type=field_names["element_type"],
            language=field_names["language"],
            degree=field_names["degree"],
            subject=field_names["subject"],
            faculty=field_names["faculty"],
        ),
        filters=AlmaModuleSearchFilters(
            element_types=filter_options["element_type"],
            languages=filter_options["language"],
            degrees=filter_options["degree"],
            subjects=filter_options["subject"],
            faculties=filter_options["faculty"],
        ),
    )


def parse_module_search_page(html: str, page_url: str) -> AlmaModuleSearchPage:
    form = extract_module_search_form(html, page_url)
    return AlmaModuleSearchPage(form=form, results=parse_module_search_results(html))


def parse_module_search_results(html: str) -> tuple[AlmaModuleSearchResult, ...]:
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", class_="tableWithBorder")
    results: list[AlmaModuleSearchResult] = []
    if table is not None:
        for tr in table.find_all("tr"):
            cells = tr.find_all("td")
            if len(cells) < 4:
                continue
            values = [" ".join(cell.get_text(" ", strip=True).split()) for cell in cells]
            title = values[2]
            if not title:
                continue
            detail_link = tr.find("a", href=True)
            results.append(
                AlmaModuleSearchResult(
                    number=values[1] or None,
                    title=title,
                    element_type=values[3] or None,
                    detail_url=urljoin("https://alma.uni-tuebingen.de", detail_link["href"]) if detail_link else None,
                )
            )
    return tuple(results)


def parse_module_search_results_page(html: str, page_url: str) -> AlmaModuleSearchResultsPage:
    soup = BeautifulSoup(html, "html.parser")
    form = soup.find("form", id="genSearchRes")
    payload = _extract_form_payload(form) if form is not None else {}
    rows_input_name = None
    rows_refresh_name = None
    if form is not None:
        rows_input = form.find("input", attrs={"name": re.compile(r"Navi2NumRowsInput$")})
        rows_refresh = form.find("button", attrs={"name": re.compile(r"Navi2NumRowsRefresh$")})
        rows_input_name = rows_input.get("name") if rows_input is not None else None
        rows_refresh_name = rows_refresh.get("name") if rows_refresh is not None else None

    total_results = None
    result_text = soup.find("span", class_="dataScrollerResultText")
    if result_text is not None:
        match = re.search(r"(\d+)", result_text.get_text(" ", strip=True))
        if match:
            total_results = int(match.group(1))

    total_pages = None
    page_text = soup.find("span", class_="dataScrollerPageText")
    if page_text is not None:
        match = re.search(r"Seite\s+\d+\s+von\s+(\d+)", page_text.get_text(" ", strip=True))
        if match:
            total_pages = int(match.group(1))

    results = parse_module_search_results(html)
    return AlmaModuleSearchResultsPage(
        action_url=urljoin(page_url, form["action"]) if form is not None and form.get("action") else None,
        payload=payload,
        results=results,
        total_results=total_results,
        total_pages=total_pages,
        rows_input_name=rows_input_name,
        rows_refresh_name=rows_refresh_name,
    )

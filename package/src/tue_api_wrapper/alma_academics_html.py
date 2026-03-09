from __future__ import annotations

import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .config import AlmaParseError
from .models import (
    AlmaCourseCatalogNode,
    AlmaEnrollmentPage,
    AlmaExamNode,
    AlmaModuleSearchForm,
    AlmaModuleSearchPage,
    AlmaModuleSearchResult,
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


def extract_module_search_form(html: str, page_url: str) -> AlmaModuleSearchForm:
    soup = BeautifulSoup(html, "html.parser")
    form = soup.find("form", id="genericSearchMask")
    if form is None:
        raise AlmaParseError("Could not find the Alma module search form.")

    payload: dict[str, str] = {}
    query_field_name: str | None = None
    for field in form.find_all("input"):
        name = field.get("name")
        field_type = field.get("type", "")
        if not name or field_type in {"button", "checkbox", "file", "image", "password", "radio", "submit"}:
            continue
        payload[name] = field.get("value", "")
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

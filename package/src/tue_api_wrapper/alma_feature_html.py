from __future__ import annotations

from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .alma_feature_models import AlmaCurrentLecture, AlmaCurrentLecturesForm, AlmaCurrentLecturesPage
from .config import AlmaParseError


CURRENT_LECTURES_START_URL = (
    "https://alma.uni-tuebingen.de/alma/pages/cm/exa/timetable/currentLectures.xhtml"
    "?_flowId=showEventsAndExaminationsOnDate-flow"
    "&navigationPosition=studiesOffered,currentLecturesGeneric"
    "&recordRequest=true"
)


def extract_current_lectures_form(html: str, page_url: str) -> AlmaCurrentLecturesForm:
    soup = BeautifulSoup(html, "html.parser")
    form = soup.find("form", id="showEventsAndExaminationsOnDateForm")
    if form is None:
        raise AlmaParseError("Could not find the Alma current-lectures form.")

    payload: dict[str, str] = {}
    checkbox_name: str | None = None
    checkbox_values: list[str] = []
    checked_values: list[str] = []
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
        if field_type == "checkbox":
            value = field.get("value", "true")
            checkbox_name = name
            checkbox_values.append(value)
            if field.has_attr("checked"):
                checked_values.append(value)
            continue
        payload[name] = field.get("value", "")

    date_field = form.find("input", attrs={"name": lambda value: bool(value and value.endswith(":date"))})
    if date_field is None or not date_field.get("name"):
        raise AlmaParseError("Could not identify the Alma current-lectures date field.")

    search_button = form.find("button", attrs={"name": lambda value: bool(value and value.endswith(":searchButtonId"))})
    if search_button is None or not search_button.get("name"):
        raise AlmaParseError("Could not identify the Alma current-lectures search button.")

    return AlmaCurrentLecturesForm(
        action_url=urljoin(page_url, form.get("action", page_url)),
        payload=payload,
        date_field_name=date_field["name"],
        search_button_name=search_button["name"],
        filter_field_name=checkbox_name,
        filter_values=tuple(checked_values or (["selectAllCourses"] if "selectAllCourses" in checkbox_values else [])),
    )


def parse_current_lectures_page(html: str, page_url: str) -> AlmaCurrentLecturesPage:
    soup = BeautifulSoup(html, "html.parser")
    date_input = soup.find("input", attrs={"name": lambda value: bool(value and value.endswith(":date"))})
    selected_date = date_input.get("value", "").strip() or None if date_input is not None else None

    table = soup.find("table", attrs={"id": lambda value: bool(value and value.endswith("coursesAndExaminationsOnDateListTableTable"))})
    rows: list[AlmaCurrentLecture] = []
    if table is not None:
        for tr in table.find_all("tr"):
            cells = tr.find_all("td")
            if len(cells) < 13:
                continue

            values = [" ".join(cell.get_text(" ", strip=True).split()) or None for cell in cells]
            detail_link = next((link.get("href") for link in cells[0].find_all("a", href=True)), None)
            title_link = next((link.get("href") for link in cells[1].find_all("a", href=True)), None)
            rows.append(
                AlmaCurrentLecture(
                    title=values[1] or "-",
                    detail_url=urljoin(page_url, title_link or detail_link) if (title_link or detail_link) else None,
                    start=values[2],
                    end=values[3],
                    number=values[4],
                    parallel_group=values[5],
                    event_type=values[6],
                    responsible_lecturer=values[7],
                    lecturer=values[8],
                    building=values[9],
                    room=values[10],
                    semester=values[11],
                    remark=values[12],
                )
            )

    if table is None and "Tagesaktuelle Veranstaltungen anzeigen" not in html:
        raise AlmaParseError("The response did not look like an Alma current-lectures page.")

    return AlmaCurrentLecturesPage(
        page_url=page_url,
        selected_date=selected_date,
        results=tuple(rows),
    )

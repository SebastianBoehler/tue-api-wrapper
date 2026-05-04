from __future__ import annotations

from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .alma_planner_models import (
    AlmaStudyPlannerModule,
    AlmaStudyPlannerPage,
    AlmaStudyPlannerSemester,
    AlmaStudyPlannerViewState,
)
from .config import AlmaParseError


STUDY_PLANNER_URL = (
    "https://alma.uni-tuebingen.de/alma/pages/startFlow.xhtml"
    "?_flowId=studyPlanner-flow"
    "&navigationPosition=hisinoneMeinStudium,hisinoneStudyPlanner"
    "&recordRequest=true"
)


def _clean_text(value: str) -> str:
    return " ".join(value.split())


def _split_module_heading(value: str) -> tuple[str | None, str]:
    heading = _clean_text(value)
    if " - " not in heading:
        return None, heading
    number, title = heading.split(" - ", 1)
    return number.strip() or None, title.strip() or heading


def parse_study_planner_page(html: str, page_url: str) -> AlmaStudyPlannerPage:
    soup = BeautifulSoup(html, "html.parser")
    title_node = soup.title
    title = _clean_text(title_node.get_text(" ", strip=True)) if title_node is not None else "Study planner"

    table = soup.find("table", attrs={"id": lambda value: bool(value and value.endswith(":modulAnchorsTable"))})
    if table is None:
        raise AlmaParseError("Could not find the Alma study planner table.")

    semesters: list[AlmaStudyPlannerSemester] = []
    for index, header in enumerate(table.select("thead th div[title='Studiensemester']"), start=1):
        parts = [line for line in (_clean_text(fragment) for fragment in header.stripped_strings) if line]
        if not parts:
            continue
        semesters.append(
            AlmaStudyPlannerSemester(
                index=index,
                label=parts[0],
                term_label=parts[1] if len(parts) > 1 else None,
            )
        )

    modules: list[AlmaStudyPlannerModule] = []
    body_rows = table.select("tbody tr") or table.find_all("tr")[1:]
    for row_index, row in enumerate(body_rows, start=1):
        column_start = 1
        for cell in row.find_all("td", recursive=False):
            span = int(cell.get("colspan", "1") or "1")
            popup_title = cell.select_one(".mouseMoveTitle .mouseMove")
            summary_title = cell.select_one(".headerModulePlan .popupDismissable [title]")
            heading = (
                popup_title.get_text(" ", strip=True)
                if popup_title is not None
                else summary_title.get("title", "") if summary_title is not None else ""
            )
            heading = _clean_text(heading)
            if not heading:
                column_start += span
                continue

            number, module_title = _split_module_heading(heading)
            detail_link = cell.find("a", href=lambda value: bool(value and "_flowId=detailView-flow" in value))
            credits = cell.find("span", attrs={"title": "CP erworben/soll"})
            credits_summary = _clean_text(credits.get_text(" ", strip=True)) if credits is not None else None
            earned, required = _parse_credit_progress(credits_summary)
            modules.append(
                AlmaStudyPlannerModule(
                    row_index=row_index,
                    column_start=column_start,
                    column_span=span,
                    title=module_title,
                    number=number,
                    credits_summary=credits_summary,
                    credits_earned=earned,
                    credits_required=required,
                    progress_percent=_progress_percent(earned, required),
                    detail_url=urljoin(page_url, detail_link["href"]) if detail_link is not None else None,
                    is_expandable=cell.find("button", attrs={"name": lambda value: bool(value and value.endswith(":explodeModule"))}) is not None,
                )
            )
            column_start += span

    def _button_enabled(name_suffix: str) -> bool:
        button = soup.find("button", attrs={"name": lambda value: bool(value and value.endswith(name_suffix))})
        if button is None:
            return False
        return "submit_checkbox_tick" in button.get("class", [])

    if not semesters and "Studienplaner" not in html:
        raise AlmaParseError("The response did not look like an Alma study planner page.")

    return AlmaStudyPlannerPage(
        title=title,
        page_url=page_url,
        semesters=tuple(semesters),
        modules=tuple(modules),
        view_state=AlmaStudyPlannerViewState(
            show_recommended_plan=_button_enabled(":switchMusterplan"),
            show_my_modules=_button_enabled(":switchMeineModule"),
            show_alternative_semesters=_button_enabled(":switchAlternativeFachsemester"),
        ),
    )


def _parse_credit_progress(value: str | None) -> tuple[float | None, float | None]:
    if not value or "/" not in value:
        return None, None
    earned, required = value.split("/", 1)
    return _parse_credit_value(earned), _parse_credit_value(required)


def _parse_credit_value(value: str) -> float | None:
    normalized = value.strip().replace(",", ".")
    if not normalized or normalized == "-":
        return 0.0 if normalized == "-" else None
    try:
        return float(normalized)
    except ValueError:
        return None


def _progress_percent(earned: float | None, required: float | None) -> float | None:
    if earned is None or required is None or required <= 0:
        return None
    return round(min(100.0, max(0.0, earned / required * 100)), 1)

from __future__ import annotations

from .alma_feature_html import CURRENT_LECTURES_START_URL, extract_current_lectures_form, parse_current_lectures_page
from .alma_feature_models import AlmaCurrentLecturesPage
from .client import AlmaClient


def fetch_current_lectures(
    client: AlmaClient,
    *,
    date: str | None = None,
    limit: int | None = None,
) -> AlmaCurrentLecturesPage:
    response = client.session.get(
        CURRENT_LECTURES_START_URL,
        timeout=client.timeout_seconds,
        allow_redirects=True,
    )
    response.raise_for_status()

    if date:
        form = extract_current_lectures_form(response.text, response.url)
        payload: list[tuple[str, str]] = list(form.payload.items())
        payload.append((form.date_field_name, date))
        if form.filter_field_name:
            for value in form.filter_values:
                payload.append((form.filter_field_name, value))
        payload.append(("activePageElementId", form.search_button_name))
        payload.append((form.search_button_name, "Suchen"))
        response = client.session.post(
            form.action_url,
            data=payload,
            timeout=client.timeout_seconds,
            allow_redirects=True,
        )
        response.raise_for_status()

    page = parse_current_lectures_page(response.text, response.url)
    if limit is None:
        return page

    bounded_limit = max(1, limit)
    return AlmaCurrentLecturesPage(
        page_url=page.page_url,
        selected_date=page.selected_date,
        results=page.results[:bounded_limit],
    )

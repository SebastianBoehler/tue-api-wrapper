from __future__ import annotations

from datetime import date, datetime, timedelta
import re

from .alma_timetable_html import build_timetable_action_request, parse_timetable_contract
from .alma_timetable_models import (
    AlmaTimetableContract,
    AlmaTimetableDay,
    AlmaTimetableExportLink,
    AlmaTimetableOption,
    AlmaTimetableView,
)
from .client import AlmaClient
from .config import AlmaLoginError, AlmaParseError
from .html_contract import build_term_export_url
from .models import CalendarOccurrence

_CHANGE_TERM_FIELD = "plan:scheduleConfiguration:anzeigeoptionen:changeTerm_input"
_CHANGE_TERM_TRIGGER = "plan:scheduleConfiguration:anzeigeoptionen:refreshChangeTerm"
_RANGE_MODE_FIELD = "plan:scheduleConfiguration:anzeigeoptionen:auswahl_zeitraum_input"
_RANGE_MODE_TRIGGER = "plan:scheduleConfiguration:anzeigeoptionen:refreshAuswahlZeitraum"
_SELECT_WEEK_FIELD = "plan:scheduleConfiguration:anzeigeoptionen:selectWeek_input"
_SELECT_WEEK_TRIGGER = "plan:scheduleConfiguration:anzeigeoptionen:refreshSelectWeek"
_PRINT_TRIGGER = "plan:scheduleConfiguration:anzeigeoptionen:print"
_REFRESH_EXPORT_TRIGGER = "plan:scheduleConfiguration:anzeigeoptionen:ical:renewSecurityToken"


def _parse_date(value: str) -> date:
    raw = value.strip()
    if not raw:
        raise AlmaParseError("Expected a non-empty date value.")

    for pattern in ("%Y-%m-%d", "%d.%m.%Y"):
        try:
            return datetime.strptime(raw, pattern).date()
        except ValueError:
            continue
    raise AlmaParseError(f"Unsupported date format '{value}'. Use YYYY-MM-DD or DD.MM.YYYY.")


def _week_range_from_label(label: str) -> tuple[date, date] | None:
    match = re.search(r"(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})", label)
    if match is None:
        return None
    return (_parse_date(match.group(1)), _parse_date(match.group(2)))


def _fetch_timetable_contract(client: AlmaClient) -> AlmaTimetableContract:
    response = client.session.get(
        client.timetable_url,
        timeout=client.timeout_seconds,
        allow_redirects=True,
    )
    response.raise_for_status()
    if client._looks_logged_out(response.text):
        raise AlmaLoginError("Session is not authenticated; the timetable page redirected back to login.")
    return parse_timetable_contract(response.text, response.url)


def _post_timetable_html(
    client: AlmaClient,
    html: str,
    page_url: str,
    *,
    trigger_name: str,
    field_overrides: dict[str, str] | None = None,
    extra_fields: dict[str, str] | None = None,
) -> tuple[str, str]:
    request = build_timetable_action_request(
        html,
        page_url,
        trigger_name=trigger_name,
        field_overrides=field_overrides,
        extra_fields=extra_fields,
    )
    response = client.session.post(
        request.action_url,
        data=request.payload,
        timeout=client.timeout_seconds,
        allow_redirects=True,
    )
    response.raise_for_status()
    if client._looks_logged_out(response.text):
        raise AlmaLoginError("Session is not authenticated; the Alma timetable action redirected back to login.")
    return response.text, response.url


def _resolve_option(options: tuple[AlmaTimetableOption, ...], raw_value: str, *, field_label: str) -> AlmaTimetableOption:
    normalized = raw_value.strip().casefold()
    for option in options:
        if option.value.casefold() == normalized or option.label.casefold() == normalized:
            return option
    available = ", ".join(option.label for option in options[:20])
    raise AlmaParseError(f"Unknown {field_label} '{raw_value}'. Available options: {available}")


def _resolve_term_option(contract: AlmaTimetableContract, term: str | None) -> AlmaTimetableOption | None:
    if term and term.strip():
        if not contract.terms:
            return AlmaTimetableOption(
                value=contract.selected_term_value or "",
                label=contract.selected_term_label or term.strip(),
                is_selected=True,
            )
        return _resolve_option(contract.terms, term, field_label="term")
    if not contract.terms:
        if contract.selected_term_label or contract.export_url:
            return AlmaTimetableOption(
                value=contract.selected_term_value or "",
                label=contract.selected_term_label or "Current term",
                is_selected=True,
            )
        return None
    return next((option for option in contract.terms if option.is_selected), contract.terms[0])


def _resolve_week_option(contract: AlmaTimetableContract, week: str | None) -> AlmaTimetableOption | None:
    if not contract.weeks:
        return None
    if week and week.strip():
        return _resolve_option(contract.weeks, week, field_label="week")
    return next((option for option in contract.weeks if option.is_selected), None)


def _build_generated_days(start: date, end: date, *, single_day: bool) -> tuple[AlmaTimetableDay, ...]:
    days: list[AlmaTimetableDay] = []
    current = start
    while current <= end:
        if single_day or current.weekday() < 5:
            iso_date = current.isoformat()
            days.append(AlmaTimetableDay(label=iso_date, iso_date=iso_date, restrict_view_name=None, note=None))
        current += timedelta(days=1)
    return tuple(days)


def _build_range_days(start: date, end: date) -> tuple[AlmaTimetableDay, ...]:
    days: list[AlmaTimetableDay] = []
    current = start
    while current <= end:
        iso_date = current.isoformat()
        days.append(AlmaTimetableDay(label=iso_date, iso_date=iso_date, restrict_view_name=None, note=None))
        current += timedelta(days=1)
    return tuple(days)


def _filter_occurrences(
    occurrences: tuple[CalendarOccurrence, ...],
    *,
    range_start: date | None,
    range_end: date | None,
    limit: int | None,
) -> tuple[CalendarOccurrence, ...]:
    if range_start is None or range_end is None:
        filtered = occurrences
    else:
        filtered = tuple(
            item
            for item in occurrences
            if range_start <= item.start.date() <= range_end
        )

    if limit is None:
        return filtered
    return filtered[: max(1, limit)]


def _resolve_visible_day(contract: AlmaTimetableContract, raw_value: str) -> AlmaTimetableDay:
    parsed_day = _parse_date(raw_value)
    for day in contract.days:
        if day.iso_date == parsed_day.isoformat() and day.restrict_view_name:
            return day
    raise AlmaParseError(
        f"Single-day Alma actions require a visible day button, but '{parsed_day.isoformat()}' is not in the current view."
    )


def _apply_timetable_selections(
    client: AlmaClient,
    *,
    term: str | None = None,
    week: str | None = None,
    single_day: str | None = None,
) -> tuple[AlmaTimetableContract, str, str]:
    response = client.session.get(
        client.timetable_url,
        timeout=client.timeout_seconds,
        allow_redirects=True,
    )
    response.raise_for_status()
    if client._looks_logged_out(response.text):
        raise AlmaLoginError("Session is not authenticated; the timetable page redirected back to login.")

    html = response.text
    page_url = response.url
    contract = parse_timetable_contract(html, page_url)

    term_option = _resolve_term_option(contract, term)
    if term_option is not None and term_option.value != contract.selected_term_value:
        html, page_url = _post_timetable_html(
            client,
            html,
            page_url,
            trigger_name=_CHANGE_TERM_TRIGGER,
            field_overrides={_CHANGE_TERM_FIELD: term_option.value},
            extra_fields={"DISABLE_VALIDATION": "true"},
        )
        contract = parse_timetable_contract(html, page_url)

    week_option = _resolve_week_option(contract, week)
    if week_option is not None:
        if contract.selected_range_mode_value != "woche":
            html, page_url = _post_timetable_html(
                client,
                html,
                page_url,
                trigger_name=_RANGE_MODE_TRIGGER,
                field_overrides={_RANGE_MODE_FIELD: "woche"},
                extra_fields={"DISABLE_VALIDATION": "true"},
            )
            contract = parse_timetable_contract(html, page_url)
            week_option = _resolve_week_option(contract, week)
        if week_option is not None and week_option.value != contract.selected_week_value:
            html, page_url = _post_timetable_html(
                client,
                html,
                page_url,
                trigger_name=_SELECT_WEEK_TRIGGER,
                field_overrides={_SELECT_WEEK_FIELD: week_option.value},
                extra_fields={"DISABLE_VALIDATION": "true"},
            )
            contract = parse_timetable_contract(html, page_url)

    if single_day and single_day.strip():
        visible_day = _resolve_visible_day(contract, single_day)
        html, page_url = _post_timetable_html(
            client,
            html,
            page_url,
            trigger_name=visible_day.restrict_view_name,
        )
        contract = parse_timetable_contract(html, page_url)

    return contract, html, page_url


def fetch_timetable_controls(client: AlmaClient) -> AlmaTimetableContract:
    return _fetch_timetable_contract(client)


def fetch_timetable_view(
    client: AlmaClient,
    *,
    term: str | None = None,
    week: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    single_day: str | None = None,
    limit: int | None = None,
) -> AlmaTimetableView:
    contract = _fetch_timetable_contract(client)
    term_option = _resolve_term_option(contract, term)
    if term_option is None:
        raise AlmaParseError("Could not determine the currently selected Alma timetable term.")

    timetable = client.fetch_timetable_for_term(term_option.label)
    week_option = _resolve_week_option(contract, week)

    range_start: date | None = None
    range_end: date | None = None
    effective_range_mode_value = contract.selected_range_mode_value
    effective_range_mode_label = contract.selected_range_mode_label

    if single_day and single_day.strip():
        parsed_day = _parse_date(single_day)
        range_start = parsed_day
        range_end = parsed_day
    elif from_date and from_date.strip():
        range_start = _parse_date(from_date)
        range_end = _parse_date(to_date or from_date)
        effective_range_mode_value = "zeitraum"
        effective_range_mode_label = "Zeitraum"
    elif week_option is not None:
        week_range = _week_range_from_label(week_option.label)
        if week_range is not None:
            range_start, range_end = week_range

    if range_start is None and contract.days:
        current_days = [day for day in contract.days if day.iso_date]
        if current_days:
            range_start = _parse_date(current_days[0].iso_date)
            range_end = _parse_date(current_days[-1].iso_date)

    occurrences = _filter_occurrences(
        timetable.occurrences,
        range_start=range_start,
        range_end=range_end,
        limit=limit,
    )

    if range_start is not None and range_end is not None:
        if from_date and from_date.strip():
            days = _build_range_days(range_start, range_end)
        elif week_option is not None and not single_day:
            days = _build_generated_days(range_start, range_end, single_day=False)
        else:
            days = _build_generated_days(range_start, range_end, single_day=bool(single_day and single_day.strip()))
    else:
        days = contract.days

    calendar_feed_url = None
    if contract.export_url is not None:
        calendar_feed_url = build_term_export_url(contract.export_url, term_option.value) if term_option.value else contract.export_url

    return AlmaTimetableView(
        page_url=contract.page_url,
        selected_term_value=term_option.value,
        selected_term_label=term_option.label,
        selected_range_mode_value=effective_range_mode_value,
        selected_range_mode_label=effective_range_mode_label,
        selected_week_value=week_option.value if week_option is not None else None,
        selected_week_label=week_option.label if week_option is not None else None,
        visible_range_start=range_start,
        visible_range_end=range_end,
        source_export_url=contract.export_url,
        calendar_feed_url=calendar_feed_url,
        can_refresh_export_url=contract.can_refresh_export_url,
        can_print_pdf=contract.print_available,
        supports_custom_range=contract.supports_custom_range,
        terms=contract.terms,
        range_modes=contract.range_modes,
        weeks=contract.weeks,
        days=days,
        occurrences=occurrences,
    )


def refresh_timetable_export_url(
    client: AlmaClient,
    *,
    term: str | None = None,
) -> AlmaTimetableExportLink:
    contract = _fetch_timetable_contract(client)
    if not contract.can_refresh_export_url:
        raise AlmaParseError("The current Alma timetable page does not expose a feed-token refresh action.")

    html, page_url = _post_timetable_html(
        client,
        client.fetch_timetable_page(),
        client.timetable_url,
        trigger_name=_REFRESH_EXPORT_TRIGGER,
        extra_fields={
            "DISABLE_VALIDATION": "true",
            "DISABLE_AUTOSCROLL": "true",
        },
    )
    refreshed_contract = parse_timetable_contract(html, page_url)
    term_option = _resolve_term_option(refreshed_contract, term)

    return AlmaTimetableExportLink(
        page_url=refreshed_contract.page_url,
        selected_term_value=term_option.value if term_option is not None else refreshed_contract.selected_term_value,
        selected_term_label=term_option.label if term_option is not None else refreshed_contract.selected_term_label,
        source_export_url=refreshed_contract.export_url,
        calendar_feed_url=(
            build_term_export_url(refreshed_contract.export_url, term_option.value)
            if refreshed_contract.export_url is not None and term_option is not None
            else refreshed_contract.export_url
        ),
        can_refresh_export_url=refreshed_contract.can_refresh_export_url,
    )


def fetch_timetable_pdf(
    client: AlmaClient,
    *,
    term: str | None = None,
    week: str | None = None,
    single_day: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
):
    if from_date or to_date:
        raise AlmaParseError("Printable timetable PDFs currently support term, week, and single-day views, but not custom date ranges.")

    contract, html, page_url = _apply_timetable_selections(client, term=term, week=week, single_day=single_day)
    if not contract.print_available:
        raise AlmaParseError("The current Alma timetable page does not expose a printable PDF action.")

    request = build_timetable_action_request(html, page_url, trigger_name=_PRINT_TRIGGER)
    response = client.session.post(
        request.action_url,
        data=request.payload,
        timeout=client.timeout_seconds,
        allow_redirects=True,
    )
    response.raise_for_status()
    content_type = response.headers.get("content-type", "")
    if "pdf" not in content_type.lower():
        if client._looks_logged_out(response.text):
            raise AlmaLoginError("Session is not authenticated; the Alma timetable PDF action redirected back to login.")
        raise AlmaParseError("Expected a PDF response from the Alma timetable export action.")
    return response

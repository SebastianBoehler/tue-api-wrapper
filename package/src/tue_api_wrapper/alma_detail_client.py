from __future__ import annotations

from typing import TYPE_CHECKING

from .alma_detail_html import extract_module_detail_contract, find_show_all_modules_trigger, merge_module_detail_tabs, parse_module_detail_page
from .alma_detail_tabs import detail_tabs_to_fetch
from .alma_detail_forms import set_assignment_row_limits
from .config import AlmaParseError
from .models import AlmaModuleDetail

if TYPE_CHECKING:
    from .client import AlmaClient


def fetch_public_module_detail(client: "AlmaClient", detail_url: str) -> AlmaModuleDetail:
    detail_url = detail_url.strip()
    if not detail_url:
        raise AlmaParseError("A non-empty Alma detail URL is required.")

    response = client.session.get(detail_url, timeout=client.timeout_seconds, allow_redirects=True)
    response.raise_for_status()

    base_detail = parse_module_detail_page(response.text, response.url)
    detail = base_detail
    latest_html = response.text
    latest_url = response.url
    pending_labels = [tab.label for tab in detail_tabs_to_fetch(extract_module_detail_contract(response.text, response.url))]
    for label in pending_labels:
        latest_contract = extract_module_detail_contract(latest_html, latest_url)
        tab = next((item for item in detail_tabs_to_fetch(latest_contract) if item.label == label), None)
        if tab is None:
            continue
        tab_response = _post_detail_tab(client, latest_html, latest_url, tab)
        detail = merge_module_detail_tabs(detail, parse_module_detail_page(tab_response.text, tab_response.url))
        latest_html = tab_response.text
        latest_url = tab_response.url
    return _fetch_expanded_assignment_tables(client, detail, latest_html, latest_url)


def _post_detail_tab(client: "AlmaClient", html: str, page_url: str, tab):
    contract = extract_module_detail_contract(html, page_url)
    payload = dict(contract.payload)
    set_assignment_row_limits(payload)
    if contract.submit_marker_name is not None:
        payload[contract.submit_marker_name] = "1"
    if tab.name is not None:
        payload["activePageElementId"] = tab.name
        payload[tab.name] = tab.value or tab.label

    tab_target = tab.element_id or tab.name
    if tab_target is not None:
        payload[f"{contract.form_id}:_idcl"] = tab_target

    payload.setdefault("DISABLE_VALIDATION", "true")
    payload.setdefault("DISABLE_AUTOSCROLL", "true")

    response = client.session.post(
        contract.action_url or page_url,
        data=payload,
        timeout=client.timeout_seconds,
        allow_redirects=True,
    )
    response.raise_for_status()
    return response


def _fetch_expanded_assignment_tables(
    client: "AlmaClient",
    detail: AlmaModuleDetail,
    html: str,
    page_url: str,
) -> AlmaModuleDetail:
    trigger = find_show_all_modules_trigger(html)
    if trigger is None:
        return detail

    contract = extract_module_detail_contract(html, page_url)
    if contract.action_url is None:
        return detail

    trigger_name, trigger_value = trigger
    payload = dict(contract.payload)
    set_assignment_row_limits(payload)
    if contract.submit_marker_name is not None:
        payload[contract.submit_marker_name] = "1"
    payload["activePageElementId"] = trigger_name
    payload[trigger_name] = trigger_value
    payload[f"{contract.form_id}:_idcl"] = trigger_name
    payload.setdefault("DISABLE_VALIDATION", "true")
    payload.setdefault("DISABLE_AUTOSCROLL", "true")

    response = client.session.post(
        contract.action_url,
        data=payload,
        timeout=client.timeout_seconds,
        allow_redirects=True,
    )
    response.raise_for_status()
    return merge_module_detail_tabs(detail, parse_module_detail_page(response.text, response.url))

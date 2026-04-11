from __future__ import annotations

from typing import TYPE_CHECKING

from .alma_detail_html import (
    extract_module_detail_contract,
    find_module_study_program_tab,
    merge_module_detail_tabs,
    parse_module_detail_page,
)
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
    contract = extract_module_detail_contract(response.text, response.url)
    tab = find_module_study_program_tab(contract)
    if tab is None or tab.is_active or contract.action_url is None:
        return base_detail

    payload = dict(contract.payload)
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

    tab_response = client.session.post(
        contract.action_url,
        data=payload,
        timeout=client.timeout_seconds,
        allow_redirects=True,
    )
    tab_response.raise_for_status()

    return merge_module_detail_tabs(
        base_detail,
        parse_module_detail_page(tab_response.text, tab_response.url),
    )

from __future__ import annotations

from .alma_catalog_html import extract_course_catalog_contract, parse_course_catalog_contract_page
from .alma_catalog_models import AlmaCourseCatalogContract, AlmaCourseCatalogPage, AlmaCourseCatalogTermOption
from .client import AlmaClient
from .config import AlmaLoginError, AlmaParseError


COURSE_CATALOG_URL = (
    "https://alma.uni-tuebingen.de/alma/pages/cm/exa/coursecatalog/showCourseCatalog.xhtml"
    "?_flowId=showCourseCatalog-flow"
    "&navigationPosition=studiesOffered%2CcourseoverviewShow"
    "&recordRequest=true"
)


def _selected_term_option(contract: AlmaCourseCatalogContract) -> AlmaCourseCatalogTermOption | None:
    return next((option for option in contract.term_options if option.is_selected), None)


def _resolve_term_option(contract: AlmaCourseCatalogContract, term: str | None) -> AlmaCourseCatalogTermOption | None:
    if not contract.term_options:
        return None
    if term and term.strip():
        normalized = term.strip().casefold()
        for option in contract.term_options:
            if option.value.casefold() == normalized or option.label.casefold() == normalized:
                return option
        available = ", ".join(option.label for option in contract.term_options[:20])
        raise AlmaParseError(f"Unknown course-catalog term '{term}'. Available options: {available}")
    return _selected_term_option(contract) or contract.term_options[0]


def fetch_course_catalog_page(
    client: AlmaClient,
    *,
    term: str | None = None,
    limit: int | None = None,
) -> AlmaCourseCatalogPage:
    response = client.session.get(
        COURSE_CATALOG_URL,
        timeout=client.timeout_seconds,
        allow_redirects=True,
    )
    response.raise_for_status()
    if client._looks_logged_out(response.text):
        raise AlmaLoginError("Session is not authenticated; the course catalog page redirected back to login.")

    contract = extract_course_catalog_contract(response.text, response.url)
    term_option = _resolve_term_option(contract, term)

    if (
        term_option is not None
        and contract.term_field_name is not None
        and term_option.value != (_selected_term_option(contract).value if _selected_term_option(contract) else None)
    ):
        payload = dict(contract.payload)
        payload[contract.term_field_name] = term_option.value
        if contract.submit_marker_name is not None:
            payload[contract.submit_marker_name] = "1"

        form_id = contract.submit_marker_name.removesuffix("_SUBMIT") if contract.submit_marker_name else "detailViewData"
        payload.setdefault("DISABLE_VALIDATION", "true")
        payload.setdefault(f"{form_id}:_idcl", f"{form_id}:tabContainer:term-planning-container:tabs:parallelGroupsTab")

        response = client.session.post(
            contract.action_url,
            data=payload,
            timeout=client.timeout_seconds,
            allow_redirects=True,
        )
        response.raise_for_status()

    page = parse_course_catalog_contract_page(response.text, response.url)
    if limit is None:
        return page

    return AlmaCourseCatalogPage(
        page_url=page.page_url,
        selected_term_value=page.selected_term_value,
        selected_term_label=page.selected_term_label,
        term_options=page.term_options,
        nodes=page.nodes[: max(1, limit)],
    )

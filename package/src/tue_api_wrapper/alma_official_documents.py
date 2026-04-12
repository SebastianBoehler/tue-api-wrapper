from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urljoin

from bs4 import BeautifulSoup
import requests

from .alma_documents_html import extract_studyservice_page
from .client import AlmaClient
from .config import AlmaLoginError, AlmaParseError
from .html_forms import extract_form_payload
from .models import AlmaDocumentReport, AlmaDownloadedDocument
from .alma_partial import select_partial_markup


_EXAM_REPORT_URL = (
    "/alma/pages/sul/examAssessment/personExamsReadonly.xhtml"
    "?_flowId=examsOverviewForPerson-flow"
    "&navigationPosition=hisinoneMeinStudium%2CexamAssessmentForStudent"
    "&recordRequest=true"
)


@dataclass(frozen=True)
class AlmaFormAction:
    action_url: str
    payload: dict[str, str]
    reports: tuple[AlmaDocumentReport, ...]


def list_exam_reports(client: AlmaClient) -> tuple[AlmaDocumentReport, ...]:
    return _fetch_exam_contract(client).reports


def download_exam_report(client: AlmaClient, *, trigger_name: str | None = None) -> AlmaDownloadedDocument:
    contract = _fetch_exam_contract(client)
    report = _resolve_report(contract.reports, trigger_name, kind="exam report")
    payload = dict(contract.payload)
    payload["activePageElementId"] = report.trigger_name
    payload["refreshButtonClickedId"] = ""
    payload["examsReadonly:_idcl"] = report.trigger_name

    response = client.session.post(
        contract.action_url,
        data=payload,
        timeout=client.timeout_seconds,
        allow_redirects=True,
    )
    response.raise_for_status()
    return _document_from_response_or_html(client, response)


def download_studyservice_report(
    client: AlmaClient,
    *,
    trigger_name: str | None = None,
    term_id: str | None = None,
    poll_attempts: int = 6,
) -> AlmaDownloadedDocument:
    contract = client.fetch_studyservice_contract()
    report = _resolve_report(contract.reports, trigger_name, kind="study-service report")
    payload = dict(contract.payload)
    payload["activePageElementId"] = report.trigger_name
    payload["refreshButtonClickedId"] = ""
    payload[report.trigger_name] = ""

    response = client.session.post(
        contract.action_url,
        data=payload,
        timeout=client.timeout_seconds,
        allow_redirects=True,
    )
    response.raise_for_status()
    document = _document_if_ready(client, response)
    if document is not None:
        return document

    start = _build_start_job_action(response.text, response.url, term_id=term_id)
    response = client.session.post(
        start.action_url,
        data=start.payload,
        timeout=client.timeout_seconds,
        allow_redirects=True,
    )
    response.raise_for_status()
    document = _document_if_ready(client, response)
    if document is not None:
        return document

    return _poll_studyservice_job(client, response.text, response.url, attempts=poll_attempts)


def _fetch_exam_contract(client: AlmaClient) -> AlmaFormAction:
    response = client.session.get(
        f"{client.base_url}{_EXAM_REPORT_URL}",
        timeout=client.timeout_seconds,
        allow_redirects=True,
    )
    response.raise_for_status()
    if client._looks_logged_out(response.text):
        raise AlmaLoginError("Session is not authenticated; the exam report page redirected back to login.")
    return _parse_exam_contract(response.text, response.url)


def _parse_exam_contract(html: str, page_url: str) -> AlmaFormAction:
    soup = BeautifulSoup(html, "html.parser")
    form = soup.find("form", id="examsReadonly")
    if form is None:
        raise AlmaParseError("Could not find the Alma exam report form.")

    reports: list[AlmaDocumentReport] = []
    seen: set[str] = set()
    for node in form.find_all(attrs={"name": lambda value: bool(value and "printReport" in value)}):
        trigger = node.get("name")
        if not trigger or trigger in seen:
            continue
        seen.add(trigger)
        label = " ".join(node.get_text(" ", strip=True).split()) or node.get("value") or trigger.rsplit(":", 1)[-1]
        reports.append(AlmaDocumentReport(label=label, trigger_name=trigger))

    if not reports:
        for node in form.find_all(id=lambda value: bool(value and "printReport" in value)):
            trigger = node.get("id")
            if trigger and trigger not in seen:
                seen.add(trigger)
                reports.append(AlmaDocumentReport(label=trigger.rsplit(":", 1)[-1], trigger_name=trigger))

    return AlmaFormAction(
        action_url=urljoin(page_url, form.get("action", page_url)),
        payload=extract_form_payload(form),
        reports=tuple(reports),
    )


def _build_start_job_action(html: str, page_url: str, *, term_id: str | None) -> AlmaFormAction:
    soup = BeautifulSoup(select_partial_markup(html, "startJob"), "html.parser")
    form = soup.find("form", id="studyserviceForm")
    if form is None:
        raise AlmaParseError("Could not find Alma's study-service job configuration form.")

    start = form.find(attrs={"name": lambda value: bool(value and value.endswith(":startJob"))})
    if start is None:
        raise AlmaParseError("The selected study-service report did not expose a PDF creation action.")

    payload = extract_form_payload(form)
    if term_id:
        for name in list(payload):
            if name.endswith(":setting_0:setting_input"):
                payload[name] = term_id
    trigger_name = start.get("name")
    payload["activePageElementId"] = trigger_name
    payload["refreshButtonClickedId"] = ""
    payload[trigger_name] = start.get("value") or start.get_text(" ", strip=True) or "PDF erstellen"
    return AlmaFormAction(
        action_url=urljoin(page_url, form.get("action", page_url)),
        payload=payload,
        reports=(),
    )


def _poll_studyservice_job(
    client: AlmaClient,
    html: str,
    page_url: str,
    *,
    attempts: int,
) -> AlmaDownloadedDocument:
    for _ in range(max(1, attempts)):
        poll = _build_poll_action(html, page_url)
        response = client.session.post(
            poll.action_url,
            data=poll.payload,
            timeout=client.timeout_seconds,
            allow_redirects=True,
        )
        response.raise_for_status()
        document = _document_if_ready(client, response)
        if document is not None:
            return document
        html = response.text
        page_url = response.url
    raise AlmaParseError("Alma did not expose the generated study-service PDF after polling the report job.")


def _build_poll_action(html: str, page_url: str) -> AlmaFormAction:
    soup = BeautifulSoup(select_partial_markup(html, "jobDownloadPoll:poll"), "html.parser")
    form = soup.find("form", id="studyserviceForm")
    if form is None:
        raise AlmaParseError("Could not find the Alma study-service polling form.")
    poll = form.find(attrs={"name": lambda value: bool(value and value.endswith(":jobDownloadPoll:poll"))})
    if poll is None:
        raise AlmaParseError("Alma did not expose a study-service document polling action.")
    trigger_name = poll.get("name")
    payload = extract_form_payload(form)
    payload["activePageElementId"] = trigger_name
    payload["refreshButtonClickedId"] = ""
    payload[trigger_name] = poll.get("value", "")
    return AlmaFormAction(action_url=urljoin(page_url, form.get("action", page_url)), payload=payload, reports=())


def _document_if_ready(client: AlmaClient, response: requests.Response) -> AlmaDownloadedDocument | None:
    if _is_pdf(response):
        return AlmaDownloadedDocument(
            source_url=response.url,
            final_url=response.url,
            filename=client._extract_download_filename(response, response.url),
            content_type=response.headers.get("content-type"),
            data=response.content,
        )
    link = _find_document_link(response.text, response.url)
    return client._download_document(link) if link is not None else None


def _document_from_response_or_html(client: AlmaClient, response: requests.Response) -> AlmaDownloadedDocument:
    document = _document_if_ready(client, response)
    if document is not None:
        return document
    if client._looks_logged_out(response.text):
        raise AlmaLoginError("Session is not authenticated; Alma redirected the document action back to login.")
    raise AlmaParseError("Alma did not expose a generated PDF for that report action.")


def _find_document_link(html: str, page_url: str) -> str | None:
    html = select_partial_markup(html, "state=docdownload")
    try:
        page = extract_studyservice_page(html, page_url)
        if page.latest_download_url:
            return page.latest_download_url
    except AlmaParseError:
        pass
    soup = BeautifulSoup(html, "html.parser")
    link = soup.find("a", href=lambda href: bool(href and "state=docdownload" in href))
    return urljoin(page_url, link["href"]) if link else None


def _resolve_report(
    reports: tuple[AlmaDocumentReport, ...],
    trigger_name: str | None,
    *,
    kind: str,
) -> AlmaDocumentReport:
    if trigger_name and trigger_name.strip():
        needle = trigger_name.strip()
        for report in reports:
            if report.trigger_name == needle or report.label.casefold() == needle.casefold():
                return report
        raise AlmaParseError(f"Unknown Alma {kind} '{trigger_name}'.")
    if len(reports) == 1:
        return reports[0]
    if not reports:
        raise AlmaParseError(f"Alma did not expose any {kind} actions.")
    raise AlmaParseError(f"Multiple Alma {kind} actions are available; pass trigger_name explicitly.")


def _is_pdf(response: requests.Response) -> bool:
    return "pdf" in response.headers.get("content-type", "").lower() or response.content.startswith(b"%PDF-")

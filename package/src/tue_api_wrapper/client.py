from __future__ import annotations

from email.utils import decode_rfc2231
import re
from urllib.parse import parse_qsl, quote, unquote, urlparse

from bs4 import BeautifulSoup
import requests

from .alma_documents_html import extract_studyservice_page
from .alma_academics_html import (
    extract_module_search_form,
    parse_course_catalog_page,
    parse_enrollment_page,
    parse_exam_overview,
    parse_module_search_page,
    parse_module_search_results,
)
from .config import (
    AlmaLoginError,
    AlmaParseError,
    DEFAULT_BASE_URL,
    DEFAULT_TIMEOUT_SECONDS,
    START_PAGE_PATH,
    STUDYSERVICE_PATH,
    TIMETABLE_PATH,
)
from .html_contract import (
    build_term_export_url,
    extract_login_form,
    extract_timetable_export_url,
    extract_timetable_terms,
)
from .ics import expand_ics_events, parse_ics_events
from .models import (
    AlmaCourseCatalogNode,
    AlmaDownloadedDocument,
    AlmaDocumentReport,
    AlmaEnrollmentPage,
    AlmaExamNode,
    AlmaModuleSearchPage,
    AlmaStudyServicePage,
    TimetableResult,
)


class AlmaClient:
    def __init__(
        self,
        *,
        base_url: str = DEFAULT_BASE_URL,
        timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
        session: requests.Session | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds
        self.session = session or requests.Session()
        self.session.headers.setdefault(
            "User-Agent",
            "tue-api-wrapper/0.1 (+https://alma.uni-tuebingen.de/)",
        )

    @property
    def start_page_url(self) -> str:
        return f"{self.base_url}{START_PAGE_PATH}"

    @property
    def timetable_url(self) -> str:
        return f"{self.base_url}{TIMETABLE_PATH}"

    @property
    def studyservice_url(self) -> str:
        return f"{self.base_url}{STUDYSERVICE_PATH}"

    def login(self, username: str, password: str) -> str:
        response = self.session.get(self.start_page_url, timeout=self.timeout_seconds)
        response.raise_for_status()

        login_form = extract_login_form(response.text, response.url)
        payload = dict(login_form.payload)
        payload["asdf"] = username
        payload["fdsa"] = password
        payload.setdefault("submit", "")

        login_response = self.session.post(
            login_form.action_url,
            data=payload,
            timeout=self.timeout_seconds,
            allow_redirects=True,
        )
        login_response.raise_for_status()

        if self._looks_logged_out(login_response.text):
            error_message = self._extract_login_error(login_response.text)
            if error_message:
                raise AlmaLoginError(error_message)
            raise AlmaLoginError("Alma login did not reach an authenticated page.")
        return login_response.text

    def fetch_timetable_page(self) -> str:
        response = self.session.get(self.timetable_url, timeout=self.timeout_seconds)
        response.raise_for_status()
        if self._looks_logged_out(response.text):
            raise AlmaLoginError("Session is not authenticated; the timetable page redirected back to login.")
        return response.text

    def fetch_timetable_for_term(self, term_label: str) -> TimetableResult:
        timetable_html = self.fetch_timetable_page()
        terms = extract_timetable_terms(timetable_html)
        try:
            term_id = terms[term_label]
        except KeyError as exc:
            available = ", ".join(sorted(terms))
            raise AlmaParseError(f"Unknown term '{term_label}'. Available terms: {available}") from exc

        export_url = build_term_export_url(extract_timetable_export_url(timetable_html), term_id)
        calendar_response = self.session.get(export_url, timeout=self.timeout_seconds)
        calendar_response.raise_for_status()
        raw_ics = self._decode_calendar_response(calendar_response)
        if "BEGIN:VCALENDAR" not in raw_ics:
            raise AlmaParseError("Expected an iCalendar export but received a different response.")

        events = parse_ics_events(raw_ics)
        occurrences = expand_ics_events(events, term_label)
        return TimetableResult(
            term_label=term_label,
            term_id=term_id,
            export_url=export_url,
            raw_ics=raw_ics,
            events=events,
            occurrences=occurrences,
            available_terms=terms,
        )

    def fetch_studyservice_page(self) -> str:
        response = self.session.get(self.studyservice_url, timeout=self.timeout_seconds)
        response.raise_for_status()
        if self._looks_logged_out(response.text):
            raise AlmaLoginError("Session is not authenticated; the study service page redirected back to login.")
        return response.text

    def fetch_enrollment_page(self) -> AlmaEnrollmentPage:
        response = self.session.get(
            f"{self.base_url}/alma/pages/cm/exa/enrollment/info/start.xhtml?_flowId=searchOwnEnrollmentInfo-flow"
            "&navigationPosition=hisinoneMeinStudium%2ChisinoneOwnEnrollmentList&recordRequest=true",
            timeout=self.timeout_seconds,
            allow_redirects=True,
        )
        response.raise_for_status()
        if self._looks_logged_out(response.text):
            raise AlmaLoginError("Session is not authenticated; the enrollment page redirected back to login.")
        return parse_enrollment_page(response.text)

    def fetch_exam_overview(self) -> tuple[AlmaExamNode, ...]:
        response = self.session.get(
            f"{self.base_url}/alma/pages/sul/examAssessment/personExamsReadonly.xhtml?_flowId=examsOverviewForPerson-flow"
            "&navigationPosition=hisinoneMeinStudium%2CexamAssessmentForStudent&recordRequest=true",
            timeout=self.timeout_seconds,
            allow_redirects=True,
        )
        response.raise_for_status()
        if self._looks_logged_out(response.text):
            raise AlmaLoginError("Session is not authenticated; the exam overview page redirected back to login.")
        return parse_exam_overview(response.text)

    def fetch_course_catalog(self) -> tuple[AlmaCourseCatalogNode, ...]:
        response = self.session.get(
            f"{self.base_url}/alma/pages/cm/exa/coursecatalog/showCourseCatalog.xhtml?_flowId=showCourseCatalog-flow"
            "&navigationPosition=studiesOffered%2CcourseoverviewShow&recordRequest=true",
            timeout=self.timeout_seconds,
            allow_redirects=True,
        )
        response.raise_for_status()
        if self._looks_logged_out(response.text):
            raise AlmaLoginError("Session is not authenticated; the course catalog page redirected back to login.")
        return parse_course_catalog_page(response.text)

    def search_module_descriptions(self, query: str) -> AlmaModuleSearchPage:
        query = query.strip()
        if not query:
            raise AlmaParseError("A non-empty module search query is required.")

        response = self.session.get(
            f"{self.base_url}/alma/pages/cm/exa/curricula/moduleDescriptionSearch.xhtml?_flowId=searchElementsInModuleDescription-flow"
            "&navigationPosition=studiesOffered%2CmoduleDescriptions%2CsearchElementsInModuleDescription&recordRequest=true",
            timeout=self.timeout_seconds,
            allow_redirects=True,
        )
        response.raise_for_status()
        if self._looks_logged_out(response.text):
            raise AlmaLoginError("Session is not authenticated; the module search page redirected back to login.")

        form = extract_module_search_form(response.text, response.url)
        payload = dict(form.payload)
        payload[form.query_field_name] = query
        payload["activePageElementId"] = "genericSearchMask:buttonsBottom:search"
        payload["genericSearchMask:buttonsBottom:search"] = "Suchen"

        response = self.session.post(form.action_url, data=payload, timeout=self.timeout_seconds, allow_redirects=True)
        response.raise_for_status()
        if self._looks_logged_out(response.text):
            raise AlmaLoginError("Session expired while submitting the module search form.")
        return AlmaModuleSearchPage(form=form, results=parse_module_search_results(response.text))

    def fetch_studyservice_contract(self) -> AlmaStudyServicePage:
        response = self.session.get(self.studyservice_url, timeout=self.timeout_seconds)
        response.raise_for_status()
        if self._looks_logged_out(response.text):
            raise AlmaLoginError("Session is not authenticated; the study service page redirected back to login.")
        return extract_studyservice_page(response.text, response.url)

    def list_studyservice_reports(self) -> tuple[AlmaDocumentReport, ...]:
        return self.fetch_studyservice_contract().reports

    def download_current_studyservice_document(self) -> AlmaDownloadedDocument:
        contract = self.fetch_studyservice_contract()
        if contract.latest_download_url is None:
            raise AlmaParseError("The study service page does not currently expose a document download link.")
        return self._download_document(contract.latest_download_url)

    def download_document_by_id(self, doc_id: str) -> AlmaDownloadedDocument:
        doc_id = doc_id.strip()
        if not doc_id:
            raise AlmaParseError("A non-empty Alma document id is required.")
        download_url = f"{self.base_url}/alma/rds?state=docdownload&docId={quote(doc_id)}"
        return self._download_document(download_url)

    @staticmethod
    def _extract_login_error(html: str) -> str | None:
        soup = BeautifulSoup(html, "html.parser")
        text = soup.get_text("\n", strip=True)
        match = re.search(r"Fehler:\s*(.+?)\s*(Studierende, die aktuell|$)", text, flags=re.DOTALL)
        if not match:
            return None
        return re.sub(r"\s+", " ", match.group(1)).strip()

    @staticmethod
    def _looks_logged_out(html: str) -> bool:
        soup = BeautifulSoup(html, "html.parser")
        body = soup.find("body")
        classes = set(body.get("class", [])) if body else set()
        if "notloggedin" in classes:
            return True
        return soup.find("form", id="loginForm") is not None

    def _download_document(self, download_url: str) -> AlmaDownloadedDocument:
        response = self.session.get(download_url, timeout=self.timeout_seconds, allow_redirects=True)
        response.raise_for_status()
        if not (
            response.headers.get("content-type", "").startswith("application/pdf")
            or response.content.startswith(b"%PDF-")
        ):
            snippet = response.text[:200].strip() if response.text else ""
            raise AlmaParseError(f"Expected a PDF document but received a different response: {snippet}")
        return AlmaDownloadedDocument(
            source_url=download_url,
            final_url=response.url,
            filename=self._extract_download_filename(response, download_url),
            content_type=response.headers.get("content-type"),
            data=response.content,
        )

    @staticmethod
    def _decode_calendar_response(response: requests.Response) -> str:
        for encoding in ("utf-8", response.encoding, response.apparent_encoding, "latin-1"):
            if not encoding:
                continue
            try:
                return response.content.decode(encoding)
            except UnicodeDecodeError:
                continue
        return response.content.decode("utf-8", errors="replace")

    @staticmethod
    def _extract_download_filename(response: requests.Response, fallback_url: str) -> str:
        content_disposition = response.headers.get("content-disposition", "")
        encoded_match = re.search(r"filename\*=([^;]+)", content_disposition, flags=re.IGNORECASE)
        if encoded_match:
            charset, _, encoded_value = decode_rfc2231(encoded_match.group(1).strip())
            if encoded_value:
                return unquote(encoded_value, encoding=charset or "utf-8")

        plain_match = re.search(r'filename="([^"]+)"', content_disposition, flags=re.IGNORECASE)
        if plain_match:
            return plain_match.group(1)

        parsed = urlparse(response.url or fallback_url)
        query = dict(parse_qsl(parsed.query, keep_blank_values=True))
        doc_name = query.get("docName")
        if doc_name:
            return doc_name
        return "alma-document.pdf"

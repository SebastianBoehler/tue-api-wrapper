from __future__ import annotations

import os
from urllib.parse import quote

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
import uvicorn

from .client import AlmaClient
from .config import AlmaError
from .portal_service import DEFAULT_DASHBOARD_TERM, PortalService, serialize

app = FastAPI(
    title="tue-api-wrapper",
    version="0.2.0",
    description="Unified Alma and ILIAS backend for CLI, web, and ChatGPT surfaces.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

portal_service = PortalService()


def _alma_client() -> AlmaClient:
    return portal_service._alma_client()


def _public_alma_client() -> AlmaClient:
    return AlmaClient()


def _translate_error(error: AlmaError) -> HTTPException:
    return HTTPException(status_code=400, detail=str(error))


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": "tue-api-wrapper",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/dashboard")
def dashboard(term: str = Query(DEFAULT_DASHBOARD_TERM)) -> dict[str, object]:
    try:
        return portal_service.build_dashboard(term_label=term)
    except AlmaError as error:
        raise _translate_error(error) from error


@app.get("/api/search")
def search(query: str, term: str = Query(DEFAULT_DASHBOARD_TERM)) -> dict[str, object]:
    try:
        return {"results": portal_service.search(query, term_label=term)}
    except AlmaError as error:
        raise _translate_error(error) from error


@app.get("/api/items/{item_id:path}")
def fetch_item(item_id: str, term: str = Query(DEFAULT_DASHBOARD_TERM)) -> dict[str, object]:
    try:
        return portal_service.fetch_item(item_id, term_label=term)
    except AlmaError as error:
        raise _translate_error(error) from error


@app.get("/api/alma/timetable")
def alma_timetable(term: str = Query(DEFAULT_DASHBOARD_TERM)) -> dict[str, object]:
    try:
        result = _alma_client().fetch_timetable_for_term(term)
        return serialize(result)
    except AlmaError as error:
        raise _translate_error(error) from error


@app.get("/api/alma/enrollments")
def alma_enrollments() -> dict[str, object]:
    try:
        return serialize(_alma_client().fetch_enrollment_page())
    except AlmaError as error:
        raise _translate_error(error) from error


@app.get("/api/alma/exams")
def alma_exams(limit: int = Query(20, ge=1, le=100)) -> list[object]:
    try:
        return serialize(_alma_client().fetch_exam_overview()[:limit])
    except AlmaError as error:
        raise _translate_error(error) from error


@app.get("/api/alma/catalog")
def alma_catalog(limit: int = Query(20, ge=1, le=100)) -> list[object]:
    try:
        return serialize(_alma_client().fetch_course_catalog()[:limit])
    except AlmaError as error:
        raise _translate_error(error) from error


@app.get("/api/alma/module-search")
def alma_module_search(
    query: str = "",
    title: str = "",
    number: str = "",
    element_type: list[str] = Query(default=[]),
    language: list[str] = Query(default=[]),
    degree: list[str] = Query(default=[]),
    subject: list[str] = Query(default=[]),
    faculty: list[str] = Query(default=[]),
    max_results: int = Query(100, ge=1, le=300),
) -> dict[str, object]:
    try:
        result = _public_alma_client().search_public_module_descriptions(
            query=query,
            title=title,
            number=number,
            element_types=tuple(element_type),
            languages=tuple(language),
            degrees=tuple(degree),
            subjects=tuple(subject),
            faculties=tuple(faculty),
            max_results=max_results,
        )
        return {
            "results": serialize(result.results),
            "returnedResults": result.returned_results,
            "totalResults": result.total_results,
            "totalPages": result.total_pages,
            "truncated": result.truncated,
            "sourcePageUrl": _public_alma_client().public_module_search_url,
        }
    except AlmaError as error:
        raise _translate_error(error) from error


@app.get("/api/alma/module-search/filters")
def alma_module_search_filters() -> dict[str, object]:
    try:
        filters = _public_alma_client().fetch_public_module_search_filters()
        return {
            "sourcePageUrl": _public_alma_client().public_module_search_url,
            "filters": {
                "elementTypes": serialize(filters.element_types),
                "languages": serialize(filters.languages),
                "degrees": serialize(filters.degrees),
                "subjects": serialize(filters.subjects),
                "faculties": serialize(filters.faculties),
            },
        }
    except AlmaError as error:
        raise _translate_error(error) from error


@app.get("/api/alma/module-detail")
def alma_module_detail(url: str) -> dict[str, object]:
    try:
        return serialize(_public_alma_client().fetch_public_module_detail(url))
    except AlmaError as error:
        raise _translate_error(error) from error


@app.get("/api/alma/documents")
def alma_documents() -> list[object]:
    try:
        return serialize(_alma_client().list_studyservice_reports())
    except AlmaError as error:
        raise _translate_error(error) from error


@app.get("/api/alma/documents/current")
def alma_current_document() -> Response:
    try:
        document = _alma_client().download_current_studyservice_document()
    except AlmaError as error:
        raise _translate_error(error) from error

    return Response(
        content=document.data,
        media_type=document.content_type or "application/pdf",
        headers={"Content-Disposition": f'inline; filename="{document.filename}"'},
    )


@app.get("/api/alma/documents/{doc_id}")
def alma_document_by_id(doc_id: str) -> Response:
    try:
        document = _alma_client().download_document_by_id(doc_id)
    except AlmaError as error:
        raise _translate_error(error) from error

    return Response(
        content=document.data,
        media_type=document.content_type or "application/pdf",
        headers={"Content-Disposition": f'inline; filename="{document.filename}"'},
    )


@app.get("/api/alma/documents/{doc_id}/download-url")
def alma_document_download_url(doc_id: str) -> dict[str, str]:
    return {"url": f"/api/alma/documents/{quote(doc_id, safe='')}"}


@app.get("/api/ilias/root")
def ilias_root() -> dict[str, object]:
    try:
        return serialize(portal_service._ilias_client().fetch_root_page())
    except AlmaError as error:
        raise _translate_error(error) from error


@app.get("/api/ilias/content")
def ilias_content(target: str) -> dict[str, object]:
    try:
        return serialize(portal_service._ilias_client().fetch_content_page(target))
    except AlmaError as error:
        raise _translate_error(error) from error


@app.get("/api/ilias/forum")
def ilias_forum(target: str) -> list[object]:
    try:
        return serialize(portal_service._ilias_client().fetch_forum_topics(target))
    except AlmaError as error:
        raise _translate_error(error) from error


@app.get("/api/ilias/exercise")
def ilias_exercise(target: str) -> list[object]:
    try:
        return serialize(portal_service._ilias_client().fetch_exercise_assignments(target))
    except AlmaError as error:
        raise _translate_error(error) from error


@app.exception_handler(AlmaError)
async def handle_alma_error(_request, error: AlmaError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"detail": str(error)})


def main() -> None:
    uvicorn.run(
        "tue_api_wrapper.api_server:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=False,
    )


if __name__ == "__main__":
    main()

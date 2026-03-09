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
def alma_module_search(query: str) -> dict[str, object]:
    try:
        return serialize(_alma_client().search_module_descriptions(query))
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

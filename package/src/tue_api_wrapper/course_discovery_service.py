from __future__ import annotations

from datetime import datetime, timezone
from typing import Callable

from .alma_course_search_client import search_courses
from .alma_feature_client import fetch_current_lectures
from .client import AlmaClient
from .config import AlmaError
from .course_discovery_embeddings import build_embedding_provider
from .course_discovery_lance import build_lance_store
from .course_discovery_models import CourseDiscoveryFilters, CourseDiscoverySearchResponse, CourseDiscoveryStatus
from .course_discovery_sources import (
    alma_course_documents,
    alma_current_lecture_documents,
    alma_module_documents,
    ilias_membership_documents,
    moodle_course_documents,
)
from .course_discovery_store import InMemoryDiscoveryStore
from .ilias_client import IliasClient
from .moodle_auth import build_moodle_client

AlmaLoader = Callable[[], AlmaClient]
IliasLoader = Callable[[], IliasClient]


class CourseDiscoveryService:
    def __init__(
        self,
        *,
        public_alma: AlmaClient | None = None,
        alma_loader: AlmaLoader | None = None,
        ilias_loader: IliasLoader | None = None,
    ) -> None:
        self._public_alma = public_alma or AlmaClient()
        self._alma_loader = alma_loader
        self._ilias_loader = ilias_loader
        self._embedding_provider = build_embedding_provider()
        self._store = build_lance_store(self._embedding_provider) or InMemoryDiscoveryStore()
        self._store_name = getattr(self._store, "name", "memory")
        self._last_refresh: str | None = None
        self._errors: list[str] = []

    def refresh(
        self,
        *,
        query: str = "",
        include_private: bool = False,
        limit: int = 80,
    ) -> CourseDiscoveryStatus:
        documents, errors = self._collect_documents(query=query, include_private=include_private, limit=limit)
        self._store.replace(documents)
        self._last_refresh = datetime.now(timezone.utc).isoformat()
        self._errors = list(errors)
        return self.status()

    def search(
        self,
        query: str,
        *,
        filters: CourseDiscoveryFilters | None = None,
        include_private: bool = False,
        limit: int = 20,
    ) -> CourseDiscoverySearchResponse:
        filters = filters or CourseDiscoveryFilters()
        documents, errors = self._collect_documents(query=query, include_private=include_private, limit=max(limit * 3, 30))
        self._store.replace(documents)
        results = self._store.search(query, filters, limit)
        return CourseDiscoverySearchResponse(query=query, results=results, status=self.status(), errors=errors)

    def status(self) -> CourseDiscoveryStatus:
        return CourseDiscoveryStatus(
            document_count=len(self._store.documents()),
            semantic_available=self._embedding_provider.model_name is not None and self._store_name == "lancedb",
            vector_store=self._store_name,
            embedding_model=self._embedding_provider.model_name,
            last_refresh=self._last_refresh,
            errors=tuple(self._errors),
        )

    def _collect_documents(
        self,
        *,
        query: str,
        include_private: bool,
        limit: int,
    ):
        documents = []
        errors: list[str] = []
        try:
            modules = self._public_alma.search_public_module_descriptions(query=query, max_results=limit)
            documents.extend(alma_module_documents(modules.results))
        except AlmaError as error:
            errors.append(f"Alma module search failed: {error}")

        if include_private:
            documents.extend(self._private_documents(query=query, limit=limit, errors=errors))
        return tuple(documents), tuple(errors)

    def _private_documents(self, *, query: str, limit: int, errors: list[str]):
        documents = []
        if self._alma_loader is not None:
            try:
                alma = self._alma_loader()
                documents.extend(alma_course_documents(search_courses(alma, query=query, limit=limit).results))
                documents.extend(alma_current_lecture_documents(fetch_current_lectures(alma, limit=min(limit, 50)).results))
            except AlmaError as error:
                errors.append(f"Authenticated Alma discovery failed: {error}")

        if self._ilias_loader is not None:
            try:
                documents.extend(ilias_membership_documents(self._ilias_loader().fetch_membership_overview()))
            except AlmaError as error:
                errors.append(f"ILIAS discovery failed: {error}")

        try:
            documents.extend(moodle_course_documents(build_moodle_client().fetch_enrolled_courses(limit=limit).items))
        except AlmaError as error:
            errors.append(f"Moodle discovery failed: {error}")
        return documents

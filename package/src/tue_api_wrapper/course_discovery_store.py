from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field

from .course_discovery_models import CourseDiscoveryDocument, CourseDiscoveryFilters, CourseDiscoveryResult

TOKEN_RE = re.compile(r"[\wäöüÄÖÜß]+", re.UNICODE)


@dataclass
class InMemoryDiscoveryStore:
    _documents: dict[str, CourseDiscoveryDocument] = field(default_factory=dict)

    def replace(self, documents: tuple[CourseDiscoveryDocument, ...]) -> None:
        self._documents = {document.id: document for document in documents}

    def add(self, documents: tuple[CourseDiscoveryDocument, ...]) -> None:
        self._documents.update({document.id: document for document in documents})

    def documents(self) -> tuple[CourseDiscoveryDocument, ...]:
        return tuple(self._documents.values())

    def search(self, query: str, filters: CourseDiscoveryFilters, limit: int) -> tuple[CourseDiscoveryResult, ...]:
        query_tokens = _tokens(query)
        scored = [
            CourseDiscoveryResult(document=document, score=score, match_reason=_reason(document, query_tokens))
            for document in self._documents.values()
            if _matches_filters(document, filters)
            for score in [_lexical_score(document, query_tokens)]
            if score > 0 or not query_tokens
        ]
        return tuple(sorted(scored, key=lambda item: item.score, reverse=True)[:limit])


def _matches_filters(document: CourseDiscoveryDocument, filters: CourseDiscoveryFilters) -> bool:
    if filters.sources and document.source not in filters.sources:
        return False
    if filters.kinds and document.kind not in filters.kinds:
        return False
    if filters.degree and not _contains_any(document.degrees or ((document.degree,) if document.degree else ()), filters.degree):
        return False
    if filters.module_code and not _contains_any(document.module_categories, filters.module_code):
        return False
    if filters.term and filters.term.lower() not in (document.term or "").lower():
        return False
    document_tags = {tag.lower() for tag in document.tags}
    return all(tag.lower() in document_tags or tag.lower() in _haystack(document) for tag in filters.tags)


def _lexical_score(document: CourseDiscoveryDocument, query_tokens: tuple[str, ...]) -> float:
    if not query_tokens:
        return 0.1
    counts = Counter(_tokens(f"{document.title} {document.text} {' '.join(document.tags)}"))
    title_tokens = set(_tokens(document.title))
    score = 0.0
    for token in query_tokens:
        if token in counts:
            score += min(counts[token], 4)
        if token in title_tokens:
            score += 2.5
        if document.module_code and token in document.module_code.lower():
            score += 2
        if any(token in category.lower() for category in document.module_categories):
            score += 2
    return score / max(len(query_tokens), 1)


def _reason(document: CourseDiscoveryDocument, query_tokens: tuple[str, ...]) -> str:
    if not query_tokens:
        return "Included by source and filter selection."
    title_tokens = set(_tokens(document.title))
    if any(token in title_tokens for token in query_tokens):
        return "Title match"
    if any(token in category.lower() for token in query_tokens for category in document.module_categories):
        return "Module area match"
    return "Description or metadata match"


def _tokens(value: str) -> tuple[str, ...]:
    return tuple(match.group(0).lower() for match in TOKEN_RE.finditer(value))


def _haystack(document: CourseDiscoveryDocument) -> str:
    return " ".join((document.text, " ".join(document.tags), " ".join(document.module_categories), " ".join(document.degrees))).lower()


def _contains_any(values: tuple[str, ...], needle: str) -> bool:
    lowered = needle.lower()
    return any(lowered in value.lower() for value in values)

from __future__ import annotations

from dataclasses import dataclass

from .ilias_feature_models import IliasSearchResult
from .models import AlmaModuleDetail


@dataclass(frozen=True)
class CourseDetailLookupQuery:
    portal: str
    query: str
    reason: str
    result_count: int
    error: str | None = None


@dataclass(frozen=True)
class CourseRegistrationHint:
    source: str
    label: str
    text: str


@dataclass(frozen=True)
class RelatedIliasResult:
    result: IliasSearchResult
    match_query: str
    match_reason: str
    score: int
    matched_identifier: str | None


@dataclass(frozen=True)
class UnifiedCourseDetail:
    alma: AlmaModuleDetail
    ilias_results: tuple[RelatedIliasResult, ...]
    lookup_queries: tuple[CourseDetailLookupQuery, ...]
    registration_hints: tuple[CourseRegistrationHint, ...]
    ilias_error: str | None

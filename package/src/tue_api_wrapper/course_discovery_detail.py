from __future__ import annotations

from .course_discovery_models import CourseDiscoveryDocument
from .models import AlmaDetailTable, AlmaModuleDetail


def enrich_with_alma_detail(document: CourseDiscoveryDocument, detail: AlmaModuleDetail) -> CourseDiscoveryDocument:
    module_categories, degrees = extract_applicability(detail.module_study_program_tables)
    if not module_categories and not degrees:
        return document

    metadata = dict(document.metadata)
    metadata["applicableModuleCategories"] = module_categories
    metadata["applicableDegrees"] = degrees
    return CourseDiscoveryDocument(
        id=document.id,
        source=document.source,
        kind=document.kind,
        title=document.title,
        text=" ".join((document.text, " ".join(module_categories), " ".join(degrees))).strip(),
        url=document.url,
        module_code=document.module_code,
        degree=document.degree,
        module_categories=_merge_tuple(document.module_categories, module_categories),
        degrees=_merge_tuple(document.degrees, degrees),
        term=document.term,
        instructors=document.instructors,
        tags=_merge_tuple(document.tags, (*module_categories, *degrees)),
        metadata=metadata,
    )


def extract_applicability(tables: tuple[AlmaDetailTable, ...]) -> tuple[tuple[str, ...], tuple[str, ...]]:
    module_categories: list[str] = []
    degrees: list[str] = []
    for table in tables:
        header_map = {_normalize(header): index for index, header in enumerate(table.headers)}
        module_index = _first_index(header_map, ("modul", "modulnummer"))
        program_index = _first_index(header_map, ("studiengang", "fach"))
        degree_index = _first_index(header_map, ("abschluss",))
        for row in table.rows:
            if module_index is not None and module_index < len(row):
                module_categories.append(row[module_index])
            elif table.title.lower().startswith("module") and row:
                module_categories.append(row[0])
            degree = _degree_label(row, program_index, degree_index)
            if degree:
                degrees.append(degree)
    return _clean_tuple(module_categories), _clean_tuple(degrees)


def _degree_label(row: tuple[str, ...], program_index: int | None, degree_index: int | None) -> str | None:
    program = row[program_index].strip() if program_index is not None and program_index < len(row) else ""
    degree = row[degree_index].strip() if degree_index is not None and degree_index < len(row) else ""
    if program and degree and degree.lower() not in program.lower():
        return f"{program} {degree}"
    return program or degree or None


def _first_index(header_map: dict[str, int], names: tuple[str, ...]) -> int | None:
    for name in names:
        if name in header_map:
            return header_map[name]
    return None


def _normalize(value: str) -> str:
    return " ".join(value.strip().casefold().split())


def _clean_tuple(values: list[str]) -> tuple[str, ...]:
    return _merge_tuple((), tuple(value.strip() for value in values if value.strip()))


def _merge_tuple(left: tuple[str, ...], right: tuple[str, ...]) -> tuple[str, ...]:
    seen: set[str] = set()
    merged: list[str] = []
    for value in (*left, *right):
        key = value.lower()
        if key not in seen:
            seen.add(key)
            merged.append(value)
    return tuple(merged)

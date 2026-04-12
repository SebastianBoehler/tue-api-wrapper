from __future__ import annotations

import re


COURSE_IDENTIFIER_RE = re.compile(r"\b([A-ZÄÖÜ]{2,12})[-\s]?(\d{2,5}[A-Z]?)\b")


def extract_course_identifiers(*values: str | None) -> tuple[str, ...]:
    identifiers: dict[str, str] = {}
    for value in values:
        if not value:
            continue
        for match in COURSE_IDENTIFIER_RE.finditer(value):
            identifier = " ".join(match.group(0).split())
            normalized = normalize_course_identifier(identifier)
            if normalized:
                identifiers.setdefault(normalized, identifier)
    return tuple(identifiers.values())


def identifier_search_terms(identifier: str) -> tuple[str, ...]:
    match = COURSE_IDENTIFIER_RE.search(identifier)
    if match is None:
        return (identifier.strip(),) if identifier.strip() else ()

    prefix = match.group(1).upper()
    number = match.group(2).upper()
    candidates = (
        " ".join(match.group(0).split()),
        f"{prefix}{number}",
        f"{prefix} {number}",
        f"{prefix}-{number}",
    )
    return tuple(dict.fromkeys(candidate for candidate in candidates if candidate))


def normalize_course_identifier(value: str) -> str:
    return "".join(character for character in value.casefold() if character.isalnum())

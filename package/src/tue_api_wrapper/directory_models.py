from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class DirectoryForm:
    action_url: str
    payload: tuple[tuple[str, str], ...]


@dataclass(frozen=True)
class DirectoryAction:
    kind: str
    target: str | None = None
    name: str | None = None
    value: str | None = None


@dataclass(frozen=True)
class DirectoryField:
    label: str
    value: str


@dataclass(frozen=True)
class DirectoryPersonSummary:
    name: str
    subtitle: str | None
    action: DirectoryAction


@dataclass(frozen=True)
class DirectoryOrganizationSummary:
    name: str
    action: DirectoryAction


@dataclass(frozen=True)
class DirectoryPersonSection:
    title: str
    items: tuple[DirectoryPersonSummary, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class DirectoryContactSection:
    title: str
    fields: tuple[DirectoryField, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class DirectoryOrganization:
    name: str
    fields: tuple[DirectoryField, ...] = field(default_factory=tuple)
    person_list_action: DirectoryAction | None = None


@dataclass(frozen=True)
class DirectoryPerson:
    name: str
    summary: str | None
    attributes: tuple[DirectoryField, ...] = field(default_factory=tuple)
    contact_sections: tuple[DirectoryContactSection, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class DirectorySearchResponse:
    query: str
    title: str
    outcome: str
    form: DirectoryForm | None = None
    sections: tuple[DirectoryPersonSection, ...] = field(default_factory=tuple)
    organizations: tuple[DirectoryOrganizationSummary, ...] = field(default_factory=tuple)
    person: DirectoryPerson | None = None
    organization: DirectoryOrganization | None = None
    message: str | None = None

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AlmaCourseRegistrationOption:
    planelement_id: str
    label: str
    action_name: str


@dataclass(frozen=True)
class AlmaCourseRegistrationSupport:
    detail_url: str
    title: str | None
    number: str | None
    supported: bool
    action: str | None
    status: str | None = None
    messages: tuple[str, ...] = ()
    message: str | None = None


@dataclass(frozen=True)
class AlmaCourseRegistrationOptions:
    detail_url: str
    title: str | None
    number: str | None
    action: str
    options: tuple[AlmaCourseRegistrationOption, ...]
    messages: tuple[str, ...]


@dataclass(frozen=True)
class AlmaCourseRegistrationResult:
    detail_url: str
    final_url: str
    title: str | None
    number: str | None
    action: str
    selected_option: AlmaCourseRegistrationOption
    messages: tuple[str, ...]
    status: str | None

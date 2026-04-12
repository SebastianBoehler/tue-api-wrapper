from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class IliasActionResult:
    status: str
    message: str | None
    final_url: str


@dataclass(frozen=True)
class IliasWaitlistSupport:
    supported: bool
    requires_agreement: bool
    join_url: str | None
    message: str | None


@dataclass(frozen=True)
class IliasWaitlistResult:
    status: str
    message: str | None
    final_url: str
    waitlist_position: int | None
    requires_agreement: bool

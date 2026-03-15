from __future__ import annotations

import os


def _read_first(*names: str) -> str | None:
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return None


def read_uni_credentials() -> tuple[str | None, str | None]:
    return (
        _read_first("UNI_USERNAME", "ALMA_USERNAME", "ILIAS_USERNAME"),
        _read_first("UNI_PASSWORD", "ALMA_PASSWORD", "ILIAS_PASSWORD"),
    )


def read_mail_credentials() -> tuple[str | None, str | None]:
    return (
        _read_first("UNI_USERNAME", "MAIL_USERNAME", "ALMA_USERNAME", "ILIAS_USERNAME"),
        _read_first("UNI_PASSWORD", "MAIL_PASSWORD", "ALMA_PASSWORD", "ILIAS_PASSWORD"),
    )


def require_uni_credentials() -> tuple[str, str]:
    username, password = read_uni_credentials()
    if not username or not password:
        raise ValueError(
            "Set UNI_USERNAME and UNI_PASSWORD before using authenticated commands. "
            "Legacy ALMA_* and ILIAS_* env vars are still supported as fallbacks."
        )
    return username, password


def require_mail_credentials() -> tuple[str, str]:
    username, password = read_mail_credentials()
    if not username or not password:
        raise ValueError(
            "Set UNI_USERNAME and UNI_PASSWORD before using mail commands. "
            "MAIL_USERNAME and MAIL_PASSWORD remain available only as optional overrides."
        )
    return username, password

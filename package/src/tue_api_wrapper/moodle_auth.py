from __future__ import annotations

from .config import AlmaParseError
from .credentials import read_uni_credentials
from .moodle_client import MoodleClient


def build_moodle_client() -> MoodleClient:
    username, password = read_uni_credentials()
    if not username or not password:
        raise AlmaParseError(
            "Set UNI_USERNAME and UNI_PASSWORD before using authenticated Moodle endpoints. "
            "Legacy ALMA_* and ILIAS_* env vars are still supported as fallbacks."
        )

    client = MoodleClient()
    client.login(username=username, password=password)
    return client

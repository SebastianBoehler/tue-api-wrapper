from __future__ import annotations

from .alma_detail_html import AlmaDetailPageContract, AlmaDetailTabControl


READ_ONLY_COURSE_DETAIL_TABS = (
    "Termine",
    "Inhalte",
    "Gekoppelte Prüfungen",
    "Module / Studiengänge",
)


def detail_tabs_to_fetch(contract: AlmaDetailPageContract) -> tuple[AlmaDetailTabControl, ...]:
    wanted = {_tab_key(label) for label in READ_ONLY_COURSE_DETAIL_TABS}
    return tuple(
        tab
        for tab in contract.tabs
        if not tab.is_active and _tab_key(tab.label) in wanted
    )


def _tab_key(label: str) -> str:
    return label.casefold().replace(" ", "")

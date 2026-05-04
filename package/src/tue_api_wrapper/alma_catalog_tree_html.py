from __future__ import annotations

import re

from bs4 import BeautifulSoup

from .config import AlmaParseError
from .models import AlmaCourseCatalogNode


def parse_course_catalog_page(html: str) -> tuple[AlmaCourseCatalogNode, ...]:
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", class_="treeTableWithIcons")
    if table is None:
        raise AlmaParseError("Could not find the Alma course catalog tree table.")

    rows: list[AlmaCourseCatalogNode] = []
    for tr in table.find_all("tr"):
        classes = tr.get("class", [])
        level_match = next((re.search(r"treeTableCellLevel(\d+)", item) for item in classes if "treeTableCellLevel" in item), None)
        if level_match is None:
            continue
        title_node = tr.find(id=re.compile(r":ot_3$"))
        if title_node is None:
            continue
        description_node = tr.find(id=re.compile(r":ot_4$"))
        permalink = tr.find("input", attrs={"id": "autologinRequestUrl"})
        icon = tr.find("img", class_="imagetop")
        rows.append(
            AlmaCourseCatalogNode(
                level=int(level_match.group(1)),
                kind=icon.get("alt") if icon else None,
                title=_clean(title_node.get_text(" ", strip=True)),
                description=_clean(description_node.get_text(" ", strip=True)) if description_node else None,
                permalink=permalink.get("value") if permalink else None,
                expandable=tr.find("button", class_="treeTableIcon") is not None,
            )
        )
    return tuple(rows)


def _clean(value: str) -> str:
    return " ".join(value.split())

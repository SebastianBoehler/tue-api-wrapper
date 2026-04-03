from __future__ import annotations

from bs4.element import Tag


def extract_form_payload(form: Tag) -> dict[str, str]:
    payload: dict[str, str] = {}
    for field in form.find_all(["input", "select", "textarea"]):
        name = field.get("name")
        if not name:
            continue

        if field.name == "select":
            selected = field.find("option", selected=True)
            payload[name] = selected.get("value", "") if selected is not None else ""
            continue

        if field.name == "textarea":
            payload[name] = field.get_text()
            continue

        field_type = field.get("type", "").lower()
        if field_type in {"button", "file", "image", "password", "reset", "submit"}:
            continue
        payload[name] = field.get("value", "")
    return payload

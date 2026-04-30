from __future__ import annotations

from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from .config import AlmaParseError
from .html_forms import extract_form_payload
from .models import IliasContentItem, IliasContentPage, IliasContentSection, IliasLink, IliasLoginForm, IliasRootPage

AUTHENTICATED_ILIAS_MARKERS = (
    "ILIAS Universität Tübingen",
    "logout.php",
    "il-mainbar-entries",
    "il-maincontrols-metabar",
    "baseClass=ilDashboardGUI",
    "baseClass=ilmembershipoverviewgui",
    "baseClass=ilderivedtasksgui",
)
LOGIN_OR_HANDOFF_MARKERS = (
    "SAMLResponse",
    "j_username",
    "j_password",
    "Login mit zentraler Universitäts-Kennung",
)


def extract_shib_login_url(html: str, page_url: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for link in soup.find_all("a", href=True):
        href = link["href"]
        if "shib_login.php" in href:
            return urljoin(page_url, href)
    raise AlmaParseError("Could not find the ILIAS Shibboleth login link.")


def extract_idp_login_form(html: str, page_url: str) -> IliasLoginForm:
    soup = BeautifulSoup(html, "html.parser")
    form = soup.find("form")
    if form is None or form.find("input", attrs={"name": "j_password"}) is None:
        raise AlmaParseError("Could not find the Shibboleth IdP username/password form.")

    payload: dict[str, str] = {}
    for field in form.find_all("input"):
        name = field.get("name")
        field_type = field.get("type", "")
        if not name or field_type == "checkbox":
            continue
        payload[name] = field.get("value", "")
    return IliasLoginForm(action_url=urljoin(page_url, form["action"]), payload=payload)


def extract_hidden_form(html: str, page_url: str, required_fields: set[str]) -> IliasLoginForm:
    soup = BeautifulSoup(html, "html.parser")
    for form in soup.find_all("form"):
        payload = extract_form_payload(form)
        for field in form.find_all(["button", "input"]):
            name = field.get("name")
            if name in required_fields and name not in payload:
                payload[name] = field.get("value", "")
        if required_fields.issubset(payload):
            return IliasLoginForm(action_url=urljoin(page_url, form.get("action", page_url)), payload=payload)
    raise AlmaParseError(f"Could not find a form with fields: {sorted(required_fields)}")


def extract_idp_error(html: str) -> str | None:
    soup = BeautifulSoup(html, "html.parser")
    error = soup.find(class_="form-error")
    if error is None:
        return None
    return " ".join(error.get_text(" ", strip=True).split())


def is_authenticated_ilias_page(html: str, page_url: str) -> bool:
    parsed = urlparse(page_url)
    if parsed.hostname != "ovidius.uni-tuebingen.de":
        return False
    if any(marker in html for marker in LOGIN_OR_HANDOFF_MARKERS):
        return False
    return any(marker in html for marker in AUTHENTICATED_ILIAS_MARKERS)


def parse_ilias_root_page(html: str, page_url: str) -> IliasRootPage:
    soup = BeautifulSoup(html, "html.parser")
    title = soup.title.get_text(strip=True) if soup.title else "ILIAS"

    mainbar_links: list[IliasLink] = []
    for link in soup.select(".il-mainbar-entries a[href]"):
        label = " ".join(link.get_text(" ", strip=True).split())
        if label:
            mainbar_links.append(IliasLink(label=label, url=urljoin(page_url, link["href"])))

    top_categories: list[IliasLink] = []
    for link in soup.select("a.il_ContainerItemTitle[href]"):
        label = " ".join(link.get_text(" ", strip=True).split())
        if label:
            top_categories.append(IliasLink(label=label, url=urljoin(page_url, link["href"])))

    if not top_categories and not is_authenticated_ilias_page(html, page_url):
        raise AlmaParseError("The response did not look like an authenticated ILIAS root page.")
    return IliasRootPage(
        title=title,
        mainbar_links=tuple(mainbar_links),
        top_categories=tuple(top_categories),
    )


def parse_ilias_content_page(html: str, page_url: str) -> IliasContentPage:
    soup = BeautifulSoup(html, "html.parser")
    title = soup.title.get_text(" ", strip=True) if soup.title else "ILIAS"

    sections: list[IliasContentSection] = []
    for block in soup.select(".ilContainerBlock"):
        header = block.select_one(".ilContainerBlockHeader h2")
        label = " ".join(header.get_text(" ", strip=True).split()) if header else ""
        items: list[IliasContentItem] = []
        for row in block.select(".ilContainerListItemOuter"):
            title_link = row.select_one(".il_ContainerItemTitle a[href], a.il_ContainerItemTitle[href]")
            if title_link is None:
                continue
            item_label = " ".join(title_link.get_text(" ", strip=True).split())
            if not item_label:
                continue
            icon = row.select_one(".ilContainerListItemIcon img")
            properties = [
                " ".join(value.get_text(" ", strip=True).split())
                for value in row.select(".il_ItemProperty")
                if value.get_text(" ", strip=True)
            ]
            items.append(
                IliasContentItem(
                    label=item_label,
                    url=urljoin(page_url, title_link["href"]),
                    kind=icon.get("alt") if icon else None,
                    properties=tuple(properties),
                )
            )
        if label and items:
            sections.append(IliasContentSection(label=label, items=tuple(items)))

    if not sections and not is_authenticated_ilias_page(html, page_url):
        raise AlmaParseError("The response did not look like an authenticated ILIAS content page.")

    return IliasContentPage(title=title, page_url=page_url, sections=tuple(sections))

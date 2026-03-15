from __future__ import annotations

from .alma_planner_html import STUDY_PLANNER_URL, parse_study_planner_page
from .alma_planner_models import AlmaStudyPlannerPage
from .client import AlmaClient


def fetch_study_planner(client: AlmaClient) -> AlmaStudyPlannerPage:
    response = client.session.get(
        STUDY_PLANNER_URL,
        timeout=client.timeout_seconds,
        allow_redirects=True,
    )
    response.raise_for_status()
    return parse_study_planner_page(response.text, response.url)

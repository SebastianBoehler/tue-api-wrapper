from __future__ import annotations

from pathlib import Path
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tue_api_wrapper.api_routes_feedback import (  # noqa: E402
    GitHubCreatedIssue,
    GitHubFeedbackConfigurationError,
    NormalizedAppFeedbackIssue,
    feedback_issue_client,
    feedback_rate_limiter,
)
from tue_api_wrapper.api_server import app  # noqa: E402


class FeedbackAPITests(unittest.TestCase):
    def setUp(self) -> None:
        feedback_rate_limiter.reset()
        self.client = TestClient(app)

    def test_creates_feedback_issue(self) -> None:
        with patch.object(
            feedback_issue_client,
            "create_issue",
            return_value=GitHubCreatedIssue(
                number=42,
                url="https://github.com/SebastianBoehler/tue-api-wrapper/issues/42",
                title="[iOS Feedback] Bug: Settings submit button is clipped",
            ),
        ) as create_issue:
            response = self.client.post(
                "/api/feedback/issues",
                headers={"x-forwarded-for": "203.0.113.10"},
                json=_payload(title="  Settings submit button is clipped  "),
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            response.json(),
            {
                "issueNumber": 42,
                "issueURL": "https://github.com/SebastianBoehler/tue-api-wrapper/issues/42",
                "title": "[iOS Feedback] Bug: Settings submit button is clipped",
            },
        )

        submitted = create_issue.call_args.args[0]
        self.assertIsInstance(submitted, NormalizedAppFeedbackIssue)
        self.assertEqual(submitted.title, "Settings submit button is clipped")
        self.assertEqual(submitted.area, "Settings")
        self.assertEqual(submitted.category_label, "Bug")
        self.assertIn("<!-- source: tue-api-ios-feedback -->", submitted.github_body())

    def test_rejects_blank_trimmed_title(self) -> None:
        response = self.client.post(
            "/api/feedback/issues",
            headers={"x-forwarded-for": "203.0.113.11"},
            json=_payload(title="     "),
        )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["detail"], "title must not be empty.")

    def test_maps_missing_backend_configuration_to_503(self) -> None:
        with patch.object(
            feedback_issue_client,
            "create_issue",
            side_effect=GitHubFeedbackConfigurationError("Set GITHUB_FEEDBACK_TOKEN."),
        ):
            response = self.client.post(
                "/api/feedback/issues",
                headers={"x-forwarded-for": "203.0.113.12"},
                json=_payload(),
            )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["detail"], "Set GITHUB_FEEDBACK_TOKEN.")

    def test_rate_limits_repeated_submissions_from_same_sender(self) -> None:
        with patch.object(
            feedback_issue_client,
            "create_issue",
            return_value=GitHubCreatedIssue(
                number=7,
                url="https://github.com/SebastianBoehler/tue-api-wrapper/issues/7",
                title="[iOS Feedback] Feature: Better timetable filters",
            ),
        ) as create_issue:
            for index in range(3):
                response = self.client.post(
                    "/api/feedback/issues",
                    headers={"x-forwarded-for": "203.0.113.13"},
                    json=_payload(title=f"Feedback {index + 1}"),
                )
                self.assertEqual(response.status_code, 201)

            limited = self.client.post(
                "/api/feedback/issues",
                headers={"x-forwarded-for": "203.0.113.13"},
                json=_payload(title="Feedback 4"),
            )

        self.assertEqual(create_issue.call_count, 3)
        self.assertEqual(limited.status_code, 429)
        self.assertEqual(
            limited.json()["detail"],
            "Too many feedback submissions from this sender. Try again later.",
        )
        self.assertIn("Retry-After", limited.headers)


def _payload(*, title: str = "Add a darker timetable theme") -> dict[str, str]:
    return {
        "platform": "ios",
        "category": "bug",
        "title": title,
        "summary": "The action button in Settings overlaps the keyboard when VoiceOver is enabled.",
        "area": "Settings",
        "expectedBehavior": "The primary button should remain visible above the keyboard.",
        "reproductionSteps": "1. Open Settings.\n2. Enable VoiceOver.\n3. Focus the password field.",
        "appVersion": "0.1.0",
        "buildNumber": "1",
        "systemVersion": "iOS 17.5",
        "deviceModel": "iPhone",
    }


if __name__ == "__main__":
    unittest.main()

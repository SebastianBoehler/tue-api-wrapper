from __future__ import annotations

from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tue_api_wrapper.sdk import TuebingenPublicClient, UniversityCredentials
from tue_api_wrapper.sdk.public import PublicAlmaApi


class SdkFacadeTests(unittest.TestCase):
    def test_credentials_from_env_file_supports_mail_override(self) -> None:
        env_file = ROOT / "tmp-test.env"
        env_file.write_text(
            "\n".join(
                [
                    'export UNI_USERNAME="student"',
                    "UNI_PASSWORD='secret'",
                    "MAIL_USERNAME=mail-user",
                    "MAIL_PASSWORD=mail-secret",
                ]
            ),
            encoding="utf-8",
        )
        self.addCleanup(env_file.unlink)

        credentials = UniversityCredentials.from_env(env_file)

        self.assertEqual(credentials.username, "student")
        self.assertEqual(credentials.password, "secret")
        self.assertEqual(credentials.mail_login, ("mail-user", "mail-secret"))

    def test_credentials_mail_login_falls_back_to_university_login(self) -> None:
        credentials = UniversityCredentials("student", "secret")

        self.assertEqual(credentials.mail_login, ("student", "secret"))

    def test_public_client_exposes_clear_module_search_method(self) -> None:
        fake_alma = _FakePublicAlmaClient()
        client = TuebingenPublicClient(alma=PublicAlmaApi(client=fake_alma))

        result = client.alma.search_modules("machine learning", max_results=5)

        self.assertEqual(result, {"query": "machine learning", "max_results": 5})


class _FakePublicAlmaClient:
    def search_public_module_descriptions(self, *, query: str, max_results: int):
        return {"query": query, "max_results": max_results}


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

from contextlib import redirect_stdout
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tue_api_wrapper.route_discovery_audit import audit_har_response_formats
from tue_api_wrapper.route_discovery_cli import main as route_discovery_main


def _entry(url: str, mime_type: str, text: str, *, method: str = "GET", resource_type: str | None = None) -> dict[str, object]:
    return {
        "request": {"method": method, "url": url, "headers": []},
        "response": {"status": 200, "content": {"mimeType": mime_type, "text": text}},
        "_resourceType": resource_type or ("xhr" if method == "POST" else "document"),
    }


def _write_har(path: Path) -> None:
    payload = {
        "log": {
            "entries": [
                _entry("https://alma.example/api/events?sesskey=abc&user=me", "application/json", '{"events": []}'),
                _entry("https://alma.example/alma/start", "text/html", "<!doctype html><html></html>"),
                _entry("https://alma.example/alma/javax.faces.resource/app.js.xhtml?ln=primefaces", "text/javascript", ""),
                _entry("https://alma.example/api/search?callback=jQuery123&q=secret", "text/javascript", "jQuery123({\"items\":[]});"),
                _entry("https://alma.example/theme/image.php/core/t/expanded", "image/svg+xml", "<?xml version=\"1.0\"?>", resource_type="image"),
                _entry("https://alma.example/alma/rds?state=docdownload&docId=secret", "application/pdf", "%PDF-1.7"),
                _entry("https://alma.example/alma/partial", "text/xml", "<partial-response><changes /></partial-response>", method="POST"),
            ]
        }
    }
    path.write_text(json.dumps(payload), encoding="utf-8")


class RouteDiscoveryAuditTests(unittest.TestCase):
    def test_audit_classifies_formats_and_redacts_query_values(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            har_path = Path(temp_dir) / "session.har"
            _write_har(har_path)

            report = audit_har_response_formats(har_path=har_path)

        self.assertEqual(report["response_formats"]["json"], 1)
        self.assertEqual(report["response_formats"]["html"], 1)
        self.assertEqual(report["response_formats"]["pdf"], 1)
        self.assertEqual(report["response_formats"]["jsonp"], 1)
        self.assertEqual(report["response_formats"]["jsf_partial_html"], 1)
        samples = [endpoint["sample_url"] for endpoint in report["endpoints"]]
        self.assertTrue(any("sesskey=%3Credacted%3E" in sample for sample in samples))
        self.assertFalse(any("abc" in sample or "secret" in sample for sample in samples))
        self.assertFalse(any(endpoint["path"].endswith("/expanded") for endpoint in report["data_candidates"]))

    def test_cli_outputs_format_audit_json(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            har_path = Path(temp_dir) / "session.har"
            _write_har(har_path)
            stdout = io.StringIO()

            with redirect_stdout(stdout):
                exit_code = route_discovery_main(["generic", "--har", str(har_path), "--audit-formats", "--format", "json"])

        self.assertEqual(exit_code, 0)
        payload = json.loads(stdout.getvalue())
        self.assertEqual(payload["site"], "generic")
        self.assertGreaterEqual(len(payload["data_candidates"]), 2)
        self.assertEqual(payload["response_formats"]["json"], 1)


if __name__ == "__main__":
    unittest.main()

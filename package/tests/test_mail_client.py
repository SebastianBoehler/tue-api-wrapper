from __future__ import annotations

from pathlib import Path
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tue_api_wrapper.credentials import read_mail_credentials
from tue_api_wrapper.mail_client import _matches_message_filters
from tue_api_wrapper.mail_models import MailMessageSummary
from tue_api_wrapper.mailboxes import build_mailbox_summary, parse_mailbox_line
from tue_api_wrapper.mail_parsing import (
    decode_mime_header,
    extract_body_text,
    extract_text_preview,
    parse_message_detail,
    strip_broadcast_boilerplate,
)


class MailClientHelpersTests(unittest.TestCase):
    def test_decode_mime_header_supports_encoded_words(self) -> None:
        self.assertEqual(
            decode_mime_header("=?utf-8?b?VMO8YmluZ2VuIE1haWw=?="),
            "Tübingen Mail",
        )

    def test_extract_text_preview_prefers_plain_text(self) -> None:
        raw_message = (
            b"Subject: Test\r\n"
            b"MIME-Version: 1.0\r\n"
            b"Content-Type: multipart/alternative; boundary=abc\r\n\r\n"
            b"--abc\r\n"
            b"Content-Type: text/plain; charset=utf-8\r\n\r\n"
            b"Hello from the student mailbox.\r\nSecond line.\r\n"
            b"--abc\r\n"
            b"Content-Type: text/html; charset=utf-8\r\n\r\n"
            b"<p>Hello <strong>HTML</strong></p>\r\n"
            b"--abc--\r\n"
        )

        from email import message_from_bytes

        preview = extract_text_preview(message_from_bytes(raw_message))
        self.assertEqual(preview, "Hello from the student mailbox. Second line.")

    def test_extract_text_preview_strips_broadcast_boilerplate_before_truncating(self) -> None:
        raw_message = (
            b"Subject: Broadcast\r\n"
            b"MIME-Version: 1.0\r\n"
            b"Content-Type: text/plain; charset=utf-8\r\n\r\n"
            b"Die Hochschulleitung hat den Versand dieser Runde zugestimmt.\r\n"
            b"***********************************************************************\r\n"
            b"*     *\r\n"
            b"* Die inhaltliche Verantwortung liegt bei der Absenderin/dem Absender *\r\n"
            b"***********************************************************************\r\n"
            b"Sehr geehrte Damen und Herren,\r\n"
            b"this is the actual message.\r\n"
        )

        from email import message_from_bytes

        preview = extract_text_preview(message_from_bytes(raw_message))
        self.assertEqual(preview, "Sehr geehrte Damen und Herren, this is the actual message.")

    def test_strip_broadcast_boilerplate_handles_collapsed_preview(self) -> None:
        preview = (
            "Die Hochschulleitung hat den Versand dieser Runde zugestimmt. "
            "*********************************************************************** * * "
            "* Die inhaltliche Verantwortung liegt bei der Absenderin/dem Absender * "
            "*********************************************************************** Actual content"
        )

        self.assertEqual(strip_broadcast_boilerplate(preview), "Actual content")

    def test_extract_body_text_falls_back_to_html(self) -> None:
        raw_message = (
            b"Subject: HTML only\r\n"
            b"MIME-Version: 1.0\r\n"
            b"Content-Type: text/html; charset=utf-8\r\n\r\n"
            b"<div>Hello<br>student</div><p>Second paragraph</p>"
        )

        from email import message_from_bytes

        body = extract_body_text(message_from_bytes(raw_message))
        self.assertEqual(body, "Hello\nstudent\nSecond paragraph")

    def test_parse_message_detail_extracts_recipients_and_attachments(self) -> None:
        raw_message = (
            b"Subject: Detail Test\r\n"
            b"From: Example Office <office@example.com>\r\n"
            b"To: Student One <one@example.com>, two@example.com\r\n"
            b"Cc: Mentor <mentor@example.com>\r\n"
            b"Date: Tue, 15 Mar 2026 10:15:00 +0100\r\n"
            b"MIME-Version: 1.0\r\n"
            b"Content-Type: multipart/mixed; boundary=abc\r\n\r\n"
            b"--abc\r\n"
            b"Content-Type: text/plain; charset=utf-8\r\n\r\n"
            b"Body line one.\r\n\r\nBody line two.\r\n"
            b"--abc\r\n"
            b"Content-Type: application/pdf\r\n"
            b"Content-Disposition: attachment; filename=\"info.pdf\"\r\n\r\n"
            b"%PDF-1.4\r\n"
            b"--abc--\r\n"
        )

        detail = parse_message_detail(raw_message, uid="42", mailbox="INBOX", is_unread=True)

        self.assertEqual(detail.subject, "Detail Test")
        self.assertEqual(detail.to_recipients, ("Student One <one@example.com>", "two@example.com"))
        self.assertEqual(detail.cc_recipients, ("Mentor <mentor@example.com>",))
        self.assertEqual(detail.body_text, "Body line one.\n\nBody line two.")
        self.assertEqual(detail.attachment_names, ("info.pdf",))
        self.assertTrue(detail.is_unread)

    def test_parse_mailbox_line_supports_quoted_names(self) -> None:
        name, flags = parse_mailbox_line(b'(\\HasNoChildren) "/" "Sent Messages"')

        self.assertEqual(name, "Sent Messages")
        self.assertEqual(flags, ("\\HasNoChildren",))

    def test_build_mailbox_summary_infers_special_use(self) -> None:
        mailbox = build_mailbox_summary(
            name="Mail/trash",
            flags=("\\HasNoChildren",),
            message_count=8,
            unread_count=0,
        )

        self.assertEqual(mailbox.label, "trash")
        self.assertEqual(mailbox.special_use, "trash")
        self.assertEqual(mailbox.message_count, 8)

    def test_message_filters_match_query_and_sender(self) -> None:
        message = MailMessageSummary(
            uid="1",
            subject="Exam registration reminder",
            from_name="Studierendensekretariat",
            from_address="office@uni-tuebingen.de",
            received_at=None,
            preview="Registration deadline on Friday.",
            is_unread=True,
        )

        self.assertTrue(_matches_message_filters(message, query="deadline", sender="uni-tuebingen"))
        self.assertFalse(_matches_message_filters(message, query="library", sender=""))
        self.assertFalse(_matches_message_filters(message, query="", sender="ub.uni-tuebingen"))

    def test_read_mail_credentials_prefers_mail_specific_username(self) -> None:
        with patch.dict(
            "os.environ",
            {
                "UNI_USERNAME": "student-zdv-id",
                "UNI_PASSWORD": "shared-password",
                "MAIL_USERNAME": "mail-override-id",
            },
            clear=True,
        ):
            self.assertEqual(read_mail_credentials(), ("student-zdv-id", "shared-password"))


if __name__ == "__main__":
    unittest.main()

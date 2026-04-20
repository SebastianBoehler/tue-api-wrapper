import XCTest
@testable import TueAPI

final class MailUniversityApprovalTests: XCTestCase {
    func testParseDetailStripsApprovedRundmailBannerAndExposesNotice() {
        let detail = MailMessageParser.parseDetail(
            approvedRundmailMessage,
            uid: "12",
            mailbox: "INBOX",
            isUnread: false
        )

        XCTAssertEqual(detail.universityApprovalNotice?.title, "Approved university broadcast")
        XCTAssertEqual(detail.universityApprovalNotice?.message, "Die Hochschulleitung hat dem Versand dieser Rundmail zugestimmt.")
        XCTAssertFalse(detail.bodyText?.contains("Hochschulleitung hat dem Versand") ?? true)
        XCTAssertEqual(detail.bodyText, "Liebe Studierende,\n\ndas Fremdsprachenzentrum Tuebingen laedt Sie herzlich ein.")
    }

    private var approvedRundmailMessage: Data {
        """
        From: info@example.edu
        To: student@example.edu
        Subject: Sprachcafes
        Date: Fri, 17 Apr 2026 15:35:00 +0200
        Content-Type: text/plain; charset=utf-8

        ***********************************************************************
        * Die Hochschulleitung hat dem Versand dieser Rundmail zugestimmt.    *
        * Die inhaltliche Verantwortung liegt bei der Absenderin/dem Absender *
        ***********************************************************************
        Liebe Studierende,

        das Fremdsprachenzentrum Tuebingen laedt Sie herzlich ein.
        """
        .data(using: .utf8)!
    }
}

import Foundation

enum MailMessageParser {
    static func parseSummary(
        _ rawMessage: Data,
        uid: String,
        isUnread: Bool
    ) -> MailMessageSummary {
        let part = MIMEPart(data: rawMessage)
        let sender = MailAddressParser.single(part.header("From"))
        let body = MailBodyExtractor.bodyContent(from: part)
        return MailMessageSummary(
            uid: uid,
            subject: subject(from: part),
            fromName: sender.name,
            fromAddress: sender.address,
            receivedAt: MailHeaderDecoder.isoDate(part.header("Date")),
            preview: MailBodyExtractor.preview(from: body),
            universityApprovalNotice: body.universityApprovalNotice,
            isUnread: isUnread
        )
    }

    static func parseDetail(
        _ rawMessage: Data,
        uid: String,
        mailbox: String,
        isUnread: Bool
    ) -> MailMessageDetail {
        let part = MIMEPart(data: rawMessage)
        let sender = MailAddressParser.single(part.header("From"))
        let body = MailBodyExtractor.bodyContent(from: part)
        return MailMessageDetail(
            uid: uid,
            mailbox: mailbox,
            subject: subject(from: part),
            fromName: sender.name,
            fromAddress: sender.address,
            toRecipients: MailAddressParser.formattedList(part.header("To")),
            ccRecipients: MailAddressParser.formattedList(part.header("Cc")),
            receivedAt: MailHeaderDecoder.isoDate(part.header("Date")),
            preview: MailBodyExtractor.preview(from: body),
            bodyText: body.text,
            universityApprovalNotice: body.universityApprovalNotice,
            attachmentNames: MailBodyExtractor.attachmentNames(from: part),
            isUnread: isUnread
        )
    }

    private static func subject(from part: MIMEPart) -> String {
        MailHeaderDecoder.decode(part.header("Subject")).trimmedOrNil ?? "(No subject)"
    }
}

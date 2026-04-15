import Foundation

struct MailMessageSummary: Decodable, Identifiable, Hashable {
    var uid: String
    var subject: String
    var fromName: String?
    var fromAddress: String?
    var receivedAt: String?
    var preview: String?
    var isUnread: Bool

    var id: String { uid }

    enum CodingKeys: String, CodingKey {
        case uid, subject, preview
        case fromName = "from_name"
        case fromAddress = "from_address"
        case receivedAt = "received_at"
        case isUnread = "is_unread"
    }
}

struct MailInboxSummary: Decodable {
    var account: String
    var mailbox: String
    var unreadCount: Int
    var messages: [MailMessageSummary]

    enum CodingKeys: String, CodingKey {
        case account, mailbox, messages
        case unreadCount = "unread_count"
    }
}

struct MailboxSummary: Decodable, Identifiable, Hashable {
    var name: String
    var label: String
    var specialUse: String?
    var messageCount: Int?
    var unreadCount: Int?

    var id: String { name }

    enum CodingKeys: String, CodingKey {
        case name, label
        case specialUse = "special_use"
        case messageCount = "message_count"
        case unreadCount = "unread_count"
    }
}

struct MailMessageDetail: Decodable, Identifiable {
    var uid: String
    var mailbox: String
    var subject: String
    var fromName: String?
    var fromAddress: String?
    var toRecipients: [String]
    var ccRecipients: [String]
    var receivedAt: String?
    var preview: String?
    var bodyText: String?
    var attachmentNames: [String]
    var isUnread: Bool

    var id: String { "\(mailbox):\(uid)" }

    enum CodingKeys: String, CodingKey {
        case uid, mailbox, subject, preview
        case fromName = "from_name"
        case fromAddress = "from_address"
        case toRecipients = "to_recipients"
        case ccRecipients = "cc_recipients"
        case receivedAt = "received_at"
        case bodyText = "body_text"
        case attachmentNames = "attachment_names"
        case isUnread = "is_unread"
    }
}

struct MailMessageSelection: Hashable {
    var uid: String
    var mailbox: String
    var subject: String
}

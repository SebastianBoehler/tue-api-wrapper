import Foundation

extension BackendClient {
    func fetchMailboxes() async throws -> [MailboxSummary] {
        let url = try makeURL(path: "api/mail/mailboxes", queryItems: [])
        let data = try await get(url)
        return try JSONDecoder().decode([MailboxSummary].self, from: data)
    }

    func fetchMailInbox(
        mailbox: String = "INBOX",
        limit: Int = 25,
        query: String = "",
        unreadOnly: Bool = false
    ) async throws -> MailInboxSummary {
        var queryItems = [
            URLQueryItem(name: "mailbox", value: mailbox),
            URLQueryItem(name: "limit", value: "\(limit)")
        ]
        let trimmedQuery = query.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedQuery.isEmpty {
            queryItems.append(URLQueryItem(name: "query", value: trimmedQuery))
        }
        if unreadOnly {
            queryItems.append(URLQueryItem(name: "unread_only", value: "true"))
        }

        let url = try makeURL(path: "api/mail/inbox", queryItems: queryItems)
        let data = try await get(url)
        return try JSONDecoder().decode(MailInboxSummary.self, from: data)
    }

    func fetchMailMessage(uid: String, mailbox: String = "INBOX") async throws -> MailMessageDetail {
        let url = try makeURL(
            path: "api/mail/messages/\(uid)",
            queryItems: [URLQueryItem(name: "mailbox", value: mailbox)]
        )
        let data = try await get(url)
        return try JSONDecoder().decode(MailMessageDetail.self, from: data)
    }
}

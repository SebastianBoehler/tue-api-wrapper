import Foundation

struct OnDeviceMailService {
    private let config: MailServerConfig
    private let credentialsStore: KeychainCredentialsStore

    init(
        config: MailServerConfig = .uniTuebingen,
        credentialsStore: KeychainCredentialsStore = KeychainCredentialsStore()
    ) {
        self.config = config
        self.credentialsStore = credentialsStore
    }

    func fetchMailboxes() async throws -> [MailboxSummary] {
        let session = try await openSession()
        defer { session.connection.close() }

        let response = try await session.connection.command("LIST \"\" \"*\"")
        var mailboxes = response.lines.compactMap(IMAPMailboxParser.parseListLine)
        for index in mailboxes.indices {
            if let counts = try? await statusCounts(
                for: mailboxes[index].name,
                connection: session.connection
            ) {
                mailboxes[index].messageCount = counts.0
                mailboxes[index].unreadCount = counts.1
            }
        }

        return mailboxes.sorted(by: mailboxSort)
    }

    func fetchMailInbox(
        mailbox: String = "INBOX",
        limit: Int = 25,
        query: String = "",
        unreadOnly: Bool = false,
        scanLimit: Int = 200
    ) async throws -> MailInboxSummary {
        let session = try await openSession()
        defer { session.connection.close() }

        try await examine(mailbox: mailbox, connection: session.connection)
        let unreadUIDs = Set(try await searchUIDs("UNSEEN", connection: session.connection))
        let allUIDs = try await searchUIDs("ALL", connection: session.connection)
        let boundedLimit = min(max(limit, 1), 50)
        let trimmedQuery = query.trimmingCharacters(in: .whitespacesAndNewlines)

        let messages: [MailMessageSummary]
        if trimmedQuery.isEmpty && !unreadOnly {
            let recentUIDs = Array(allUIDs.suffix(boundedLimit).reversed())
            messages = try await summaries(
                for: recentUIDs,
                unreadUIDs: unreadUIDs,
                connection: session.connection
            )
        } else {
            let sourceUIDs = allUIDs.filter { !unreadOnly || unreadUIDs.contains($0) }
            let scannedUIDs = Array(sourceUIDs.suffix(scanLimit).reversed())
            messages = try await filteredSummaries(
                for: scannedUIDs,
                limit: boundedLimit,
                query: trimmedQuery,
                unreadUIDs: unreadUIDs,
                connection: session.connection
            )
        }

        return MailInboxSummary(
            account: session.account,
            mailbox: mailbox,
            unreadCount: unreadUIDs.count,
            messages: messages
        )
    }

    func fetchMailMessage(uid: String, mailbox: String = "INBOX") async throws -> MailMessageDetail {
        guard uid.allSatisfy(\.isNumber) else {
            throw OnDeviceMailServiceError.invalidUID
        }

        let session = try await openSession()
        defer { session.connection.close() }

        try await examine(mailbox: mailbox, connection: session.connection)
        let unreadUIDs = Set(try await searchUIDs("UNSEEN", connection: session.connection))
        let rawMessage = try await fetchRawMessage(uid: uid, connection: session.connection)
        return MailMessageParser.parseDetail(
            rawMessage,
            uid: uid,
            mailbox: mailbox,
            isUnread: unreadUIDs.contains(uid)
        )
    }

    private func openSession() async throws -> MailSession {
        guard let credentials = try credentialsStore.load() else {
            throw OnDeviceMailServiceError.credentialsMissing
        }

        let connection = try IMAPConnection(config: config)
        do {
            try await connection.connect()
            try await connection.login(username: credentials.username, password: credentials.password)
            return MailSession(connection: connection, account: credentials.username)
        } catch {
            connection.close()
            throw error
        }
    }

    private func statusCounts(
        for mailbox: String,
        connection: IMAPConnection
    ) async throws -> (Int?, Int?) {
        let response = try await connection.command(
            "STATUS \(IMAPEncoding.quoted(mailbox)) (MESSAGES UNSEEN)"
        )
        return IMAPMailboxParser.parseStatusCounts(response)
    }

    private func examine(mailbox: String, connection: IMAPConnection) async throws {
        _ = try await connection.command("EXAMINE \(IMAPEncoding.quoted(mailbox))")
    }

    private func searchUIDs(_ criterion: String, connection: IMAPConnection) async throws -> [String] {
        let response = try await connection.command("UID SEARCH \(criterion)")
        return IMAPMailboxParser.parseSearchUIDs(response)
    }

    private func summaries(
        for uids: [String],
        unreadUIDs: Set<String>,
        connection: IMAPConnection
    ) async throws -> [MailMessageSummary] {
        var messages: [MailMessageSummary] = []
        for uid in uids {
            let rawMessage = try await fetchRawMessage(uid: uid, connection: connection)
            messages.append(
                MailMessageParser.parseSummary(rawMessage, uid: uid, isUnread: unreadUIDs.contains(uid))
            )
        }
        return messages
    }

    private func filteredSummaries(
        for uids: [String],
        limit: Int,
        query: String,
        unreadUIDs: Set<String>,
        connection: IMAPConnection
    ) async throws -> [MailMessageSummary] {
        var messages: [MailMessageSummary] = []
        for uid in uids {
            let rawMessage = try await fetchRawMessage(uid: uid, connection: connection)
            let summary = MailMessageParser.parseSummary(rawMessage, uid: uid, isUnread: unreadUIDs.contains(uid))
            guard matches(summary, query: query) else { continue }
            messages.append(summary)
            if messages.count >= limit { break }
        }
        return messages
    }

    private func fetchRawMessage(uid: String, connection: IMAPConnection) async throws -> Data {
        let response = try await connection.command("UID FETCH \(uid) (BODY.PEEK[])")
        guard let rawMessage = response.literals.first else {
            throw OnDeviceMailServiceError.emptyMessage(uid)
        }
        return rawMessage
    }

    private func matches(_ message: MailMessageSummary, query: String) -> Bool {
        guard !query.isEmpty else { return true }
        let needle = query.lowercased()
        return [
            message.subject,
            message.preview ?? "",
            message.fromName ?? "",
            message.fromAddress ?? ""
        ].contains { $0.lowercased().contains(needle) }
    }

    private func mailboxSort(_ lhs: MailboxSummary, _ rhs: MailboxSummary) -> Bool {
        let lhsRank = lhs.specialUse == "inbox" ? 0 : 1
        let rhsRank = rhs.specialUse == "inbox" ? 0 : 1
        if lhsRank != rhsRank {
            return lhsRank < rhsRank
        }

        let labelOrder = lhs.label.localizedCaseInsensitiveCompare(rhs.label)
        if labelOrder != .orderedSame {
            return labelOrder == .orderedAscending
        }
        return lhs.name.localizedCaseInsensitiveCompare(rhs.name) == .orderedAscending
    }
}

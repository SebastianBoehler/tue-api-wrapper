import Foundation
import Observation
import UserNotifications

@MainActor
@Observable
final class MailBadgeStore {
    var unreadCount = 0
    var lastUpdatedAt: Date?

    private let mailService: OnDeviceMailService
    private let minimumRefreshInterval: TimeInterval
    private var isRefreshing = false

    init(
        mailService: OnDeviceMailService = OnDeviceMailService(),
        minimumRefreshInterval: TimeInterval = 90
    ) {
        self.mailService = mailService
        self.minimumRefreshInterval = minimumRefreshInterval
    }

    var tabBadgeCount: Int {
        unreadCount
    }

    var unreadSummaryText: String? {
        guard unreadCount > 0 else { return nil }
        return unreadCount == 1 ? "1 unread message" : "\(unreadCount) unread messages"
    }

    func refreshIfNeeded(hasCredentials: Bool, force: Bool = false) async {
        guard hasCredentials else {
            clear()
            return
        }
        guard force || shouldRefresh else { return }
        await refresh()
    }

    func refresh() async {
        guard !isRefreshing else { return }
        isRefreshing = true
        defer { isRefreshing = false }

        do {
            let inbox = try await mailService.fetchMailInbox(limit: 1)
            apply(unreadCount: inbox.unreadCount)
        } catch {
            syncAppIconBadge()
        }
    }

    func update(from inbox: MailInboxSummary) {
        guard inbox.mailbox == "INBOX" else { return }
        apply(unreadCount: inbox.unreadCount)
    }

    func update(from mailboxes: [MailboxSummary], fallbackInbox: MailInboxSummary? = nil) {
        if let inboxMailbox = mailboxes.first(where: { $0.name == "INBOX" }),
           let unreadCount = inboxMailbox.unreadCount {
            apply(unreadCount: unreadCount)
            return
        }
        if let fallbackInbox {
            update(from: fallbackInbox)
        }
    }

    func clear() {
        unreadCount = 0
        lastUpdatedAt = nil
        syncAppIconBadge()
    }

    private var shouldRefresh: Bool {
        guard !isRefreshing else { return false }
        guard let lastUpdatedAt else { return true }
        return Date().timeIntervalSince(lastUpdatedAt) >= minimumRefreshInterval
    }

    private func apply(unreadCount: Int) {
        self.unreadCount = max(0, unreadCount)
        lastUpdatedAt = Date()
        syncAppIconBadge()
    }

    private func syncAppIconBadge() {
        UNUserNotificationCenter.current().setBadgeCount(unreadCount) { _ in }
    }
}

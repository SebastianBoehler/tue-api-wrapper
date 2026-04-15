import SwiftUI

struct MailView: View {
    var model: AppModel

    @State private var phase: MailLoadPhase = .idle
    @State private var mailboxes: [MailboxSummary] = []
    @State private var inbox: MailInboxSummary?
    @State private var selectedMailbox = "INBOX"
    @State private var searchText = ""
    @State private var unreadOnly = false

    var body: some View {
        List {
            Section {
                statusContent
            }

            Section("Filters") {
                Picker("Mailbox", selection: $selectedMailbox) {
                    Text("Inbox").tag("INBOX")
                    ForEach(mailboxes.filter { $0.name != "INBOX" }) { mailbox in
                        Text(mailboxTitle(mailbox)).tag(mailbox.name)
                    }
                }

                Toggle("Unread only", isOn: $unreadOnly)

                TextField("Search subject, sender, preview", text: $searchText)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .submitLabel(.search)
                    .onSubmit {
                        Task { await refreshInbox() }
                    }

                Button {
                    Task { await refreshInbox() }
                } label: {
                    Label("Apply filters", systemImage: "line.3.horizontal.decrease.circle")
                }
                .disabled(phase.isLoading)
            }

            messagesSection
        }
        .navigationTitle("Mail")
        .navigationDestination(for: MailMessageSelection.self) { selection in
            MailMessageDetailView(model: model, selection: selection)
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    Task { await refreshAll() }
                } label: {
                    Label("Refresh", systemImage: "arrow.clockwise")
                }
                .disabled(phase.isLoading)
            }
        }
        .task {
            if inbox == nil {
                await refreshAll()
            }
        }
        .refreshable {
            await refreshAll()
        }
        .onChange(of: selectedMailbox) {
            Task { await refreshInbox() }
        }
        .onChange(of: unreadOnly) {
            Task { await refreshInbox() }
        }
    }

    @ViewBuilder
    private var statusContent: some View {
        switch phase {
        case .idle:
            StatusBanner(
                title: "Backend required",
                message: "The bundled backend URL is required to read mail through the shared backend.",
                systemImage: "server.rack"
            )
        case .loading:
            ProgressView("Loading mail")
        case .loaded(let date):
            StatusBanner(
                title: inboxTitle,
                message: "Updated \(date.formatted(date: .abbreviated, time: .shortened)). \(unreadText)",
                systemImage: "envelope.open"
            )
        case .unavailable:
            StatusBanner(
                title: "Backend unavailable",
                message: "The bundled backend URL is not available in this build.",
                systemImage: "exclamationmark.triangle"
            )
        case .failed(let message):
            StatusBanner(title: "Mail unavailable", message: message, systemImage: "exclamationmark.triangle")
        }
    }

    @ViewBuilder
    private var messagesSection: some View {
        Section("Messages") {
            if phase == .loading && inbox == nil {
                ForEach(0..<5, id: \.self) { _ in
                    MailSkeletonRow()
                }
                .redacted(reason: .placeholder)
            } else if let inbox, inbox.messages.isEmpty {
                ContentUnavailableView(
                    "No messages",
                    systemImage: unreadOnly ? "envelope.badge" : "tray",
                    description: Text("Change the mailbox or filters, then refresh.")
                )
            } else if let inbox {
                ForEach(inbox.messages) { message in
                    NavigationLink(value: MailMessageSelection(
                        uid: message.uid,
                        mailbox: inbox.mailbox,
                        subject: message.subject
                    )) {
                        MailMessageRow(message: message)
                    }
                }
            } else {
                ContentUnavailableView(
                    "Mail not loaded",
                    systemImage: "envelope",
                    description: Text("Refresh after the backend is available.")
                )
            }
        }
    }

    private var inboxTitle: String {
        guard let inbox else { return "Mail" }
        if let mailbox = mailboxes.first(where: { $0.name == inbox.mailbox }) {
            return mailbox.label
        }
        return inbox.mailbox
    }

    private var unreadText: String {
        guard let inbox else { return "" }
        return inbox.unreadCount == 1 ? "1 unread message." : "\(inbox.unreadCount) unread messages."
    }

    private func refreshAll() async {
        guard let client = BackendClient(baseURLString: model.portalAPIBaseURLString) else {
            phase = .unavailable
            return
        }

        phase = .loading
        do {
            async let mailboxFetch = client.fetchMailboxes()
            async let inboxFetch = client.fetchMailInbox(
                mailbox: selectedMailbox,
                query: searchText,
                unreadOnly: unreadOnly
            )
            let (fetchedMailboxes, fetchedInbox) = try await (mailboxFetch, inboxFetch)
            mailboxes = fetchedMailboxes
            inbox = fetchedInbox
            phase = .loaded(Date())
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    private func refreshInbox() async {
        guard let client = BackendClient(baseURLString: model.portalAPIBaseURLString) else {
            phase = .unavailable
            return
        }

        phase = .loading
        do {
            inbox = try await client.fetchMailInbox(
                mailbox: selectedMailbox,
                query: searchText,
                unreadOnly: unreadOnly
            )
            phase = .loaded(Date())
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    private func mailboxTitle(_ mailbox: MailboxSummary) -> String {
        if let unreadCount = mailbox.unreadCount, unreadCount > 0 {
            return "\(mailbox.label) (\(unreadCount))"
        }
        return mailbox.label
    }
}

private struct MailSkeletonRow: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Sender")
                .font(.subheadline)
            Text("Subject")
                .font(.headline)
            Text("Preview text for the message")
                .font(.footnote)
        }
        .padding(.vertical, 4)
    }
}

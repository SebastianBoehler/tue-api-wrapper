import SwiftUI

struct UniversityDirectoryResponseSections: View {
    let response: UniversityDirectorySearchResponse
    let client: UniversityDirectoryClient

    var body: some View {
        switch response.outcome {
        case .people(let page):
            ForEach(page.sections) { section in
                Section(section.title) {
                    ForEach(section.items) { item in
                        NavigationLink {
                            UniversityDirectoryActionDestinationView(
                                title: item.name,
                                query: response.query,
                                client: client,
                                form: page.form,
                                action: item.action
                            )
                        } label: {
                            UniversityDirectoryResultRow(title: item.name, subtitle: item.subtitle)
                        }
                    }
                }
            }
        case .person(let person):
            Section(person.name) {
                if let summary = person.summary {
                    Text(summary)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                ForEach(person.attributes) { field in
                    UniversityDirectoryFieldRow(field: field)
                }
            }

            ForEach(person.contactSections) { section in
                Section(section.title) {
                    ForEach(section.fields) { field in
                        UniversityDirectoryFieldRow(field: field)
                    }
                }
            }
        case .organizations(let page):
            Section(page.title) {
                ForEach(page.items) { item in
                    NavigationLink {
                        UniversityDirectoryActionDestinationView(
                            title: item.name,
                            query: response.query,
                            client: client,
                            form: page.form,
                            action: item.action
                        )
                    } label: {
                        Label(item.name, systemImage: "building.2")
                    }
                }
            }
        case .organization(let organization):
            Section(organization.name) {
                ForEach(organization.fields) { field in
                    UniversityDirectoryFieldRow(field: field)
                }
            }

            if let action = organization.personListAction {
                Section {
                    NavigationLink {
                        UniversityDirectoryActionDestinationView(
                            title: organization.name,
                            query: response.query,
                            client: client,
                            form: organization.form,
                            action: action
                        )
                    } label: {
                        Label("People in this institution", systemImage: "person.3")
                    }
                }
            }
        case .empty(let message):
            Section {
                ContentUnavailableView(
                    "No results",
                    systemImage: "person.crop.circle.badge.xmark",
                    description: Text(message)
                )
            }
        case .tooManyResults(let message):
            Section {
                ContentUnavailableView(
                    "Too many matches",
                    systemImage: "text.magnifyingglass",
                    description: Text(message)
                )
            }
        }
    }
}

private struct UniversityDirectoryResultRow: View {
    let title: String
    let subtitle: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.body.weight(.semibold))
                .foregroundStyle(.primary)
            if let subtitle {
                Text(subtitle)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
            }
        }
        .padding(.vertical, 2)
    }
}

private struct UniversityDirectoryFieldRow: View {
    let field: UniversityDirectoryField

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(field.label)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)

            if let url = field.linkURL {
                Link(field.value.replacingOccurrences(of: "\n", with: " "), destination: url)
                    .lineLimit(3)
            } else {
                Text(field.value)
                    .multilineTextAlignment(.leading)
                    .textSelection(.enabled)
            }
        }
        .padding(.vertical, 2)
    }
}

private struct UniversityDirectoryActionDestinationView: View {
    let title: String
    let query: String
    let client: UniversityDirectoryClient
    let form: UniversityHTMLForm
    let action: UniversityDirectoryPageAction

    @State private var phase: UniversityDirectoryDestinationPhase = .loading

    var body: some View {
        Group {
            switch phase {
            case .loading:
                ProgressView("Loading directory details")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            case .loaded(let response):
                List {
                    UniversityDirectoryResponseSections(response: response, client: client)
                }
            case .failed(let message):
                ContentUnavailableView(
                    "Directory unavailable",
                    systemImage: "exclamationmark.triangle",
                    description: Text(message)
                )
            }
        }
        .navigationTitle(displayTitle)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    Task { await load() }
                } label: {
                    Label("Refresh", systemImage: "arrow.clockwise")
                }
                .disabled(phase.isLoading)
            }
        }
        .task {
            if case .loading = phase {
                await load()
            }
        }
    }

    private var displayTitle: String {
        if case .loaded(let response) = phase {
            return response.title
        }
        return title
    }

    private func load() async {
        phase = .loading
        do {
            phase = .loaded(try await client.loadResult(for: action, from: form, query: query))
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }
}

private enum UniversityDirectoryDestinationPhase {
    case loading
    case loaded(UniversityDirectorySearchResponse)
    case failed(String)

    var isLoading: Bool {
        if case .loading = self {
            return true
        }
        return false
    }
}

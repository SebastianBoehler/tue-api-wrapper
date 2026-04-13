import SwiftUI

struct TalksView: View {
    @State private var talks: [Talk] = []
    @State private var phase: TalksLoadPhase = .idle
    @State private var scope: TalksScope = .upcoming
    @State private var query = ""

    private let client = TalksClient()

    private var filteredTalks: [Talk] {
        let trimmedQuery = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedQuery.isEmpty else {
            return talks
        }
        return talks.filter { talk in
            let haystack = [
                talk.title,
                talk.description ?? "",
                talk.location ?? "",
                talk.speakerName ?? "",
                talk.speakerBio ?? "",
                talk.tags.map(\.name).joined(separator: " ")
            ].joined(separator: "\n").localizedCaseInsensitiveContains(trimmedQuery)
            return haystack
        }
    }

    var body: some View {
        List {
            Section {
                Picker("Range", selection: $scope) {
                    ForEach(TalksScope.allCases) { scope in
                        Text(scope.label).tag(scope)
                    }
                }
                .pickerStyle(.segmented)
            }

            switch phase {
            case .failed(let message):
                Section {
                    StatusBanner(title: "Talks failed", message: message, systemImage: "exclamationmark.triangle")
                }
            case .loading where talks.isEmpty:
                Section {
                    HStack {
                        ProgressView()
                        Text("Loading talks")
                    }
                }
            case .loaded(let date, let count):
                Section {
                    StatusBanner(
                        title: "Talks updated",
                        message: "Loaded \(count) \(scope.label.lowercased()) talks at \(TalksDateParser.formattedDate(date)).",
                        systemImage: "checkmark.circle"
                    )
                }
            default:
                EmptyView()
            }

            Section {
                if filteredTalks.isEmpty {
                    ContentUnavailableView(
                        "No talks",
                        systemImage: "mic.slash",
                        description: Text(query.isEmpty ? "No talks were returned by the public calendar." : "No talks matched this search.")
                    )
                } else {
                    ForEach(filteredTalks) { talk in
                        NavigationLink {
                            TalkDetailView(talk: talk)
                        } label: {
                            TalkRow(talk: talk)
                        }
                    }
                }
            } header: {
                Text(scope.label)
            }
        }
        .navigationTitle("Talks")
        .searchable(text: $query, prompt: "Search talks")
        .refreshable {
            await refreshTalks()
        }
        .toolbar {
            Button {
                Task { await refreshTalks() }
            } label: {
                Label("Refresh", systemImage: "arrow.clockwise")
            }
            .disabled(phase == .loading)
        }
        .task {
            if talks.isEmpty {
                await refreshTalks()
            }
        }
        .onChange(of: scope) {
            Task { await refreshTalks() }
        }
    }

    private func refreshTalks() async {
        phase = .loading
        do {
            talks = try await client.fetchTalks(scope: scope, limit: 100)
            phase = .loaded(Date(), talks.count)
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }
}

private struct TalkRow: View {
    var talk: Talk

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(talk.title)
                .font(.headline)

            Text(talk.speakerName ?? talk.location ?? "Speaker pending")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            HStack {
                if let date = talk.startDate {
                    Label(TalksDateParser.formattedDate(date), systemImage: "calendar")
                }
                if let location = talk.location, !location.isEmpty {
                    Label(location, systemImage: "mappin.and.ellipse")
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)

            if !talk.tags.isEmpty {
                HStack {
                    ForEach(talk.tags) { tag in
                        Text(tag.name)
                            .font(.caption2.weight(.semibold))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(.thinMaterial, in: Capsule())
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
}

private struct TalkDetailView: View {
    var talk: Talk

    var body: some View {
        List {
            Section {
                LabeledContent("Speaker", value: talk.speakerName ?? "Speaker pending")
                if let date = talk.startDate {
                    LabeledContent("Time", value: TalksDateParser.formattedDate(date))
                }
                LabeledContent("Location", value: talk.location ?? "Location pending")
            }

            if !talk.tags.isEmpty {
                Section("Tags") {
                    ForEach(talk.tags) { tag in
                        Text(tag.name)
                    }
                }
            }

            if let bio = talk.speakerBio, !bio.isEmpty {
                Section("Speaker Bio") {
                    Text(bio)
                        .textSelection(.enabled)
                }
            }

            Section("Abstract") {
                Text(talk.description ?? "No abstract provided.")
                    .textSelection(.enabled)
            }

            if let sourceURL = talk.sourceURL {
                Section {
                    Link("Open original talk", destination: sourceURL)
                }
            }
        }
        .navigationTitle(talk.title)
        .navigationBarTitleDisplayMode(.inline)
    }
}

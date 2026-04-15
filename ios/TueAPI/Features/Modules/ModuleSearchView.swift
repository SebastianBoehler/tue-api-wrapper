import SwiftUI

struct ModuleSearchView: View {
    var model: AppModel

    @Environment(\.openURL) private var openURL
    @State private var filters: ModuleSearchFilters?
    @State private var response: ModuleSearchResponse?
    @State private var request = ModuleSearchRequest()
    @State private var phase: ModuleSearchPhase = .idle
    @State private var isSearching = false
    @FocusState private var isQueryFocused: Bool

    var body: some View {
        List {
            Section {
                statusContent
            }

            Section("Search") {
                TextField("Machine learning, ethics, statistics", text: $request.query)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .submitLabel(.search)
                    .focused($isQueryFocused)
                    .onSubmit(submitSearch)

                filterPicker("Degree", selection: $request.degree, options: filters?.degrees ?? [])
                filterPicker("Subject", selection: $request.subject, options: filters?.subjects ?? [])
                filterPicker("Course type", selection: $request.elementType, options: filters?.elementTypes ?? [])
                filterPicker("Language", selection: $request.language, options: filters?.languages ?? [])
                filterPicker("Faculty", selection: $request.faculty, options: filters?.faculties ?? [])

                HStack {
                    Button(action: submitSearch) {
                        HStack(spacing: 8) {
                            if isSearching {
                                ProgressView()
                                    .controlSize(.small)
                            } else {
                                Image(systemName: "magnifyingglass")
                            }
                            Text(isSearching ? "Searching modules" : "Search modules")
                        }
                    }
                    .disabled(!canSearch)

                    Spacer()

                    Button("Reset") {
                        request = ModuleSearchRequest()
                        response = nil
                        isSearching = false
                        phase = filters == nil ? .idle : .loaded(0, nil)
                    }
                    .disabled(isSearching || (!request.hasCriteria && response == nil))
                }
            }

            Section("Results") {
                resultsContent
            }
        }
        .navigationTitle("Modules")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    Task { await loadFilters(force: true) }
                } label: {
                    Label("Refresh filters", systemImage: "arrow.clockwise")
                }
                .disabled(phase == .loading)
            }
        }
        .task {
            await loadFilters(force: false)
        }
        .refreshable {
            await loadFilters(force: true)
            if request.hasCriteria {
                await search()
            }
        }
    }

    private var canSearch: Bool {
        request.hasCriteria && filters != nil && phase != .loading
    }

    @ViewBuilder
    private var statusContent: some View {
        switch phase {
        case .idle:
            StatusBanner(
                title: "Backend required",
                message: "The bundled backend URL is required to search Alma module descriptions.",
                systemImage: "server.rack"
            )
        case .loading:
            ProgressView(isSearching ? "Searching Alma modules" : "Loading Alma module filters")
        case .loaded(let returned, let total):
            StatusBanner(
                title: statusTitle(returned: returned, hasSearchResponse: response != nil),
                message: statusMessage(returned: returned, total: total, hasSearchResponse: response != nil),
                systemImage: "checkmark.circle"
            )
        case .unavailable:
            StatusBanner(
                title: "Backend unavailable",
                message: "The bundled backend URL is not available in this build.",
                systemImage: "exclamationmark.triangle"
            )
        case .failed(let message):
            StatusBanner(title: "Module search failed", message: message, systemImage: "exclamationmark.triangle")
        }
    }

    @ViewBuilder
    private var resultsContent: some View {
        if isSearching {
            ProgressView("Searching public Alma module descriptions")
        } else if let response, response.results.isEmpty {
            ContentUnavailableView(
                "No modules found",
                systemImage: "magnifyingglass",
                description: Text("Try a broader search term or fewer filters.")
            )
        } else if let response {
            if response.truncated {
                Text("Narrow the filters to see all matches.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            ForEach(response.results) { result in
                ModuleSearchResultRow(result: result) {
                    guard let detailURL = result.detailURL, let url = URL(string: detailURL) else { return }
                    openURL(url)
                }
            }
        } else {
            ContentUnavailableView(
                "No search yet",
                systemImage: "books.vertical",
                description: Text("Choose a degree, subject, course type, language, faculty, or enter a search term.")
            )
        }
    }

    private func submitSearch() {
        guard canSearch else { return }
        isQueryFocused = false
        Task { await search() }
    }

    private func filterPicker(
        _ title: String,
        selection: Binding<String?>,
        options: [ModuleSearchOption]
    ) -> some View {
        Picker(title, selection: selection) {
            Text("Any").tag(String?.none)
            ForEach(options) { option in
                Text(option.label).tag(String?.some(option.value))
            }
        }
    }

    private func loadFilters(force: Bool) async {
        if filters != nil && !force {
            return
        }
        guard let client = BackendClient(baseURLString: model.portalAPIBaseURLString) else {
            phase = .unavailable
            return
        }

        phase = .loading
        do {
            let payload = try await client.fetchModuleSearchFilters()
            filters = payload.filters
            phase = .loaded(response?.returnedResults ?? 0, response?.totalResults)
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    private func search() async {
        guard request.hasCriteria else {
            response = nil
            phase = filters == nil ? .idle : .loaded(0, nil)
            return
        }
        guard let client = BackendClient(baseURLString: model.portalAPIBaseURLString) else {
            phase = .unavailable
            return
        }

        phase = .loading
        isSearching = true
        do {
            let payload = try await client.searchModules(request)
            response = payload
            phase = .loaded(payload.returnedResults, payload.totalResults)
        } catch {
            response = nil
            phase = .failed(error.localizedDescription)
        }
        isSearching = false
    }

    private func statusTitle(returned: Int, hasSearchResponse: Bool) -> String {
        if !hasSearchResponse {
            return "Filters loaded"
        }
        return returned == 0 ? "No modules" : "\(returned) modules"
    }

    private func statusMessage(returned: Int, total: Int?, hasSearchResponse: Bool) -> String {
        if !hasSearchResponse {
            return "Public Alma module filters are ready, including degrees, subjects, course types, languages, and faculties."
        }
        if returned == 0 {
            return "No public Alma module-description matches for these criteria."
        }
        if let total {
            return "Showing \(returned) of \(total) public Alma module-description matches."
        }
        return "Showing \(returned) public Alma module-description matches."
    }
}

private struct ModuleSearchResultRow: View {
    var result: ModuleSearchResult
    var openDetail: () -> Void

    var body: some View {
        Button(action: openDetail) {
            VStack(alignment: .leading, spacing: 8) {
                Text(result.title)
                    .font(.headline)
                    .foregroundStyle(.primary)
                HStack(spacing: 12) {
                    if let number = result.number {
                        Label(number, systemImage: "number")
                    }
                    if let elementType = result.elementType {
                        Label(elementType, systemImage: "tag")
                    }
                    if result.detailURL != nil {
                        Label("Alma detail", systemImage: "arrow.up.forward.square")
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            .padding(.vertical, 4)
        }
        .buttonStyle(.plain)
        .disabled(result.detailURL == nil)
    }
}

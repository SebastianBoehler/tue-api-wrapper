import SwiftUI

struct CareerView: View {
    var model: AppModel

    @Environment(\.openURL) private var openURL
    @State private var phase: CareerLoadPhase = .idle
    @State private var filters: CareerSearchFilters?
    @State private var response: CareerSearchResponse?
    @State private var request = CareerSearchRequest()

    var body: some View {
        List {
            Section {
                statusContent
            }

            Section("Search") {
                TextField("Internship, thesis, working student", text: $request.query)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .submitLabel(.search)
                    .onSubmit {
                        Task { await search(resetPage: true) }
                    }

                filterPicker("Project type", selection: $request.projectTypeId, options: filters?.projectTypes ?? [])
                filterPicker("Industry", selection: $request.industryId, options: filters?.industries ?? [])

                HStack {
                    Button {
                        Task { await search(resetPage: true) }
                    } label: {
                        Label("Search", systemImage: "magnifyingglass")
                    }
                    .disabled(phase.isLoading)

                    Spacer()

                    Button("Reset") {
                        request = CareerSearchRequest()
                        Task { await search(resetPage: true) }
                    }
                    .disabled(phase.isLoading)
                }
            }

            resultsSection
        }
        .navigationTitle("Career")
        .navigationDestination(for: CareerProjectSelection.self) { selection in
            CareerProjectDetailView(model: model, selection: selection)
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
            if response == nil {
                await refreshAll()
            }
        }
        .refreshable {
            await refreshAll()
        }
    }

    @ViewBuilder
    private var statusContent: some View {
        switch phase {
        case .idle:
            StatusBanner(
                title: "Backend required",
                message: "The bundled backend URL is required to browse Praxisportal listings.",
                systemImage: "server.rack"
            )
        case .loading:
            ProgressView("Loading Praxisportal")
        case .loaded:
            StatusBanner(
                title: "Praxisportal",
                message: statusMessage,
                systemImage: "briefcase"
            )
        case .unavailable:
            StatusBanner(
                title: "Backend unavailable",
                message: "The bundled backend URL is not available in this build.",
                systemImage: "exclamationmark.triangle"
            )
        case .failed(let message):
            StatusBanner(title: "Career unavailable", message: message, systemImage: "exclamationmark.triangle")
        }
    }

    @ViewBuilder
    private var resultsSection: some View {
        Section("Open roles") {
            if phase == .loading && response == nil {
                ForEach(0..<5, id: \.self) { _ in
                    CareerSkeletonRow()
                }
                .redacted(reason: .placeholder)
            } else if let response, response.items.isEmpty {
                ContentUnavailableView.search(text: request.query)
            } else if let response {
                if let url = URL(string: response.sourceURL) {
                    Button {
                        openURL(url)
                    } label: {
                        Label("Open Praxisportal", systemImage: "arrow.up.forward.square")
                    }
                }

                ForEach(response.items) { item in
                    NavigationLink(value: CareerProjectSelection(id: item.id, title: item.title)) {
                        CareerProjectRow(project: item)
                    }
                }

                paginationControls(response)
            } else {
                ContentUnavailableView(
                    "No listings loaded",
                    systemImage: "briefcase",
                    description: Text("Refresh to load the newest internships, jobs, thesis topics, and working-student roles.")
                )
            }
        }
    }

    private var statusMessage: String {
        guard let response else {
            return "Search internships, thesis topics, jobs, and working-student roles."
        }
        let page = response.page + 1
        return "\(response.totalHits) live hits. Page \(page) of \(max(response.totalPages, 1))."
    }

    private func filterPicker(
        _ title: String,
        selection: Binding<Int?>,
        options: [CareerFacetOption]
    ) -> some View {
        Picker(title, selection: selection) {
            Text("Any").tag(Int?.none)
            ForEach(options) { option in
                Text("\(option.label) (\(option.count))").tag(Int?.some(option.id))
            }
        }
    }

    @ViewBuilder
    private func paginationControls(_ response: CareerSearchResponse) -> some View {
        if response.totalPages > 1 {
            HStack {
                Button {
                    Task { await goToPage(response.page - 1) }
                } label: {
                    Label("Previous", systemImage: "chevron.left")
                }
                .disabled(response.page <= 0 || phase.isLoading)

                Spacer()

                Text("\(response.page + 1) / \(response.totalPages)")
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                Spacer()

                Button {
                    Task { await goToPage(response.page + 1) }
                } label: {
                    Label("Next", systemImage: "chevron.right")
                }
                .disabled(response.page + 1 >= response.totalPages || phase.isLoading)
            }
            .id(response.page)
        }
    }

    private func refreshAll() async {
        guard let client = BackendClient(baseURLString: model.portalAPIBaseURLString) else {
            phase = .unavailable
            return
        }

        phase = .loading
        do {
            async let filtersFetch = client.fetchCareerFilters()
            async let searchFetch = client.searchCareerProjects(
                query: request.query,
                projectTypeId: request.projectTypeId,
                industryId: request.industryId,
                page: request.page,
                perPage: request.perPage
            )
            let (fetchedFilters, fetchedResponse) = try await (filtersFetch, searchFetch)
            filters = fetchedFilters
            applySearchResponse(fetchedResponse)
            phase = .loaded(Date())
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    private func search(resetPage: Bool) async {
        if resetPage {
            request.resetPage()
        }
        guard let client = BackendClient(baseURLString: model.portalAPIBaseURLString) else {
            phase = .unavailable
            return
        }

        phase = .loading
        do {
            let fetchedResponse = try await client.searchCareerProjects(
                query: request.query,
                projectTypeId: request.projectTypeId,
                industryId: request.industryId,
                page: request.page,
                perPage: request.perPage
            )
            applySearchResponse(fetchedResponse)
            phase = .loaded(Date())
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    private func goToPage(_ page: Int) async {
        request.page = max(page, 0)
        await search(resetPage: false)
    }

    private func applySearchResponse(_ fetchedResponse: CareerSearchResponse) {
        response = fetchedResponse
        request.page = fetchedResponse.page
        request.perPage = fetchedResponse.perPage
    }
}

private struct CareerSkeletonRow: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Project type")
                .font(.caption)
            Text("Career listing title")
                .font(.headline)
            Text("Organization · Location")
                .font(.subheadline)
            Text("Preview of the role description")
                .font(.footnote)
        }
        .padding(.vertical, 4)
    }
}

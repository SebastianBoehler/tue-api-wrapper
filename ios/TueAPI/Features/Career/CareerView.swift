import SwiftUI

struct CareerView: View {
    var model: AppModel

    private static let anyFilterID = -1

    @Environment(\.openURL) private var openURL
    @State private var phase: CareerLoadPhase = .idle
    @State private var filters: CareerSearchFilters?
    @State private var response: CareerSearchResponse?
    @State private var request = CareerSearchRequest()

    var body: some View {
        List {
            Section("Search") {
                TextField("Internship, thesis, working student", text: $request.query)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .submitLabel(.search)
                    .onSubmit {
                        Task { await search(resetPage: true) }
                    }

                filterPicker("Project type", selection: projectTypeSelection, options: filters?.projectTypes ?? [])
                filterPicker("Industry", selection: industrySelection, options: filters?.industries ?? [])

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
    private var phaseErrorContent: some View {
        switch phase {
        case .unavailable:
            StatusBanner(
                title: "Backend unavailable",
                message: "The bundled backend URL is not available in this build.",
                systemImage: "exclamationmark.triangle"
            )
        case .failed(let message):
            StatusBanner(title: "Career unavailable", message: message, systemImage: "exclamationmark.triangle")
        default:
            EmptyView()
        }
    }

    @ViewBuilder
    private var resultsSection: some View {
        Section("Open roles") {
            phaseErrorContent

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
            } else if !phaseHasError {
                ContentUnavailableView(
                    "No listings loaded",
                    systemImage: "briefcase",
                    description: Text("Refresh to load the newest internships, jobs, thesis topics, and working-student roles.")
                )
            }
        }
    }

    private var phaseHasError: Bool {
        switch phase {
        case .unavailable, .failed:
            true
        default:
            false
        }
    }

    private var projectTypeSelection: Binding<Int> {
        filterSelection(\.projectTypeId)
    }

    private var industrySelection: Binding<Int> {
        filterSelection(\.industryId)
    }

    private func filterSelection(_ keyPath: WritableKeyPath<CareerSearchRequest, Int?>) -> Binding<Int> {
        Binding {
            request[keyPath: keyPath] ?? Self.anyFilterID
        } set: { value in
            request[keyPath: keyPath] = value == Self.anyFilterID ? nil : value
        }
    }

    private func filterPicker(
        _ title: String,
        selection: Binding<Int>,
        options: [CareerFacetOption]
    ) -> some View {
        Picker(title, selection: selection) {
            Text("Any").tag(Self.anyFilterID)
            ForEach(options) { option in
                Text("\(option.label) (\(option.count))").tag(option.id)
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

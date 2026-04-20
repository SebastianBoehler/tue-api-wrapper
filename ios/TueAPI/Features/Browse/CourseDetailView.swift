import SwiftUI

struct CourseDetailView: View {
    var model: AppModel
    var course: CourseDetailReference
    @State private var portalStatusPhase: PortalStatusPhase = .idle

    init(lecture: AlmaCurrentLecture, model: AppModel) {
        self.model = model
        self.course = CourseDetailReference(lecture: lecture)
    }

    init(event: LectureEvent, model: AppModel) {
        self.model = model
        self.course = CourseDetailReference(event: event)
    }

    var body: some View {
        List {
            Section("Course") {
                VStack(alignment: .leading, spacing: 8) {
                    Text(course.title)
                        .font(.headline)
                    if let subtitle {
                        Text(subtitle)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                if let number = course.number {
                    LabeledContent("Shared lookup", value: number)
                }
                if let semester = course.semester {
                    LabeledContent("Semester", value: semester)
                }
            }

            Section("Signup status") {
                portalStatusContent
            }

            CourseCriticalActionsView(model: model, course: course)

            if course.location?.nilIfEmpty != nil {
                Section("Quick navigation") {
                    CourseNavigationActions(course: course)
                }
            }

            Section("Portals") {
                if let detailURL = course.detailURL {
                    Link(destination: detailURL) {
                        Label("Open Alma detail", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
                if let searchURL = iliasSearchURL {
                    Link(destination: searchURL) {
                        Label(iliasSearchLabel, systemImage: "magnifyingglass")
                    }
                }
                if let iliasQuery {
                    LabeledContent("ILIAS query", value: iliasQuery)
                }
            }

            if let timeRange = course.timeRange {
                Section("Schedule") {
                    LabeledContent("Time", value: timeRange)
                }
            }

            Section("Teaching") {
                if let eventType = course.eventType {
                    LabeledContent("Type", value: eventType)
                }
                if let lecturer = course.lecturer {
                    LabeledContent("Lecturer", value: lecturer)
                }
                if let location = course.location {
                    LabeledContent("Location", value: location)
                }
                if let remark = course.remark {
                    Text(remark)
                        .font(.subheadline)
                }
                if course.eventType == nil, course.lecturer == nil, course.location == nil, course.remark == nil {
                    Text("No teaching metadata is available for this calendar entry.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            if let sourceDetail = course.sourceDetail {
                Section("Alma calendar detail") {
                    Text(sourceDetail)
                        .font(.subheadline)
                }
            }
        }
        .navigationTitle("Course Detail")
        .task(id: statusLookupID) {
            await loadPortalStatuses()
        }
    }

    private var subtitle: String? {
        [course.eventType, course.lecturer]
            .compactMap { $0 }
            .joined(separator: " · ")
            .nilIfEmpty
    }

    private var iliasQuery: String? {
        (course.number ?? course.title).nilIfEmpty
    }

    private var iliasSearchLabel: String {
        course.number == nil ? "Search ILIAS by title" : "Search ILIAS by course code"
    }

    private var iliasSearchURL: URL? {
        guard let iliasQuery else { return nil }
        var components = URLComponents()
        components.scheme = "https"
        components.host = "ovidius.uni-tuebingen.de"
        components.path = "/ilias.php"
        components.queryItems = [
            URLQueryItem(name: "baseClass", value: "ilSearchControllerGUI"),
            URLQueryItem(name: "term", value: iliasQuery)
        ]
        return components.url
    }

    @ViewBuilder
    private var portalStatusContent: some View {
        switch portalStatusPhase {
        case .idle, .loading:
            ProgressView("Loading portal status")
        case .unavailable(let message):
            StatusBanner(title: "Status lookup unavailable", message: message, systemImage: "network.slash")
        case .failed(let message):
            StatusBanner(title: "Status lookup failed", message: message, systemImage: "exclamationmark.triangle")
        case .loaded(let statuses):
            if statuses.isEmpty {
                Text("No portal status was returned.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(statuses) { status in
                    PortalStatusRow(status: status)
                }
            }
        }
    }

    private var statusLookupID: String {
        [
            model.portalAPIBaseURLString,
            course.id,
            course.detailURL?.absoluteString ?? "",
            course.title
        ].joined(separator: "|")
    }

    private func loadPortalStatuses() async {
        let backend = model.portalAPIBaseURLString.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !backend.isEmpty else {
            portalStatusPhase = .unavailable("The bundled backend URL is required to check Alma, ILIAS, and Moodle.")
            return
        }
        guard let baseURL = URL(string: backend),
              ["http", "https"].contains(baseURL.scheme?.lowercased() ?? "") else {
            portalStatusPhase = .failed("The portal status backend URL is invalid.")
            return
        }
        guard let url = courseStatusURL(baseURL: baseURL) else {
            portalStatusPhase = .failed("Could not build the portal status request.")
            return
        }

        portalStatusPhase = .loading
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard let httpResponse = response as? HTTPURLResponse else {
                throw PortalStatusError.server("The backend did not return an HTTP response.")
            }
            guard (200..<300).contains(httpResponse.statusCode) else {
                let detail = BackendClient.errorDetail(from: data)
                let suffix = detail.map { ": \($0)" } ?? "."
                throw PortalStatusError.server("The backend returned HTTP \(httpResponse.statusCode)\(suffix)")
            }
            let payload = try JSONDecoder().decode(CoursePortalStatusPayload.self, from: data)
            portalStatusPhase = .loaded(payload.portalStatuses)
        } catch {
            portalStatusPhase = .failed(error.localizedDescription)
        }
    }

    private func courseStatusURL(baseURL: URL) -> URL? {
        var components = URLComponents(
            url: baseURL.appending(path: "api/course-detail"),
            resolvingAgainstBaseURL: false
        )
        var items: [URLQueryItem] = []
        if let detailURL = course.detailURL {
            items.append(URLQueryItem(name: "url", value: detailURL.absoluteString))
        } else {
            items.append(URLQueryItem(name: "title", value: course.title))
        }
        if let semester = course.semester {
            items.append(URLQueryItem(name: "term", value: semester))
        }
        components?.queryItems = items
        return components?.url
    }
}

private extension String {
    var nilIfEmpty: String? {
        let value = trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : value
    }
}

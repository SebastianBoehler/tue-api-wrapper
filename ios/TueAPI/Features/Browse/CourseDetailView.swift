import SwiftUI

struct CourseDetailView: View {
    var course: CourseDetailReference

    init(lecture: AlmaCurrentLecture) {
        self.course = CourseDetailReference(lecture: lecture)
    }

    init(event: LectureEvent) {
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

            Section("Portals") {
                if let detailURL = course.detailURL {
                    Link(destination: detailURL) {
                        Label("Open Alma detail", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
                if let searchURL = iliasSearchURL {
                    Link(destination: searchURL) {
                        Label("Search ILIAS", systemImage: "magnifyingglass")
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
}

private extension String {
    var nilIfEmpty: String? {
        let value = trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : value
    }
}

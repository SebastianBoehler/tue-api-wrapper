import SwiftUI

struct BrowseLecturesView: View {
    var model: AppModel
    @State private var selectedDate = Date()
    @State private var query = ""

    var body: some View {
        List {
            Section("Search day") {
                DatePicker("Date", selection: $selectedDate, displayedComponents: .date)
                Button {
                    Task { await model.browseCurrentLectures(on: selectedDate) }
                } label: {
                    Label("Load lectures", systemImage: "magnifyingglass")
                }
                .disabled(model.browsePhase == .loading)
            }

            Section {
                browseStatus
            }

            Section("Lectures") {
                if model.browseLectures.isEmpty {
                    ContentUnavailableView(
                        "No lectures loaded",
                        systemImage: "list.bullet.rectangle",
                        description: Text("Choose a date and load Alma's current lectures.")
                    )
                } else if filteredLectures.isEmpty {
                    ContentUnavailableView.search(text: query)
                } else {
                    ForEach(filteredLectures) { lecture in
                        AlmaCurrentLectureRow(lecture: lecture)
                    }
                }
            }
        }
        .navigationTitle("Browse")
        .searchable(text: $query, prompt: "Filter title, room, lecturer")
        .refreshable {
            await model.browseCurrentLectures(on: selectedDate)
        }
    }

    private var filteredLectures: [AlmaCurrentLecture] {
        let needle = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !needle.isEmpty else { return model.browseLectures }
        return model.browseLectures.filter { lecture in
            lecture.searchText.localizedCaseInsensitiveContains(needle)
        }
    }

    @ViewBuilder
    private var browseStatus: some View {
        switch model.browsePhase {
        case .idle:
            StatusBanner(
                title: "Ready",
                message: "Browse public Alma lectures directly from the university endpoint.",
                systemImage: "network"
            )
        case .loading:
            ProgressView("Loading Alma lectures")
        case .loaded(let date, let count):
            StatusBanner(
                title: "\(count) lectures",
                message: date.map { "Alma returned results for \($0)." } ?? "Alma returned current lecture results.",
                systemImage: "checkmark.circle"
            )
        case .failed(let message):
            StatusBanner(title: "Browse failed", message: message, systemImage: "exclamationmark.triangle")
        }
    }
}

private struct AlmaCurrentLectureRow: View {
    var lecture: AlmaCurrentLecture

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(lecture.title)
                .font(.headline)
            if let timeRange = lecture.timeRange {
                Text(timeRange)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            if let lecturer = lecture.lecturer ?? lecture.responsibleLecturer {
                Label(lecturer, systemImage: "person")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            if let location = lecture.location {
                Label(location, systemImage: "mappin.and.ellipse")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            footer
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private var footer: some View {
        HStack(spacing: 12) {
            if let eventType = lecture.eventType {
                Text(eventType)
            }
            if let semester = lecture.semester {
                Text(semester)
            }
            if let detailURL = lecture.detailURL {
                Link("Details", destination: detailURL)
            }
        }
        .font(.caption)
        .foregroundStyle(.secondary)

        if let remark = lecture.remark {
            Text(remark)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}

private extension AlmaCurrentLecture {
    var timeRange: String? {
        switch (start, end) {
        case (.some(let start), .some(let end)):
            "\(start)-\(end)"
        case (.some(let start), .none):
            start
        default:
            nil
        }
    }

    var location: String? {
        [building, room]
            .compactMap { $0?.nilIfEmpty }
            .joined(separator: ", ")
            .nilIfEmpty
    }

    var searchText: String {
        [
            title,
            start,
            end,
            number,
            parallelGroup,
            eventType,
            responsibleLecturer,
            lecturer,
            building,
            room,
            semester,
            remark
        ]
        .compactMap { $0?.nilIfEmpty }
        .joined(separator: " ")
    }
}

private extension String {
    var nilIfEmpty: String? {
        isEmpty ? nil : self
    }
}

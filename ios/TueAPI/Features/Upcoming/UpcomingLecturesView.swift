import SwiftUI

struct UpcomingLecturesView: View {
    var model: AppModel

    var body: some View {
        List {
            Section {
                statusContent
            }

            if let event = model.events.first {
                Section("Live Activity") {
                    Button("Start for next lecture") {
                        model.startLiveActivity(for: event)
                    }
                    Button("End live activities", role: .destructive) {
                        Task { await model.endLiveActivities() }
                    }
                    if let message = model.liveActivityMessage {
                        Text(message)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Section("Next lectures") {
                if model.events.isEmpty {
                    ContentUnavailableView(
                        "No cached lectures",
                        systemImage: "calendar.badge.exclamationmark",
                        description: Text("Save credentials, then refresh Alma to cache upcoming timetable entries.")
                    )
                } else {
                    ForEach(model.events) { event in
                        NavigationLink(value: event) {
                            LectureEventRow(event: event)
                        }
                    }
                }
            }
        }
        .navigationTitle("TUE API")
        .navigationDestination(for: LectureEvent.self) { event in
            CourseDetailView(event: event)
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    Task { await model.refreshUpcomingLectures() }
                } label: {
                    Label("Refresh", systemImage: "arrow.clockwise")
                }
                .disabled(model.phase == .loading)
            }
        }
        .refreshable {
            await model.refreshUpcomingLectures()
        }
    }

    @ViewBuilder
    private var statusContent: some View {
        switch model.phase {
        case .idle:
            StatusBanner(
                title: model.hasCredentials ? "Ready for Alma" : "Credentials needed",
                message: model.hasCredentials
                    ? statusMessage("Refresh to fetch the current Alma timetable directly.")
                    : "Store your university login in Keychain before refreshing.",
                systemImage: model.hasCredentials ? "checkmark.seal" : "key"
            )
        case .loading:
            ProgressView("Refreshing Alma timetable")
        case .loaded(let date, let term):
            StatusBanner(
                title: "Updated",
                message: statusMessage(
                    "\(term) refreshed \(date.formatted(date: .abbreviated, time: .shortened)). Widgets were reloaded."
                ),
                systemImage: "calendar.badge.clock"
            )
        case .failed(let message):
            StatusBanner(title: "Refresh failed", message: message, systemImage: "exclamationmark.triangle")
        }
    }

    private func statusMessage(_ base: String) -> String {
        guard let semesterCredits = model.semesterCredits else {
            return base
        }
        return "\(base) \(semesterCredits.displayText)."
    }
}

struct LectureEventRow: View {
    var event: LectureEvent

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(event.title)
                .font(.headline)
            Text(event.timeRangeText)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            if let location = event.location, !location.isEmpty {
                Label(location, systemImage: "mappin.and.ellipse")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

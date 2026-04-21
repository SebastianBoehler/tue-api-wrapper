import SwiftUI

struct TodayView: View {
    var model: AppModel

    @State private var kufOccupancy: KufTrainingOccupancy?
    @State private var kufError: String?
    @State private var isLoadingKuf = false

    private var nextLecture: LectureEvent? {
        model.events.first
    }

    private var visibleDeadlines: [MoodleDeadline] {
        Array(model.deadlines.prefix(2))
    }

    private var visibleTasks: [IliasTask] {
        Array(model.tasks.prefix(max(0, 3 - visibleDeadlines.count)))
    }

    var body: some View {
        List {
            Section {
                TodayHeader(model: model, kufOccupancy: kufOccupancy)
            }

            nextUpSection
            toDoSection
            studySection
            campusSection
        }
        .navigationTitle("Today")
        .navigationDestination(for: LectureEvent.self) { event in
            CourseDetailView(event: event, model: model)
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    Task { await refreshToday() }
                } label: {
                    Label("Refresh", systemImage: "arrow.clockwise")
                }
                .disabled(model.phase == .loading || isLoadingKuf)
            }
        }
        .task {
            await loadAmbientDataIfNeeded()
        }
        .refreshable {
            await refreshToday()
        }
    }

    @ViewBuilder
    private var nextUpSection: some View {
        Section("Next up") {
            if let nextLecture {
                NavigationLink(value: nextLecture) {
                    TodayLectureRow(event: nextLecture)
                }
            } else {
                ContentUnavailableView(
                    "No upcoming lecture",
                    systemImage: "calendar.badge.exclamationmark",
                    description: Text(model.hasCredentials ? "Refresh Alma to load your timetable." : "Save credentials in Settings, then refresh Alma.")
                )
            }
        }
    }

    @ViewBuilder
    private var toDoSection: some View {
        Section("To do") {
            if model.tasksPhase == .loading && model.deadlines.isEmpty && model.tasks.isEmpty {
                ProgressView("Loading tasks")
            } else if visibleDeadlines.isEmpty && visibleTasks.isEmpty {
                ContentUnavailableView(
                    "Nothing urgent",
                    systemImage: "checkmark.circle",
                    description: Text("No actionable Moodle deadlines or ILIAS tasks are visible.")
                )
            } else {
                ForEach(visibleDeadlines) { deadline in
                    StudyDeadlineRow(deadline: deadline)
                }
                ForEach(visibleTasks) { task in
                    StudyIliasTaskRow(task: task)
                }
                NavigationLink("Open all tasks") {
                    StudyTasksView(model: model)
                }
            }
        }
    }

    private var studySection: some View {
        Section("Study") {
            if let semesterCredits = model.semesterCredits {
                LabeledContent("Saved semester", value: semesterCredits.displayText)
            } else {
                LabeledContent("Saved semester", value: "Not loaded")
            }
            LabeledContent("Cached lectures", value: "\(model.events.count)")
            NavigationLink("Open grades") {
                GradeOverviewView(model: model)
            }
            NavigationLink("Search courses") {
                CoursesView(model: model)
            }
        }
    }

    @ViewBuilder
    private var campusSection: some View {
        Section("Campus") {
            HStack {
                Label("KuF occupancy", systemImage: "dumbbell")
                Spacer()
                kufValue
            }
            NavigationLink("Campus map") {
                CampusMapView()
            }
            NavigationLink("Talks and events") {
                TalksView()
            }
        }
    }

    @ViewBuilder
    private var kufValue: some View {
        if isLoadingKuf {
            ProgressView()
        } else if let kufOccupancy {
            Text("\(kufOccupancy.count)")
                .font(.headline)
        } else {
            Text(kufError ?? "Unavailable")
                .foregroundStyle(.secondary)
        }
    }

    private func loadAmbientDataIfNeeded() async {
        if model.tasksPhase == .idle {
            await model.refreshTasks()
        }
        if kufOccupancy == nil && kufError == nil {
            await refreshKuf()
        }
    }

    private func refreshToday() async {
        await model.refreshUpcomingLectures()
        await model.refreshTasks()
        await refreshKuf()
    }

    private func refreshKuf() async {
        isLoadingKuf = true
        defer { isLoadingKuf = false }

        guard let client = KufOccupancyClient() else {
            kufError = "Backend unavailable"
            return
        }

        do {
            kufOccupancy = try await client.fetchOccupancy()
            kufError = nil
        } catch {
            kufError = error.localizedDescription
        }
    }
}

private struct TodayHeader: View {
    var model: AppModel
    var kufOccupancy: KufTrainingOccupancy?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Your university day")
                .font(.title2.weight(.semibold))
            Text(summaryText)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: 10) {
                TodayMetricTile(title: "Lectures", value: "\(model.events.count)", systemImage: "calendar")
                TodayMetricTile(title: "Tasks", value: "\(model.tasks.count + model.deadlines.count)", systemImage: "checklist")
                TodayMetricTile(title: "Credits", value: creditsText, systemImage: "graduationcap")
                TodayMetricTile(title: "KuF", value: kufOccupancy.map { "\($0.count)" } ?? "-", systemImage: "dumbbell")
            }
        }
        .padding(.vertical, 6)
    }

    private var summaryText: String {
        if model.hasCredentials {
            return "Timetable, tasks, study status, campus signals, and mail are one tap away."
        }
        return "Start by saving your university credentials in Settings."
    }

    private var creditsText: String {
        guard let semesterCredits = model.semesterCredits else {
            return "-"
        }
        return semesterCredits.totalCredits.rounded() == semesterCredits.totalCredits
            ? "\(Int(semesterCredits.totalCredits))"
            : String(format: "%.1f", semesterCredits.totalCredits)
    }
}

private struct TodayMetricTile: View {
    var title: String
    var value: String
    var systemImage: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: systemImage)
                .foregroundStyle(.tint)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(value)
                    .font(.headline)
            }
            Spacer(minLength: 0)
        }
        .padding(10)
        .background(Color.secondary.opacity(0.08), in: RoundedRectangle(cornerRadius: 8))
    }
}

private struct TodayLectureRow: View {
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
        .padding(.vertical, 3)
    }
}

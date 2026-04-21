import SwiftUI

struct StudyTasksView: View {
    var model: AppModel

    var body: some View {
        List {
            Section {
                statusContent
            }

            deadlinesSection
            tasksSection
        }
        .navigationTitle("Tasks")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    Task { await model.refreshTasks() }
                } label: {
                    Label("Refresh", systemImage: "arrow.clockwise")
                }
                .disabled(model.tasksPhase == .loading)
            }
        }
        .task {
            if model.tasksPhase == .idle {
                await model.refreshTasks()
            }
        }
        .refreshable {
            await model.refreshTasks()
        }
    }

    @ViewBuilder
    private var statusContent: some View {
        switch model.tasksPhase {
        case .idle:
            StatusBanner(
                title: "Tasks ready",
                message: "Refresh to load ILIAS tasks and Moodle deadlines from your university account.",
                systemImage: "checklist"
            )
        case .loading:
            ProgressView("Loading study tasks")
        case .loaded(let date):
            StatusBanner(
                title: "Tasks updated",
                message: "Updated \(date.formatted(date: .abbreviated, time: .shortened)).",
                systemImage: "checkmark.circle"
            )
        case .unavailable:
            StatusBanner(
                title: "Tasks unavailable",
                message: "Save university credentials before loading tasks.",
                systemImage: "key"
            )
        case .failed(let message):
            StatusBanner(title: "Tasks failed", message: message, systemImage: "exclamationmark.triangle")
        }
    }

    @ViewBuilder
    private var deadlinesSection: some View {
        Section("Deadlines") {
            if model.tasksPhase == .loading && model.deadlines.isEmpty {
                ForEach(0..<3, id: \.self) { _ in
                    StudyDeadlineSkeletonRow()
                }
            } else if model.deadlines.isEmpty {
                ContentUnavailableView(
                    "No deadlines",
                    systemImage: "calendar.badge.checkmark",
                    description: Text("No actionable Moodle deadlines are visible right now.")
                )
            } else {
                ForEach(model.deadlines) { deadline in
                    StudyDeadlineRow(deadline: deadline)
                }
            }
        }
    }

    @ViewBuilder
    private var tasksSection: some View {
        Section("ILIAS tasks") {
            if model.tasksPhase == .loading && model.tasks.isEmpty {
                ForEach(0..<3, id: \.self) { _ in
                    StudyIliasTaskSkeletonRow()
                }
            } else if model.tasks.isEmpty {
                ContentUnavailableView(
                    "No ILIAS tasks",
                    systemImage: "checklist",
                    description: Text("No current task rows are visible in ILIAS.")
                )
            } else {
                ForEach(model.tasks) { task in
                    StudyIliasTaskRow(task: task)
                }
            }
        }
    }
}

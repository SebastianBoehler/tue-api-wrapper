import SwiftUI

struct GradeOverviewView: View {
    var model: AppModel

    @Environment(\.openURL) private var openURL
    @State private var phase: GradeLoadPhase = .idle
    @State private var payload: GradeOverviewPayload?

    var body: some View {
        List {
            Section {
                statusContent
            }

            if let payload {
                summarySection(payload)
                almaSection(payload)
                moodleSection(payload.moodleGrades)
                enrollmentSection(payload.enrollment)
            } else if phase != .loading {
                Section {
                    ContentUnavailableView(
                        "Grades not loaded",
                        systemImage: "graduationcap",
                        description: Text("Refresh to load Alma exam records and Moodle grade rows.")
                    )
                }
            }
        }
        .navigationTitle("Grades")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    Task { await refresh() }
                } label: {
                    Label("Refresh", systemImage: "arrow.clockwise")
                }
                .disabled(phase.isLoading)
            }
        }
        .task {
            if payload == nil {
                await refresh()
            }
        }
        .refreshable {
            await refresh()
        }
    }

    @ViewBuilder
    private var statusContent: some View {
        switch phase {
        case .idle:
            StatusBanner(
                title: "Backend required",
                message: "Grades are loaded from the authenticated backend used by the web progress page.",
                systemImage: "server.rack"
            )
        case .loading:
            ProgressView("Loading grades")
        case .loaded(let date):
            StatusBanner(
                title: "Grades refreshed",
                message: "Updated \(date.formatted(date: .abbreviated, time: .shortened)).",
                systemImage: "graduationcap"
            )
        case .unavailable:
            StatusBanner(
                title: "Backend unavailable",
                message: "The bundled backend URL is not available in this build.",
                systemImage: "exclamationmark.triangle"
            )
        case .failed(let message):
            StatusBanner(title: "Grades unavailable", message: message, systemImage: "exclamationmark.triangle")
        }
    }

    private func summarySection(_ payload: GradeOverviewPayload) -> some View {
        let stats = GradeOverviewStats(exams: payload.exams)
        return Section("Summary") {
            LabeledContent("Selected term", value: payload.enrollment.selectedTerm ?? "-")
            LabeledContent("Passed exams", value: "\(stats.passedExamCount)")
            LabeledContent("Tracked credits", value: creditsText(stats.trackedCredits))
            LabeledContent("Graded records", value: "\(stats.graded.count)")
            LabeledContent("Pending records", value: "\(stats.pending.count)")
        }
    }

    @ViewBuilder
    private func almaSection(_ payload: GradeOverviewPayload) -> some View {
        let stats = GradeOverviewStats(exams: payload.exams)

        Section("Graded Alma records") {
            if stats.graded.isEmpty {
                ContentUnavailableView(
                    "No graded records",
                    systemImage: "doc.text.magnifyingglass",
                    description: Text("No Alma rows with explicit grades were visible.")
                )
            } else {
                ForEach(stats.graded) { exam in
                    GradeRecordRow(exam: exam)
                }
            }
        }

        Section("Pending Alma records") {
            if stats.pending.isEmpty {
                ContentUnavailableView(
                    "No pending records",
                    systemImage: "checkmark.circle",
                    description: Text("Every visible Alma row has an explicit grade.")
                )
            } else {
                ForEach(stats.pending) { exam in
                    GradeRecordRow(exam: exam)
                }
            }
        }
    }

    @ViewBuilder
    private func moodleSection(_ response: MoodleGradesResponse) -> some View {
        Section("Moodle grades") {
            if let url = URL(string: response.sourceURL) {
                Button {
                    openURL(url)
                } label: {
                    Label("Open Moodle grades", systemImage: "arrow.up.forward.square")
                }
            }

            if response.items.isEmpty {
                ContentUnavailableView(
                    "No Moodle grades",
                    systemImage: "graduationcap",
                    description: Text("No Moodle grade rows were visible for this account.")
                )
            } else {
                ForEach(response.items) { grade in
                    if let urlString = grade.url, let url = URL(string: urlString) {
                        Button {
                            openURL(url)
                        } label: {
                            MoodleGradeRow(grade: grade)
                        }
                        .buttonStyle(.plain)
                    } else {
                        MoodleGradeRow(grade: grade)
                    }
                }
            }
        }
    }

    private func enrollmentSection(_ enrollment: AlmaEnrollmentState) -> some View {
        Section("Enrollment") {
            Text(enrollment.message?.trimmedOrNil ?? "No Alma enrollment message was exposed.")
                .font(.body)
                .textSelection(.enabled)
        }
    }

    private func refresh() async {
        guard let client = BackendClient(baseURLString: model.portalAPIBaseURLString) else {
            phase = .unavailable
            return
        }

        phase = .loading
        do {
            async let enrollmentFetch = client.fetchAlmaEnrollment()
            async let examsFetch = client.fetchAlmaExams(limit: 50)
            async let moodleGradesFetch = client.fetchMoodleGrades(limit: 50)
            let (enrollment, exams, moodleGrades) = try await (
                enrollmentFetch,
                examsFetch,
                moodleGradesFetch
            )
            let refreshedAt = Date()
            payload = GradeOverviewPayload(
                enrollment: enrollment,
                exams: exams,
                moodleGrades: moodleGrades,
                refreshedAt: refreshedAt
            )
            phase = .loaded(refreshedAt)
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    private func creditsText(_ value: Double) -> String {
        String(format: "%.1f", value)
    }
}

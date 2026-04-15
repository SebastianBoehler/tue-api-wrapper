import SwiftUI

struct CourseCriticalActionsView: View {
    var model: AppModel
    var course: CourseDetailReference

    @State private var phase: CriticalActionLoadPhase = .idle
    @State private var intent: CriticalActionIntent?
    @State private var actionError: String?

    var body: some View {
        if course.detailURL != nil {
            Section("Actions") {
                Button {
                    Task { await prepareAlmaRegistration() }
                } label: {
                    if phase == .preparing {
                        ProgressView()
                    } else {
                        Label("Prepare Alma registration", systemImage: "person.badge.plus")
                    }
                }
                .disabled(phase.isBusy)

                actionStatus
            }
            .sheet(item: $intent) { intent in
                CriticalActionConfirmationSheet(
                    intent: intent,
                    isSubmitting: phase == .submitting,
                    errorMessage: actionError,
                    proceed: {
                        Task { await submit(intent) }
                    },
                    cancel: {
                        self.intent = nil
                        actionError = nil
                        phase = .idle
                    }
                )
            }
        }
    }

    @ViewBuilder
    private var actionStatus: some View {
        switch phase {
        case .failed(let message):
            StatusBanner(title: "Action unavailable", message: message, systemImage: "exclamationmark.triangle")
        case .completed(let message):
            StatusBanner(title: "Action submitted", message: message, systemImage: "checkmark.circle")
        default:
            EmptyView()
        }
    }

    private func prepareAlmaRegistration() async {
        actionError = nil
        phase = .preparing

        guard let detailURL = course.detailURL else {
            phase = .failed("This course does not expose an Alma detail URL.")
            return
        }
        guard let client = BackendClient(baseURLString: model.portalAPIBaseURLString) else {
            phase = .failed("The bundled backend URL is required before preparing critical actions.")
            return
        }

        do {
            let support = try await client.fetchAlmaCourseRegistrationSupport(detailURL: detailURL)
            guard support.supported else {
                phase = .failed(support.message ?? "This Alma detail page does not expose registration.")
                return
            }

            intent = CriticalActionIntent(
                kind: .almaCourseRegistration,
                portal: "Alma",
                title: support.title ?? course.title,
                actionLabel: "Register for Alma course",
                targetURL: URL(string: support.detailURL),
                endpoint: "/api/alma/course-registration",
                method: "POST",
                sideEffects: [
                    "Submits a course-registration request for your signed-in university account.",
                    "Uses this Alma detail page as the registration target.",
                    "If Alma exposes multiple registration paths, the backend stops and reports that a path must be selected."
                ],
                requiredInputs: support.status.map { ["Current Alma status: \($0)"] } ?? [],
                confirmButtonTitle: "Proceed with registration"
            )
            phase = .ready
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    private func submit(_ intent: CriticalActionIntent) async {
        guard let client = BackendClient(baseURLString: model.portalAPIBaseURLString) else {
            actionError = "The bundled backend URL is required before submitting critical actions."
            return
        }
        guard intent.kind == .almaCourseRegistration, let targetURL = intent.targetURL else {
            actionError = "This action intent is incomplete. Prepare it again."
            return
        }

        phase = .submitting
        do {
            let result = try await client.registerForAlmaCourse(detailURL: targetURL)
            self.intent = nil
            actionError = nil
            phase = .completed(result.displayMessage)
        } catch {
            actionError = error.localizedDescription
            phase = .ready
        }
    }
}

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

        do {
            let (client, credentials) = try model.almaAccessContext(for: "prepare Alma registration")
            let support = try await client.inspectCourseRegistration(
                detailURL: detailURL,
                credentials: credentials
            )
            guard support.supported else {
                phase = .failed(support.message ?? "This Alma detail page does not expose registration.")
                return
            }
            let options = try await client.prepareCourseRegistration(
                detailURL: detailURL,
                credentials: credentials
            )
            guard options.options.count == 1 else {
                phase = .failed(
                    "Multiple Alma registration paths are available for this course. Open Alma directly to choose one."
                )
                return
            }

            intent = CriticalActionIntent(
                kind: .almaCourseRegistration,
                portal: "Alma",
                title: course.title,
                actionLabel: "Register for Alma course",
                targetURL: options.detailURL,
                endpoint: "Authenticated Alma form flow",
                method: "On-device",
                sideEffects: [
                    "Submits a course-registration request for your signed-in university account from this device.",
                    "Uses this Alma detail page and the university login saved on this device.",
                    "The shared backend does not handle your Alma session."
                ],
                requiredInputs: registrationInputs(status: support.status, option: options.options[0]),
                confirmButtonTitle: "Proceed with registration"
            )
            phase = .ready
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    private func submit(_ intent: CriticalActionIntent) async {
        guard let detailURL = course.detailURL else {
            actionError = "This course does not expose an Alma detail URL."
            return
        }
        guard intent.kind == .almaCourseRegistration else {
            actionError = "This action intent is incomplete. Prepare it again."
            return
        }

        phase = .submitting
        do {
            let (client, credentials) = try model.almaAccessContext(for: "submit Alma registration")
            let result = try await client.registerForCourse(
                detailURL: detailURL,
                credentials: credentials
            )
            self.intent = nil
            actionError = nil
            phase = .completed(result.messages.first ?? "Alma registration submitted.")
        } catch {
            actionError = error.localizedDescription
            phase = .ready
        }
    }

    private func registrationInputs(
        status: String?,
        option: AlmaCourseRegistrationOption
    ) -> [String] {
        var inputs: [String] = ["Registration path: \(option.label)"]
        if let status {
            inputs.insert("Current Alma status: \(status)", at: 0)
        }
        return inputs
    }
}

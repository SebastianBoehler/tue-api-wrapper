import SwiftUI

struct AppFeedbackSheet: View {
    let portalAPIBaseURLString: String

    @Environment(\.dismiss) private var dismiss
    @State private var draft = AppFeedbackDraft()
    @State private var phase: AppFeedbackSubmissionPhase = .idle

    private let context = AppFeedbackContext.current

    var body: some View {
        NavigationStack {
            Form {
                if phase.showsStatusSection {
                    Section {
                        statusSectionContent
                    }
                }

                Section("Privacy") {
                    StatusBanner(
                        title: "Public feedback issue",
                        message: "Do not include login details, student IDs, grades, or other personal data.",
                        systemImage: "exclamationmark.shield"
                    )
                }

                Section("Feedback") {
                    Picker("Type", selection: $draft.category) {
                        ForEach(AppFeedbackCategory.allCases) { category in
                            Text(category.title).tag(category)
                        }
                    }
                    .disabled(phase.isSubmitted)

                    TextField("Short title", text: $draft.title)
                        .disabled(phase.isSubmitted)

                    TextField("Where in the app? (optional)", text: $draft.area, axis: .vertical)
                        .lineLimit(1...2)
                        .disabled(phase.isSubmitted)

                    TextField("What happened or what should change?", text: $draft.summary, axis: .vertical)
                        .lineLimit(4...8)
                        .disabled(phase.isSubmitted)

                    TextField("How should it behave instead? (optional)", text: $draft.expectedBehavior, axis: .vertical)
                        .lineLimit(3...6)
                        .disabled(phase.isSubmitted)

                    TextField("How can we reproduce it? (optional)", text: $draft.reproductionSteps, axis: .vertical)
                        .lineLimit(3...6)
                        .disabled(phase.isSubmitted)
                }

                Section {
                    LabeledContent("App version", value: context.versionLabel)
                    LabeledContent("OS", value: context.systemVersion)
                    LabeledContent("Device", value: context.deviceModel)
                } header: {
                    Text("Technical Context")
                } footer: {
                    Text("Your university login details are never attached to feedback.")
                }
            }
            .navigationTitle("Send Feedback")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(phase.isSubmitted ? "Done" : "Cancel") {
                        dismiss()
                    }
                }

                if !phase.isSubmitted {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            Task { await submit() }
                        } label: {
                            if phase.isSubmitting {
                                ProgressView()
                            } else {
                                Text("Submit")
                            }
                        }
                        .disabled(!canSubmit)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var statusSectionContent: some View {
        switch phase {
        case .idle, .submitting:
            EmptyView()
        case .failed(let message):
            StatusBanner(
                title: "Submission failed",
                message: message,
                systemImage: "exclamationmark.triangle"
            )
        case .submitted(let response):
            VStack(alignment: .leading, spacing: 12) {
                StatusBanner(
                    title: "Feedback sent",
                    message: "Feedback issue #\(response.issueNumber) was created.",
                    systemImage: "checkmark.circle"
                )

                if let issueURL = URL(string: response.issueURL) {
                    Link("Open issue on GitHub", destination: issueURL)
                }
            }
        }
    }

    private var canSubmit: Bool {
        draft.title.trimmedOrNil != nil
            && draft.summary.trimmedOrNil != nil
            && !phase.isSubmitting
    }

    private func submit() async {
        phase = .submitting

        guard let client = BackendClient(baseURLString: portalAPIBaseURLString) else {
            phase = .failed("The configured portal API URL is invalid in this build.")
            return
        }

        do {
            let response = try await client.submitAppFeedback(
                draft.asRequest(context: context)
            )
            phase = .submitted(response)
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }
}

private struct AppFeedbackDraft {
    var category: AppFeedbackCategory = .improvement
    var title = ""
    var area = ""
    var summary = ""
    var expectedBehavior = ""
    var reproductionSteps = ""

    func asRequest(context: AppFeedbackContext) -> AppFeedbackIssueRequest {
        AppFeedbackIssueRequest(
            category: category,
            title: title.trimmingCharacters(in: .whitespacesAndNewlines),
            summary: summary.trimmingCharacters(in: .whitespacesAndNewlines),
            area: area.trimmedOrNil,
            expectedBehavior: expectedBehavior.trimmedOrNil,
            reproductionSteps: reproductionSteps.trimmedOrNil,
            appVersion: context.appVersion,
            buildNumber: context.buildNumber,
            systemVersion: context.systemVersion,
            deviceModel: context.deviceModel
        )
    }
}

private enum AppFeedbackSubmissionPhase: Equatable {
    case idle
    case submitting
    case failed(String)
    case submitted(AppFeedbackIssueResponse)

    var isSubmitting: Bool {
        if case .submitting = self {
            true
        } else {
            false
        }
    }

    var isSubmitted: Bool {
        if case .submitted = self {
            true
        } else {
            false
        }
    }

    var showsStatusSection: Bool {
        switch self {
        case .idle, .submitting:
            false
        case .failed, .submitted:
            true
        }
    }
}

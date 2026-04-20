import SwiftUI

struct CriticalActionConfirmationSheet: View {
    var intent: CriticalActionIntent
    var isSubmitting: Bool
    var errorMessage: String?
    var proceed: () -> Void
    var cancel: () -> Void

    var body: some View {
        NavigationStack {
            List {
                Section("Action") {
                    LabeledContent("Portal", value: intent.portal)
                    LabeledContent("Action", value: intent.actionLabel)
                    LabeledContent("Method", value: "\(intent.method) \(intent.endpoint)")
                    if let targetURL = intent.targetURL {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Target")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(targetURL.absoluteString)
                                .font(.footnote)
                                .textSelection(.enabled)
                        }
                    }
                }

                Section("What Proceed Will Do") {
                    ForEach(intent.sideEffects, id: \.self) { effect in
                        Label(effect, systemImage: "arrow.right.circle")
                    }
                }

                if !intent.requiredInputs.isEmpty {
                    Section("Required Inputs") {
                        ForEach(intent.requiredInputs, id: \.self) { input in
                            Label(input, systemImage: "checkmark.seal")
                        }
                    }
                }

                if let errorMessage {
                    Section {
                        StatusBanner(
                            title: "Action failed",
                            message: errorMessage,
                            systemImage: "exclamationmark.triangle"
                        )
                    }
                }

                Section {
                    Button {
                        proceed()
                    } label: {
                        if isSubmitting {
                            ProgressView()
                        } else {
                            Text(intent.confirmButtonTitle)
                        }
                    }
                    .disabled(isSubmitting)

                    Button("Cancel", role: .cancel) {
                        cancel()
                    }
                    .disabled(isSubmitting)
                } footer: {
                    Text("Cancel leaves Alma, ILIAS, and Moodle unchanged. Proceed submits this legacy/dev backend action.")
                }
            }
            .navigationTitle("Confirm Action")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

import SwiftUI

struct StudyAssistantEntryView: View {
    var model: AppModel

    var body: some View {
        Group {
#if canImport(FoundationModels)
            if #available(iOS 26.0, *) {
                StudyAssistantView(
                    configuration: StudyAssistantConfiguration(
                        almaBaseURLString: model.baseURLString,
                        portalAPIBaseURLString: model.portalAPIBaseURLString,
                        hasCredentials: model.hasCredentials
                    )
                )
            } else {
                StudyAssistantUnsupportedView(
                    message: "This test screen requires iOS 26 or newer because Apple Foundation Models is only available there."
                )
            }
#else
            StudyAssistantUnsupportedView(
                message: "This Xcode build does not include the Foundation Models SDK."
            )
#endif
        }
        .navigationTitle("Assistant")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct StudyAssistantUnsupportedView: View {
    let message: String

    var body: some View {
        List {
            Section {
                StatusBanner(
                    title: "Assistant unavailable",
                    message: message,
                    systemImage: "exclamationmark.triangle"
                )
            }

            Section("Why") {
                Text("This is a test-only screen for the on-device study assistant.")
                Text("It depends on Apple Intelligence model availability at runtime and does not provide a fallback model.")
            }
        }
        .background(Color(uiColor: .systemGroupedBackground))
    }
}

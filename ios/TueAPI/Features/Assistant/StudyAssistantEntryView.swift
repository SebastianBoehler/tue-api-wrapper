import SwiftUI

#if canImport(FoundationModels)
import FoundationModels
#endif

struct StudyAssistantEntryView: View {
    var model: AppModel

    var body: some View {
        Group {
#if canImport(FoundationModels)
            if #available(iOS 26.0, *), SystemLanguageModel.default.isAvailable {
                StudyAssistantView(
                    configuration: StudyAssistantConfiguration(
                        almaBaseURLString: model.baseURLString,
                        portalAPIBaseURLString: model.portalAPIBaseURLString,
                        hasCredentials: model.hasCredentials
                    )
                )
            } else {
                MLXStudyAssistantView(
                    configuration: StudyAssistantConfiguration(
                        almaBaseURLString: model.baseURLString,
                        portalAPIBaseURLString: model.portalAPIBaseURLString,
                        hasCredentials: model.hasCredentials
                    ),
                    fallbackReason: appleFallbackReason
                )
            }
#else
            MLXStudyAssistantView(
                configuration: StudyAssistantConfiguration(
                    almaBaseURLString: model.baseURLString,
                    portalAPIBaseURLString: model.portalAPIBaseURLString,
                    hasCredentials: model.hasCredentials
                ),
                fallbackReason: "Apple Foundation Models is not available in this build."
            )
#endif
        }
        .navigationTitle("Assistant")
        .navigationBarTitleDisplayMode(.inline)
    }

#if canImport(FoundationModels)
    private var appleFallbackReason: String {
        if #available(iOS 26.0, *) {
            switch SystemLanguageModel.default.availability {
            case .available:
                return "Apple Foundation Models is available."
            case .unavailable(.appleIntelligenceNotEnabled):
                return "Apple Intelligence is not enabled, so this screen is using local MLX instead."
            case .unavailable(.deviceNotEligible):
                return "This device is not eligible for Apple Intelligence, so this screen is using local MLX instead."
            case .unavailable(.modelNotReady):
                return "Apple's on-device model is not ready yet, so this screen is using local MLX instead."
            }
        }
        return "Apple Foundation Models requires iOS 26, so this screen is using local MLX instead."
    }
#endif
}

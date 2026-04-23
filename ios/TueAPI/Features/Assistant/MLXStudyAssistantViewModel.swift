import Foundation
import Observation

@Observable
@MainActor
final class MLXStudyAssistantViewModel {
    let configuration: StudyAssistantConfiguration
    let fallbackReason: String

    var draft = ""
    var messages: [StudyAssistantMessage]
    var isSending = false
    var statusMessage: String?
    var downloadProgress: Progress?

    private let service: MLXStudyAssistantService

    init(configuration: StudyAssistantConfiguration, fallbackReason: String) {
        self.configuration = configuration
        self.fallbackReason = fallbackReason
        self.service = MLXStudyAssistantService(configuration: configuration)
        self.messages = [
            StudyAssistantMessage(
                role: .assistant,
                text: "Ask about grades, current study status, courses, or upcoming talks. MLX will download \(MLXStudyAssistantService.defaultModelName) on first use."
            )
        ]
    }

    var canSend: Bool {
        !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isSending
    }

    func resetConversation() {
        draft = ""
        statusMessage = nil
        downloadProgress = nil
        messages = [
            StudyAssistantMessage(
                role: .assistant,
                text: "Conversation cleared. Ask a fresh question about grades, study status, courses, or talks."
            )
        ]
        Task {
            await service.reset()
        }
    }

    func sendCurrentDraft() async {
        let input = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !input.isEmpty else { return }
        draft = ""
        await send(messageText: input)
    }

    func sendSuggestedPrompt(_ prompt: String) async {
        guard !isSending else { return }
        draft = ""
        await send(messageText: prompt)
    }

    private func send(messageText: String) async {
        let responseID = UUID()
        isSending = true
        statusMessage = "Loading \(MLXStudyAssistantService.defaultModelName) with MLX."
        messages.append(StudyAssistantMessage(role: .user, text: messageText))
        messages.append(StudyAssistantMessage(id: responseID, role: .assistant, text: "", isPending: true))

        do {
            let stream = try await service.streamResponse(to: messageText) { progress in
                Task { @MainActor in
                    self.downloadProgress = progress
                    self.statusMessage = self.statusText(for: progress)
                }
            }

            var responseText = ""
            for try await chunk in stream {
                responseText += chunk
                updateAssistantMessage(id: responseID, text: responseText, isPending: true)
            }

            updateAssistantMessage(id: responseID, text: responseText, isPending: false)
            statusMessage = nil
            downloadProgress = nil
        } catch {
            updateAssistantMessage(
                id: responseID,
                text: "MLX assistant request failed: \(error.localizedDescription)",
                isPending: false
            )
            statusMessage = error.localizedDescription
        }

        isSending = false
    }

    private func updateAssistantMessage(id: UUID, text: String, isPending: Bool) {
        guard let index = messages.firstIndex(where: { $0.id == id }) else {
            return
        }
        messages[index].text = text
        messages[index].isPending = isPending
    }

    private func statusText(for progress: Progress) -> String {
        guard progress.totalUnitCount > 0 else {
            return "Preparing local MLX model download."
        }
        let percent = Int((progress.fractionCompleted * 100).rounded())
        return "Downloading \(MLXStudyAssistantService.defaultModelName): \(percent)%"
    }
}

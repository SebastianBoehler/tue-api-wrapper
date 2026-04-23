import Foundation
import MLXLLM
import MLXLMCommon

final class MLXStudyAssistantService {
    static let defaultModelName = "Qwen3 0.6B 4-bit"
    static let defaultModelID = "mlx-community/Qwen3-0.6B-4bit"

    private let toolExecutor: MLXStudyAssistantToolExecutor
    private var modelContainer: ModelContainer?
    private var chatSession: ChatSession?

    init(configuration: StudyAssistantConfiguration) {
        toolExecutor = MLXStudyAssistantToolExecutor(configuration: configuration)
    }

    func streamResponse(
        to prompt: String,
        progressHandler: @escaping @Sendable (Progress) -> Void
    ) async throws -> AsyncThrowingStream<String, Error> {
        let session = try await resolvedSession(progressHandler: progressHandler)
        return session.streamResponse(to: """
        Today is \(Self.promptDateFormatter.string(from: Date())).
        User request: \(prompt)
        """)
    }

    func reset() async {
        await chatSession?.clear()
    }

    private func resolvedSession(
        progressHandler: @escaping @Sendable (Progress) -> Void
    ) async throws -> ChatSession {
        if let chatSession {
            return chatSession
        }

        let container = try await resolvedContainer(progressHandler: progressHandler)
        let session = ChatSession(
            container,
            instructions: Self.instructions,
            generateParameters: GenerateParameters(maxTokens: 768, temperature: 0.2, topP: 0.9),
            tools: toolExecutor.schemas,
            toolDispatch: { [toolExecutor] toolCall in
                try await toolExecutor.execute(toolCall)
            }
        )
        chatSession = session
        return session
    }

    private func resolvedContainer(
        progressHandler: @escaping @Sendable (Progress) -> Void
    ) async throws -> ModelContainer {
        if let modelContainer {
            return modelContainer
        }

        let container = try await LLMModelFactory.shared.loadContainer(
            from: MLXHuggingFaceDownloader(),
            using: MLXHuggingFaceTokenizerLoader(),
            configuration: LLMRegistry.qwen3_0_6b_4bit,
            progressHandler: progressHandler
        )
        modelContainer = container
        return container
    }

    private static let instructions = """
    You are the TUE study assistant inside an iOS app.
    Use the provided tools for live university data instead of guessing.
    Keep answers concise and practical.
    Mention the source system when it matters, such as Alma, ILIAS, Moodle, or the talks calendar.
    Never invent grades, courses, talks, deadlines, or lecture times.
    """

    private static let promptDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "Europe/Berlin")
        formatter.dateStyle = .full
        formatter.timeStyle = .short
        return formatter
    }()
}

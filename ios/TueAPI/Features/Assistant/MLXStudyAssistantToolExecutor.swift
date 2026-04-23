import Foundation
import MLXLMCommon

private struct MLXLimitToolInput: Codable {
    var limit: Int?
}

private struct MLXSearchToolInput: Codable {
    var query: String
    var limit: Int?
}

private struct MLXToolTextOutput: Codable {
    var text: String
}

struct MLXStudyAssistantToolExecutor {
    private let dataSource: StudyAssistantDataSource

    private let studySnapshotTool: Tool<MLXLimitToolInput, MLXToolTextOutput>
    private let gradesTool: Tool<MLXLimitToolInput, MLXToolTextOutput>
    private let courseSearchTool: Tool<MLXSearchToolInput, MLXToolTextOutput>
    private let talksSearchTool: Tool<MLXSearchToolInput, MLXToolTextOutput>

    init(configuration: StudyAssistantConfiguration) {
        let source = StudyAssistantDataSource(configuration: configuration)
        dataSource = source

        studySnapshotTool = Tool(
            name: "get_study_snapshot",
            description: "Load upcoming lectures, ILIAS tasks, Moodle deadlines, and current study status.",
            parameters: [.optional("limit", type: .int, description: "Maximum number of rows to return.")]
        ) { input in
            MLXToolTextOutput(text: try await source.loadStudySnapshot(limit: input.limit ?? 5))
        }

        gradesTool = Tool(
            name: "get_current_grades",
            description: "Load Alma exam records and Moodle grade rows.",
            parameters: [.optional("limit", type: .int, description: "Maximum number of grade rows to return.")]
        ) { input in
            MLXToolTextOutput(text: try await source.loadGrades(limit: input.limit ?? 8))
        }

        courseSearchTool = Tool(
            name: "search_courses",
            description: "Search public Alma courses and modules by title or topic.",
            parameters: [
                .required("query", type: .string, description: "Course topic, title, or keyword."),
                .optional("limit", type: .int, description: "Maximum number of course matches.")
            ]
        ) { input in
            MLXToolTextOutput(text: try await source.searchCourses(query: input.query, limit: input.limit ?? 8))
        }

        talksSearchTool = Tool(
            name: "search_talks",
            description: "Search upcoming public talks by topic, speaker, or location.",
            parameters: [
                .required("query", type: .string, description: "Talk topic, speaker, or location."),
                .optional("limit", type: .int, description: "Maximum number of talk matches.")
            ]
        ) { input in
            MLXToolTextOutput(text: try await source.searchTalks(query: input.query, limit: input.limit ?? 8))
        }
    }

    var schemas: [ToolSpec] {
        [
            studySnapshotTool.schema,
            gradesTool.schema,
            courseSearchTool.schema,
            talksSearchTool.schema
        ]
    }

    func execute(_ toolCall: ToolCall) async throws -> String {
        switch toolCall.function.name {
        case studySnapshotTool.name:
            return try await toolCall.execute(with: studySnapshotTool).toolResult
        case gradesTool.name:
            return try await toolCall.execute(with: gradesTool).toolResult
        case courseSearchTool.name:
            return try await toolCall.execute(with: courseSearchTool).toolResult
        case talksSearchTool.name:
            return try await toolCall.execute(with: talksSearchTool).toolResult
        default:
            return "Unknown tool: \(toolCall.function.name)"
        }
    }
}

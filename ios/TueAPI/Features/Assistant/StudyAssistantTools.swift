#if canImport(FoundationModels)
import Foundation
import FoundationModels

@available(iOS 26.0, *)
@Generable
struct StudyAssistantLimitArguments {
    @Guide(description: "How many items to return.", .range(1...8))
    let limit: Int
}

@available(iOS 26.0, *)
@Generable
struct StudyAssistantSearchArguments {
    @Guide(description: "Topic, title, speaker, or keyword.")
    let query: String

    @Guide(description: "How many matches to return.", .range(1...10))
    let limit: Int
}

@available(iOS 26.0, *)
struct StudySnapshotTool: Tool {
    let dataSource: StudyAssistantDataSource

    var name: String { "get_study_snapshot" }

    var description: String {
        "Use for upcoming lectures, open tasks, deadlines, or an overall study status update."
    }

    func call(arguments: StudyAssistantLimitArguments) async throws -> String {
        try await dataSource.loadStudySnapshot(limit: arguments.limit)
    }
}

@available(iOS 26.0, *)
struct CurrentGradesTool: Tool {
    let dataSource: StudyAssistantDataSource

    var name: String { "get_current_grades" }

    var description: String {
        "Use for Alma exam grades, passed records, credits, or Moodle grade rows."
    }

    func call(arguments: StudyAssistantLimitArguments) async throws -> String {
        try await dataSource.loadGrades(limit: arguments.limit)
    }
}

@available(iOS 26.0, *)
struct SearchCoursesTool: Tool {
    let dataSource: StudyAssistantDataSource

    var name: String { "search_courses" }

    var description: String {
        "Use to find public Alma courses or modules by topic or title."
    }

    func call(arguments: StudyAssistantSearchArguments) async throws -> String {
        try await dataSource.searchCourses(query: arguments.query, limit: arguments.limit)
    }
}

@available(iOS 26.0, *)
struct SearchTalksTool: Tool {
    let dataSource: StudyAssistantDataSource

    var name: String { "search_talks" }

    var description: String {
        "Use to find upcoming public talks by topic, speaker, or location."
    }

    func call(arguments: StudyAssistantSearchArguments) async throws -> String {
        try await dataSource.searchTalks(query: arguments.query, limit: arguments.limit)
    }
}

@available(iOS 26.0, *)
func makeStudyAssistantTools(configuration: StudyAssistantConfiguration) -> [any Tool] {
    let dataSource = StudyAssistantDataSource(configuration: configuration)
    return [
        StudySnapshotTool(dataSource: dataSource),
        CurrentGradesTool(dataSource: dataSource),
        SearchCoursesTool(dataSource: dataSource),
        SearchTalksTool(dataSource: dataSource)
    ]
}
#endif

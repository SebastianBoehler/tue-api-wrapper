import Foundation

protocol UniversityCredentialsLoading {
    func load() throws -> AlmaCredentials?
}

protocol UniversityIliasTaskLoading {
    func fetchTasks(limit: Int) async throws -> [IliasTask]
}

protocol UniversityMoodleDeadlineLoading {
    func fetchDeadlines(days: Int, limit: Int) async throws -> [MoodleDeadline]
}

struct UniversityTaskSnapshot {
    var tasks: [IliasTask]
    var deadlines: [MoodleDeadline]
    var refreshedAt: Date
}

import Foundation

struct UniversityPortalClient {
    private let credentialsLoader: UniversityCredentialsLoading
    private let iliasClientFactory: (AlmaCredentials) -> UniversityIliasTaskLoading
    private let moodleClientFactory: (AlmaCredentials) -> UniversityMoodleDeadlineLoading

    init(
        credentialsLoader: UniversityCredentialsLoading,
        iliasClientFactory: @escaping (AlmaCredentials) -> UniversityIliasTaskLoading = { IliasOnDeviceClient(credentials: $0) },
        moodleClientFactory: @escaping (AlmaCredentials) -> UniversityMoodleDeadlineLoading = { MoodleOnDeviceClient(credentials: $0) }
    ) {
        self.credentialsLoader = credentialsLoader
        self.iliasClientFactory = iliasClientFactory
        self.moodleClientFactory = moodleClientFactory
    }

    func fetchTasksAndDeadlines(
        taskLimit: Int = 20,
        deadlineDays: Int = 14,
        deadlineLimit: Int = 30
    ) async throws -> UniversityTaskSnapshot {
        guard let credentials = try credentialsLoader.load() else {
            throw UniversityPortalError.missingCredentials
        }

        async let tasksFetch = iliasClientFactory(credentials).fetchTasks(limit: taskLimit)
        async let deadlinesFetch = moodleClientFactory(credentials).fetchDeadlines(days: deadlineDays, limit: deadlineLimit)
        let (tasks, deadlines) = try await (tasksFetch, deadlinesFetch)
        return UniversityTaskSnapshot(tasks: tasks, deadlines: deadlines, refreshedAt: Date())
    }
}

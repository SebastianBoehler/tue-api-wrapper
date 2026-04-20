import Foundation

extension AppModel {
    func refreshTasks() async {
        guard let client = BackendClient(baseURLString: portalAPIBaseURLString) else {
            tasksPhase = .unavailable
            return
        }

        tasksPhase = .loading

        do {
            async let tasksFetch = client.fetchIliasTasks()
            async let deadlinesFetch = client.fetchMoodleCalendar()
            let (fetchedTasks, fetchedDeadlines) = try await (tasksFetch, deadlinesFetch)
            tasks = fetchedTasks
            deadlines = fetchedDeadlines.filter { $0.isActionable }
            tasksPhase = .loaded(Date())
        } catch {
            if let message = BackendCredentialConfiguration.message(for: error, feature: .deadlines) {
                tasksPhase = .failed(message)
            } else {
                tasksPhase = .failed(error.localizedDescription)
            }
        }
    }
}

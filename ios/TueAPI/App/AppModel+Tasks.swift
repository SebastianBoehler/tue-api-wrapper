import Foundation

extension AppModel {
    func refreshTasks() async {
        tasksPhase = .loading

        do {
            let snapshot = try await UniversityPortalClient(credentialsLoader: keychain)
                .fetchTasksAndDeadlines()
            tasks = snapshot.tasks
            deadlines = snapshot.deadlines.filter { $0.isActionable }
            tasksPhase = .loaded(snapshot.refreshedAt)
        } catch {
            tasksPhase = .failed(error.localizedDescription)
        }
    }
}

import XCTest
@testable import TueAPI

final class UniversityPortalClientTests: XCTestCase {
    func testFetchTasksAndDeadlinesRequiresSavedCredentials() async throws {
        let client = UniversityPortalClient(
            credentialsLoader: EmptyUniversityCredentialsLoader(),
            iliasClientFactory: { _ in UnusedIliasTaskLoader() },
            moodleClientFactory: { _ in UnusedMoodleDeadlineLoader() }
        )

        do {
            _ = try await client.fetchTasksAndDeadlines()
            XCTFail("Expected missing credentials to throw.")
        } catch let error as UniversityPortalError {
            XCTAssertEqual(error, .missingCredentials)
            XCTAssertEqual(error.localizedDescription, "Save university credentials before loading tasks and deadlines.")
        }
    }
}

private struct EmptyUniversityCredentialsLoader: UniversityCredentialsLoading {
    func load() throws -> AlmaCredentials? {
        nil
    }
}

private struct UnusedIliasTaskLoader: UniversityIliasTaskLoading {
    func fetchTasks(limit _: Int) async throws -> [IliasTask] {
        XCTFail("ILIAS should not be called without credentials.")
        return []
    }
}

private struct UnusedMoodleDeadlineLoader: UniversityMoodleDeadlineLoading {
    func fetchDeadlines(days _: Int, limit _: Int) async throws -> [MoodleDeadline] {
        XCTFail("Moodle should not be called without credentials.")
        return []
    }
}

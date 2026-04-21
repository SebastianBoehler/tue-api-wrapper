import XCTest
@testable import TueAPI

final class UniversityGradesClientTests: XCTestCase {
    func testFetchGradesRequiresSavedCredentials() async throws {
        let client = UniversityGradesClient(
            credentialsLoader: EmptyGradeCredentialsLoader(),
            almaBaseURL: URL(string: "https://alma.uni-tuebingen.de")!
        )

        do {
            _ = try await client.fetchGrades()
            XCTFail("Expected missing credentials to throw.")
        } catch let error as UniversityGradesError {
            XCTAssertEqual(error, .missingCredentials)
            XCTAssertEqual(error.localizedDescription, "Save university credentials in Settings before loading grades.")
        }
    }
}

private struct EmptyGradeCredentialsLoader: UniversityCredentialsLoading {
    func load() throws -> AlmaCredentials? {
        nil
    }
}

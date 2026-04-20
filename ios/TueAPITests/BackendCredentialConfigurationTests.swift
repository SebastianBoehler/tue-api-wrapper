import XCTest
@testable import TueAPI

final class BackendCredentialConfigurationTests: XCTestCase {
    func testMapsMissingCredentialsToDeadlineMessage() {
        let message = BackendCredentialConfiguration.message(
            for: BackendClientError.server(
                400,
                "Set UNI_USERNAME and UNI_PASSWORD before using authenticated Moodle endpoints. Legacy ALMA_* and ILIAS_* env vars are still supported as fallbacks."
            ),
            feature: .deadlines
        )

        XCTAssertEqual(
            message,
            "Backend credentials are missing. Set UNI_USERNAME and UNI_PASSWORD on the backend host to load tasks and deadlines."
        )
    }

    func testMapsMissingCredentialsToPortalStatusMessage() {
        let message = BackendCredentialConfiguration.message(
            statusCode: 503,
            detail: "Set UNI_USERNAME and UNI_PASSWORD before using authenticated endpoints.",
            feature: .portalStatus
        )

        XCTAssertEqual(
            message,
            "Backend credentials are missing. Set UNI_USERNAME and UNI_PASSWORD on the backend host to check signup status."
        )
    }

    func testIgnoresOtherBackendErrors() {
        let message = BackendCredentialConfiguration.message(
            for: BackendClientError.server(400, "A non-empty course title is required."),
            feature: .deadlines
        )

        XCTAssertNil(message)
    }
}

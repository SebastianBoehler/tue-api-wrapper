import CoreLocation
import MapKit
import XCTest
@testable import TueAPI

final class CourseNavigationActionsTests: XCTestCase {
    func testCyberValleyRoomMatchesMvl1Landmark() {
        let match = CampusLandmark.navigationMatch(
            for: "Hörsaal A2 (A-223) Cyber Valley Campus, MVL1"
        )

        XCTAssertEqual(match?.id, "cyber-valley-mvl1")
    }

    func testResolverContinuesAfterGeocoderNoResult() async throws {
        let geocoder = SequenceCampusLectureGeocoder([
            .failure(CLError(.geocodeFoundNoResult)),
            .success([
                MKPlacemark(
                    coordinate: CLLocationCoordinate2D(latitude: 48.525118, longitude: 9.061779)
                )
            ])
        ])
        let resolver = CampusLectureDestinationResolver(geocoder: geocoder)

        let destination = try await resolver.resolve("Unknown room, Some Campus")

        XCTAssertEqual(destination.name, "Unknown room, Some Campus, Universität Tübingen, Tübingen, Germany")
        XCTAssertEqual(geocoder.requestedQueries.count, 2)
    }
}

private final class SequenceCampusLectureGeocoder: CampusLectureGeocoding {
    private var results: [Result<[CLPlacemark], Error>]
    private(set) var requestedQueries: [String] = []

    init(_ results: [Result<[CLPlacemark], Error>]) {
        self.results = results
    }

    func geocodeAddressString(_ addressString: String) async throws -> [CLPlacemark] {
        requestedQueries.append(addressString)
        guard !results.isEmpty else {
            throw CLError(.geocodeFoundNoResult)
        }
        return try results.removeFirst().get()
    }
}

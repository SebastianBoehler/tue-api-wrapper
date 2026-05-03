import Foundation
import XCTest
@testable import TueAPI

final class BackendCampusSeatClientTests: XCTestCase {
    override func setUp() {
        super.setUp()
        CampusSeatStubURLProtocol.requestHandler = nil
    }

    func testFetchCampusSeatAvailabilityDecodesBackendContract() async throws {
        let responseData = """
        {
          "source_url": "https://seatfinder.bibliothek.kit.edu/tuebingen/getdata.php",
          "retrieved_at": "2026-05-03T10:20:00+02:00",
          "locations": [
            {
              "location_id": "UBH1",
              "name": "UBH1",
              "long_name": "Lernzentrum, Hauptgebäude, 1. OG",
              "level": "1",
              "building": null,
              "room": null,
              "total_seats": 168,
              "free_seats": 160,
              "occupied_seats": 8,
              "occupancy_percent": 4.8,
              "updated_at": "2026-05-03T10:16:34+02:00",
              "url": "https://uni-tuebingen.de/",
              "geo_coordinates": "48.52539;9.06189"
            }
          ]
        }
        """.data(using: .utf8)!

        var capturedURL: URL?
        CampusSeatStubURLProtocol.requestHandler = { request in
            capturedURL = request.url
            return (
                HTTPURLResponse(
                    url: request.url!,
                    statusCode: 200,
                    httpVersion: nil,
                    headerFields: ["Content-Type": "application/json"]
                )!,
                responseData
            )
        }

        let client = try XCTUnwrap(
            BackendClient(
                baseURLString: "https://example.com",
                session: makeStubSession()
            )
        )

        let availability = try await client.fetchCampusSeatAvailability()

        XCTAssertEqual(capturedURL?.absoluteString, "https://example.com/api/campus/seats")
        XCTAssertEqual(availability.locations.count, 1)
        XCTAssertEqual(availability.locations[0].locationID, "UBH1")
        XCTAssertEqual(availability.locations[0].freeSeats, 160)
        XCTAssertEqual(availability.locations[0].totalSeats, 168)
        XCTAssertEqual(availability.locations[0].occupancyPercent, 4.8)
    }

    private func makeStubSession() -> URLSession {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [CampusSeatStubURLProtocol.self]
        return URLSession(configuration: configuration)
    }
}

private final class CampusSeatStubURLProtocol: URLProtocol {
    static var requestHandler: ((URLRequest) throws -> (HTTPURLResponse, Data))?

    override class func canInit(with request: URLRequest) -> Bool {
        request.url?.host == "example.com"
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        request
    }

    override func startLoading() {
        guard let handler = Self.requestHandler else {
            client?.urlProtocol(self, didFailWithError: URLError(.badServerResponse))
            return
        }

        do {
            let (response, data) = try handler(request)
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}

import Foundation
import XCTest
@testable import TueAPI

final class BackendCampusFoodClientTests: XCTestCase {
    override func setUp() {
        super.setUp()
        CampusFoodStubURLProtocol.requestHandler = nil
    }

    func testFetchCampusFoodPlanDecodesOlderBackendContractAndFiltersDate() async throws {
        let responseData = """
        [
          {
            "canteen_id": "611",
            "canteen": "Mensa Wilhelmstraße",
            "page_url": "https://www.my-stuwe.de/mensa/mensa-wilhelmstrasse-tuebingen/",
            "address": "Wilhelmstraße 13",
            "map_url": null,
            "menus": [
              {
                "id": "457",
                "menu_line": "Tagesmenü vegan",
                "menu_date": "2026-04-23",
                "items": ["Frikadelle [vegan]", "Farfalle"],
                "student_price": "3,70",
                "guest_price": "8,35",
                "pupil_price": "8,35",
                "icons": ["vegan"],
                "allergens": ["Se"],
                "additives": ["1"],
                "co2": "None"
              },
              {
                "id": "467",
                "menu_line": "Tagesmenü vegan",
                "menu_date": "2026-04-27",
                "items": ["Auberginen-Kichererbsen Ragout"],
                "student_price": "3,70",
                "guest_price": "8,35",
                "pupil_price": "8,35",
                "icons": [],
                "allergens": [],
                "additives": [],
                "co2": "None"
              }
            ]
          }
        ]
        """.data(using: .utf8)!

        var capturedURL: URL?
        CampusFoodStubURLProtocol.requestHandler = { request in
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

        let canteens = try await client.fetchCampusFoodPlan(on: berlinDate(year: 2026, month: 4, day: 23))

        XCTAssertEqual(capturedURL?.absoluteString, "https://example.com/api/campus/canteens?date=2026-04-23")
        XCTAssertEqual(canteens.count, 1)
        XCTAssertEqual(canteens[0].canteenID, "611")
        XCTAssertEqual(canteens[0].menus.map(\.id), ["457"])
        XCTAssertEqual(canteens[0].menus[0].meats, [])
        XCTAssertEqual(canteens[0].menus[0].filtersInclude, [])
        XCTAssertNil(canteens[0].menus[0].photo)
    }

    private func makeStubSession() -> URLSession {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [CampusFoodStubURLProtocol.self]
        return URLSession(configuration: configuration)
    }

    private func berlinDate(year: Int, month: Int, day: Int) -> Date {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Europe/Berlin")!
        return calendar.date(from: DateComponents(year: year, month: month, day: day))!
    }
}

private final class CampusFoodStubURLProtocol: URLProtocol {
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

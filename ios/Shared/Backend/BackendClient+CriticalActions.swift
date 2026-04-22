import Foundation

struct BackendAlmaCourseRegistrationSupport: Decodable {
    var detailURL: String
    var title: String?
    var number: String?
    var supported: Bool
    var action: String?
    var status: String?
    var messages: [String]
    var message: String?

    enum CodingKeys: String, CodingKey {
        case detailURL = "detail_url"
        case title
        case number
        case supported
        case action
        case status
        case messages
        case message
    }
}

private struct BackendAlmaCourseRegistrationResponse: Decodable {
    var finalURL: String
    var status: String?
    var messages: [String]

    enum CodingKeys: String, CodingKey {
        case finalURL = "final_url"
        case status
        case messages
    }
}

extension BackendClient {
    func fetchAlmaCourseRegistrationSupport(detailURL: URL) async throws -> BackendAlmaCourseRegistrationSupport {
        let url = try makeURL(
            path: "api/alma/course-registration/support",
            queryItems: [URLQueryItem(name: "url", value: detailURL.absoluteString)]
        )
        let data = try await get(url)
        return try JSONDecoder().decode(BackendAlmaCourseRegistrationSupport.self, from: data)
    }

    func registerForAlmaCourse(detailURL: URL) async throws -> CriticalActionResult {
        let url = try makeURL(
            path: "api/alma/course-registration",
            queryItems: [URLQueryItem(name: "url", value: detailURL.absoluteString)]
        )
        let data = try await post(url)
        let response = try JSONDecoder().decode(BackendAlmaCourseRegistrationResponse.self, from: data)
        return CriticalActionResult(
            status: response.status ?? "submitted",
            message: response.messages.first,
            finalURL: URL(string: response.finalURL)
        )
    }

    func post(_ url: URL) async throws -> Data {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw BackendClientError.server(0, nil)
        }
        guard (200..<300).contains(http.statusCode) else {
            throw BackendClientError.server(http.statusCode, BackendClient.errorDetail(from: data))
        }
        return data
    }
}

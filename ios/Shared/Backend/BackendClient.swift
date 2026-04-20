import Foundation

enum BackendClientError: LocalizedError {
    case invalidURL
    case server(Int, String?)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            "Could not build the backend request URL."
        case .server(let code, let detail):
            if let detail, !detail.isEmpty {
                "Backend returned HTTP \(code): \(detail)"
            } else {
                "Backend returned HTTP \(code)."
            }
        }
    }
}

struct BackendClient {
    private static let maxErrorDetailLength = 600

    let baseURL: URL

    /// Returns nil when the URL string is empty or invalid.
    init?(baseURLString: String) {
        let trimmed = baseURLString.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty,
              let url = URL(string: trimmed),
              ["http", "https"].contains(url.scheme?.lowercased() ?? "") else {
            return nil
        }
        self.baseURL = url
    }

    // MARK: - ILIAS

    /// Fetches pending ILIAS tasks from `/api/ilias/tasks`.
    func fetchIliasTasks(limit: Int = 20) async throws -> [IliasTask] {
        let url = try makeURL(
            path: "api/ilias/tasks",
            queryItems: [URLQueryItem(name: "limit", value: "\(limit)")]
        )
        let data = try await get(url)
        return try JSONDecoder().decode([IliasTask].self, from: data)
    }

    // MARK: - Moodle

    /// Fetches upcoming Moodle calendar events from `/api/moodle/calendar`.
    func fetchMoodleCalendar(days: Int = 14, limit: Int = 30) async throws -> [MoodleDeadline] {
        let url = try makeURL(
            path: "api/moodle/calendar",
            queryItems: [
                URLQueryItem(name: "days", value: "\(days)"),
                URLQueryItem(name: "limit", value: "\(limit)")
            ]
        )
        let data = try await get(url)
        let page = try JSONDecoder().decode(MoodleCalendarResponse.self, from: data)
        return page.items
    }

    // MARK: - Private

    func makeURL(path: String, queryItems: [URLQueryItem]) throws -> URL {
        var components = URLComponents(url: baseURL.appending(path: path), resolvingAgainstBaseURL: false)
        components?.queryItems = queryItems
        guard let url = components?.url else {
            throw BackendClientError.invalidURL
        }
        return url
    }

    func get(_ url: URL) async throws -> Data {
        let (data, response) = try await URLSession.shared.data(from: url)
        guard let http = response as? HTTPURLResponse else {
            throw BackendClientError.server(0, nil)
        }
        guard (200..<300).contains(http.statusCode) else {
            throw BackendClientError.server(http.statusCode, Self.errorDetail(from: data))
        }
        return data
    }

    static func errorDetail(from data: Data) -> String? {
        if let payload = try? JSONDecoder().decode(BackendErrorPayload.self, from: data),
           let detail = payload.detail?.trimmingCharacters(in: .whitespacesAndNewlines),
           !detail.isEmpty {
            return cappedErrorDetail(detail)
        }

        let text = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let text, !text.isEmpty else {
            return nil
        }
        return cappedErrorDetail(text)
    }

    private static func cappedErrorDetail(_ detail: String) -> String {
        guard detail.count > maxErrorDetailLength else {
            return detail
        }
        return "\(detail.prefix(maxErrorDetailLength))..."
    }
}

private struct BackendErrorPayload: Decodable {
    var detail: String?
}

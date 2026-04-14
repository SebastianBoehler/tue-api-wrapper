import Foundation

enum BackendClientError: LocalizedError {
    case invalidURL
    case server(Int)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            "Could not build the backend request URL."
        case .server(let code):
            "Backend returned HTTP \(code)."
        }
    }
}

struct BackendClient {
    let baseURL: URL

    /// Returns nil when the URL string is empty or invalid.
    init?(baseURLString: String) {
        let trimmed = baseURLString.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty,
              let url = URL(string: trimmed),
              url.scheme?.hasPrefix("http") == true else {
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

    private func makeURL(path: String, queryItems: [URLQueryItem]) throws -> URL {
        var components = URLComponents(url: baseURL.appending(path: path), resolvingAgainstBaseURL: false)
        components?.queryItems = queryItems
        guard let url = components?.url else {
            throw BackendClientError.invalidURL
        }
        return url
    }

    private func get(_ url: URL) async throws -> Data {
        let (data, response) = try await URLSession.shared.data(from: url)
        guard let http = response as? HTTPURLResponse else {
            throw BackendClientError.server(0)
        }
        guard (200..<300).contains(http.statusCode) else {
            throw BackendClientError.server(http.statusCode)
        }
        return data
    }
}

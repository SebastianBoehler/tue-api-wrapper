import Foundation

struct TalksClient {
    private let baseURL: URL
    private let session: URLSession

    init(
        baseURL: URL = URL(string: "https://talks.tuebingen.ai")!,
        session: URLSession = .shared
    ) {
        self.baseURL = baseURL
        self.session = session
    }

    func fetchTalks(
        scope: TalksScope = .upcoming,
        limit: Int = 50,
        includeDisabled: Bool = false
    ) async throws -> [Talk] {
        let payload: TalksPayload = try await loadJSON(talksURL(scope: scope))
        let visible = includeDisabled ? payload.talks : payload.talks.filter { !$0.disabled }
        return Array(visible.prefix(max(1, limit)))
    }

    private func loadJSON<T: Decodable>(_ url: URL) async throws -> T {
        var request = URLRequest(url: url)
        request.setValue("application/json, text/plain, */*", forHTTPHeaderField: "Accept")
        request.setValue("tue-api-wrapper-ios/0.1 (+https://talks.tuebingen.ai/)", forHTTPHeaderField: "User-Agent")

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw TalksClientError.server("Talks did not return an HTTP response.")
        }
        guard (200..<400).contains(httpResponse.statusCode) else {
            throw TalksClientError.server("Talks request failed with HTTP \(httpResponse.statusCode).")
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    private func talksURL(scope: TalksScope) -> URL {
        var components = URLComponents(url: baseURL.appending(path: "api/talks"), resolvingAgainstBaseURL: false)!
        if scope == .previous {
            components.percentEncodedQuery = "previous"
        }
        return components.url!
    }
}

enum TalksClientError: LocalizedError {
    case server(String)

    var errorDescription: String? {
        switch self {
        case .server(let message):
            message
        }
    }
}

import Foundation

struct KufOccupancyClient {
    private let baseURL: URL
    private let session: URLSession

    init?(
        baseURLString: String = PortalAPIConfig.baseURLString,
        session: URLSession = .shared
    ) {
        let trimmed = baseURLString.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: trimmed),
              ["http", "https"].contains(url.scheme?.lowercased() ?? "") else {
            return nil
        }
        self.baseURL = url
        self.session = session
    }

    func fetchOccupancy() async throws -> KufTrainingOccupancy {
        let url = baseURL.appending(path: "api/campus/fitness/kuf")
        let (data, response) = try await session.data(from: url)
        guard let http = response as? HTTPURLResponse else {
            throw KufOccupancyClientError.server("KuF did not return an HTTP response.")
        }
        guard (200..<300).contains(http.statusCode) else {
            throw KufOccupancyClientError.server("KuF request failed with HTTP \(http.statusCode).")
        }
        return try JSONDecoder().decode(KufTrainingOccupancy.self, from: data)
    }
}

enum KufOccupancyClientError: LocalizedError {
    case server(String)

    var errorDescription: String? {
        switch self {
        case .server(let message):
            message
        }
    }
}

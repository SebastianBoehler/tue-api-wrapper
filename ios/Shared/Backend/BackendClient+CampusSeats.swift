import Foundation

extension BackendClient {
    func fetchCampusSeatAvailability() async throws -> CampusSeatAvailability {
        let url = try makeURL(path: "api/campus/seats", queryItems: [])
        let data = try await get(url)
        return try JSONDecoder().decode(CampusSeatAvailability.self, from: data)
    }
}

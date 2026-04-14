import Foundation

extension BackendClient {
    func fetchModuleSearchFilters() async throws -> ModuleSearchFiltersResponse {
        let url = try makeURL(path: "api/alma/module-search/filters", queryItems: [])
        let data = try await get(url)
        return try JSONDecoder().decode(ModuleSearchFiltersResponse.self, from: data)
    }

    func searchModules(_ request: ModuleSearchRequest) async throws -> ModuleSearchResponse {
        var queryItems = [
            URLQueryItem(name: "max_results", value: "\(request.maxResults)")
        ]
        let query = request.query.trimmingCharacters(in: .whitespacesAndNewlines)
        if !query.isEmpty {
            queryItems.append(URLQueryItem(name: "query", value: query))
        }
        append(request.degree, name: "degree", to: &queryItems)
        append(request.subject, name: "subject", to: &queryItems)
        append(request.elementType, name: "element_type", to: &queryItems)
        append(request.language, name: "language", to: &queryItems)
        append(request.faculty, name: "faculty", to: &queryItems)

        let url = try makeURL(path: "api/alma/module-search", queryItems: queryItems)
        let data = try await get(url)
        return try JSONDecoder().decode(ModuleSearchResponse.self, from: data)
    }

    private func append(_ value: String?, name: String, to queryItems: inout [URLQueryItem]) {
        guard let value, !value.isEmpty else { return }
        queryItems.append(URLQueryItem(name: name, value: value))
    }
}

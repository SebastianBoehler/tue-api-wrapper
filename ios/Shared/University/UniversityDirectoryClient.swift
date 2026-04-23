import Foundation

struct UniversityDirectoryClient {
    private let startURL = URL(string: "https://epv-welt.uni-tuebingen.de/RestrictedPages/StartSearch.aspx")!
    private let http: PortalHTTPSession

    init(
        http: PortalHTTPSession = PortalHTTPSession(
            userAgent: "tue-api-wrapper-ios/0.1 (+https://epv-welt.uni-tuebingen.de/)"
        )
    ) {
        self.http = http
    }

    func search(_ query: String) async throws -> UniversityDirectorySearchResponse {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 2 else {
            throw UniversityPortalError.portal("Enter at least two characters to search the public university directory.")
        }

        let searchPage = try await http.get(startURL)
        let searchForm = try UniversityDirectoryHTMLParser.searchForm(in: searchPage.text, pageURL: searchPage.url)
        let response = try await http.postForm(searchForm.request(for: trimmed))
        return try UniversityDirectoryHTMLParser.searchResponse(from: response.text, query: trimmed, pageURL: response.url)
    }

    func loadResult(
        for action: UniversityDirectoryPageAction,
        from form: UniversityHTMLForm,
        query: String
    ) async throws -> UniversityDirectorySearchResponse {
        let response = try await http.postForm(form.applying(action))
        return try UniversityDirectoryHTMLParser.searchResponse(from: response.text, query: query, pageURL: response.url)
    }
}

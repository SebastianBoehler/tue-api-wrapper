import Foundation

enum UniversitySAMLHandoff {
    static func complete(
        response: PortalHTTPResponse,
        http: PortalHTTPSession,
        maxSteps: Int = 6,
        isAuthenticated: (PortalHTTPResponse) -> Bool
    ) async throws -> PortalHTTPResponse {
        var current = response
        for _ in 0..<maxSteps {
            if isAuthenticated(current) {
                return current
            }

            if current.text.contains("SAMLResponse"), current.text.contains("RelayState") {
                let form = try UniversityHTMLFormParser.hiddenForm(
                    in: current.text,
                    pageURL: current.url,
                    requiredFields: ["SAMLResponse", "RelayState"]
                )
                current = try await http.postForm(form)
                continue
            }

            if current.url.host == "idp.uni-tuebingen.de", current.text.contains("_eventId_proceed") {
                let form = try UniversityHTMLFormParser.hiddenForm(
                    in: current.text,
                    pageURL: current.url,
                    requiredFields: ["_eventId_proceed"]
                )
                current = try await http.postForm(form)
                continue
            }

            break
        }

        throw UniversityPortalError.loginFailed("Could not complete the university SAML handoff.")
    }
}

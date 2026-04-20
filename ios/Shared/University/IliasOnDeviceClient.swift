import Foundation

struct IliasOnDeviceClient: UniversityIliasTaskLoading {
    private let credentials: AlmaCredentials
    private let loginURL: URL
    private let http: PortalHTTPSession

    init(
        credentials: AlmaCredentials,
        loginURL: URL = URL(string: "https://ovidius.uni-tuebingen.de/ilias3/login.php?cmd=force_login")!,
        http: PortalHTTPSession = PortalHTTPSession(userAgent: "tue-api-wrapper-ios/0.1 (+https://ovidius.uni-tuebingen.de/)")
    ) {
        self.credentials = credentials
        self.loginURL = loginURL
        self.http = http
    }

    func fetchTasks(limit: Int = 20) async throws -> [IliasTask] {
        try await login()
        let page = try await http.get(taskOverviewURL)
        return Array(try IliasTaskHTMLParser.parse(page.text, pageURL: page.url).prefix(max(1, limit)))
    }

    private func login() async throws {
        let loginPage = try await http.get(loginURL)
        let shibbolethURL = try UniversityHTMLFormParser.linkURL(
            containing: "shib_login.php",
            in: loginPage.text,
            pageURL: loginPage.url
        )
        let idpPage = try await http.get(shibbolethURL)
        let form = try UniversityHTMLFormParser.idpLoginForm(
            in: idpPage.text,
            pageURL: idpPage.url
        ).applying(credentials: credentials)

        let submitted = try await http.postForm(form)
        if let error = UniversityHTMLFormParser.idpError(in: submitted.text) {
            throw UniversityPortalError.loginFailed(error)
        }

        _ = try await UniversitySAMLHandoff.complete(
            response: submitted,
            http: http,
            isAuthenticated: { response in
                response.url.host == "ovidius.uni-tuebingen.de"
                    && response.text.contains("ILIAS Universität Tübingen")
            }
        )
    }

    private var taskOverviewURL: URL {
        URL(string: "https://ovidius.uni-tuebingen.de/ilias3/ilias.php?baseClass=ilderivedtasksgui")!
    }
}

import Foundation

struct MoodleOnDeviceClient: UniversityMoodleDeadlineLoading, UniversityMoodleGradeLoading {
    private let credentials: AlmaCredentials
    private let baseURL: URL
    private let http: PortalHTTPSession

    init(
        credentials: AlmaCredentials,
        baseURL: URL = URL(string: "https://moodle.zdv.uni-tuebingen.de")!,
        http: PortalHTTPSession = PortalHTTPSession(userAgent: "tue-api-wrapper-ios/0.1 (+https://moodle.zdv.uni-tuebingen.de/)")
    ) {
        self.credentials = credentials
        self.baseURL = baseURL
        self.http = http
    }

    func fetchDeadlines(days: Int = 14, limit: Int = 30) async throws -> [MoodleDeadline] {
        try await login()
        let dashboard = try await getAuthenticatedPage(dashboardURL)
        let sesskey = try MoodleCalendarNormalizer.sesskey(in: dashboard.text)
        let response = try await http.postJSON(
            calendarPayload(days: days, limit: limit),
            to: ajaxURL(sesskey: sesskey),
            referer: dashboard.url
        )
        return Array(try MoodleCalendarNormalizer.deadlines(from: response.data, baseURL: baseURL).prefix(max(1, limit)))
    }

    func fetchGrades(limit: Int = 50) async throws -> MoodleGradesResponse {
        try await login()
        let page = try await getAuthenticatedPage(gradesURL)
        return MoodleGradesHTMLParser.parse(page.text, pageURL: page.url, limit: limit)
    }

    private func login() async throws {
        let loginPage = try await http.get(loginURL)
        let shibbolethURL = try UniversityHTMLFormParser.linkURL(
            containing: "/auth/shibboleth/index.php",
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
                response.url.host == baseURL.host && response.url.path != "/login/index.php"
            }
        )
    }

    private func getAuthenticatedPage(_ url: URL) async throws -> PortalHTTPResponse {
        let response = try await http.get(url)
        if response.url.path == "/login/index.php" || response.url.path.contains("/auth/shibboleth/index.php") {
            throw UniversityPortalError.loginFailed("Session is not authenticated; Moodle redirected back to login.")
        }
        return response
    }

    private func calendarPayload(days: Int, limit: Int) -> [[String: Any]] {
        let start = Date()
        let end = Calendar(identifier: .gregorian).date(
            byAdding: .day,
            value: max(1, days),
            to: start
        ) ?? start
        return [[
            "index": 0,
            "methodname": "core_calendar_get_action_events_by_timesort",
            "args": [
                "limitnum": max(1, limit),
                "timesortfrom": Int(start.timeIntervalSince1970),
                "timesortto": Int(end.timeIntervalSince1970),
                "limittononsuspendedevents": true
            ]
        ]]
    }

    private var loginURL: URL {
        baseURL.appending(path: "login/index.php")
    }

    private var dashboardURL: URL {
        baseURL.appending(path: "my/")
    }

    private var gradesURL: URL {
        baseURL.appending(path: "grade/report/overview/index.php")
    }

    private func ajaxURL(sesskey: String) -> URL {
        baseURL.appending(path: "lib/ajax/service.php")
            .appending(queryItems: [
                URLQueryItem(name: "sesskey", value: sesskey),
                URLQueryItem(name: "info", value: "core_calendar_get_action_events_by_timesort")
            ])
    }
}

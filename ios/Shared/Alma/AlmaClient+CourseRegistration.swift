import Foundation

extension AlmaClient {
    func inspectCourseRegistration(
        detailURL: URL,
        credentials: AlmaCredentials
    ) async throws -> AlmaCourseRegistrationSupport {
        let normalizedURL = try normalizedCourseRegistrationURL(detailURL)
        try await login(credentials: credentials)
        let detail = try await loadAuthenticatedHTMLResponse(normalizedURL, pageName: "Alma detail page")
        let request = try AlmaCourseRegistrationHTMLParser.extractStartRequest(from: detail.html, pageURL: detail.url)
        let messages = AlmaCourseRegistrationHTMLParser.extractMessages(from: detail.html)
        let status = AlmaCourseRegistrationHTMLParser.extractStatus(from: detail.html, messages: messages)

        guard let request else {
            return AlmaCourseRegistrationSupport(
                detailURL: detail.url,
                supported: false,
                action: nil,
                status: status,
                messages: messages,
                message: "This Alma detail page does not expose a course-registration action."
            )
        }

        return AlmaCourseRegistrationSupport(
            detailURL: detail.url,
            supported: true,
            action: request.action,
            status: status,
            messages: messages,
            message: nil
        )
    }

    func prepareCourseRegistration(
        detailURL: URL,
        credentials: AlmaCredentials
    ) async throws -> AlmaCourseRegistrationOptions {
        let normalizedURL = try normalizedCourseRegistrationURL(detailURL)
        try await login(credentials: credentials)
        let detail = try await loadAuthenticatedHTMLResponse(normalizedURL, pageName: "Alma detail page")
        guard let start = try AlmaCourseRegistrationHTMLParser.extractStartRequest(from: detail.html, pageURL: detail.url) else {
            throw AlmaClientError.courseRegistration("This Alma detail page does not expose a course-registration action.")
        }

        let confirm = try await submitStartRequest(start)
        let options = AlmaCourseRegistrationHTMLParser.extractOptions(from: confirm.html)
        let messages = AlmaCourseRegistrationHTMLParser.extractMessages(from: confirm.html)
        guard !options.isEmpty else {
            throw AlmaClientError.courseRegistration("Alma did not expose a selectable course-registration path after opening registration.")
        }

        return AlmaCourseRegistrationOptions(
            detailURL: detail.url,
            action: start.action,
            options: options,
            messages: messages
        )
    }

    func registerForCourse(
        detailURL: URL,
        credentials: AlmaCredentials,
        planelementID: String? = nil
    ) async throws -> AlmaCourseRegistrationResult {
        let normalizedURL = try normalizedCourseRegistrationURL(detailURL)
        try await login(credentials: credentials)
        let detail = try await loadAuthenticatedHTMLResponse(normalizedURL, pageName: "Alma detail page")
        guard let start = try AlmaCourseRegistrationHTMLParser.extractStartRequest(from: detail.html, pageURL: detail.url) else {
            throw AlmaClientError.courseRegistration("This Alma detail page does not expose a course-registration action.")
        }

        let confirm = try await submitStartRequest(start)
        let request = try AlmaCourseRegistrationHTMLParser.buildConfirmRequest(
            from: confirm.html,
            pageURL: confirm.url,
            planelementID: planelementID
        )
        let final = try await submitConfirmRequest(request)
        if AlmaHTMLParser.looksLoggedOut(final.html) {
            throw AlmaClientError.loginFailed("Session is not authenticated; the Alma registration flow redirected back to login.")
        }

        let messages = AlmaCourseRegistrationHTMLParser.extractMessages(from: final.html)
        return AlmaCourseRegistrationResult(
            detailURL: detail.url,
            finalURL: final.url,
            action: start.action,
            selectedOption: request.selectedOption,
            messages: messages,
            status: AlmaCourseRegistrationHTMLParser.extractStatus(from: final.html, messages: messages)
        )
    }

    private func normalizedCourseRegistrationURL(_ detailURL: URL) throws -> URL {
        guard ["http", "https"].contains(detailURL.scheme?.lowercased() ?? ""),
              detailURL.host == baseURL.host,
              detailURL.path.hasPrefix("/alma/") else {
            throw AlmaClientError.courseRegistration("Alma course-registration URLs must belong to the configured Alma host.")
        }
        return detailURL
    }

    private func submitStartRequest(_ start: AlmaRegistrationStartRequest) async throws -> (html: String, url: URL) {
        var request = URLRequest(url: start.actionURL)
        request.httpMethod = "POST"
        request.setValue(userAgent, forHTTPHeaderField: "User-Agent")

        if let enctype = start.enctype?.lowercased(), enctype.contains("multipart/form-data") {
            let boundary = "TueAPIBoundary\(UUID().uuidString)"
            request.httpBody = multipartBody(fields: start.payload, boundary: boundary)
            request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        } else {
            request.httpBody = HTTPFormEncoder.encode(start.payload)
            request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        }

        let response = try await loadHTMLResponse(request)
        if AlmaHTMLParser.looksLoggedOut(response.html) {
            throw AlmaClientError.loginFailed("Session is not authenticated; the Alma registration flow redirected back to login.")
        }
        return response
    }

    private func submitConfirmRequest(
        _ confirm: AlmaCourseRegistrationConfirmRequest
    ) async throws -> (html: String, url: URL) {
        var request = URLRequest(url: confirm.actionURL)
        request.httpMethod = "POST"
        request.httpBody = HTTPFormEncoder.encode(confirm.payload)
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.setValue(userAgent, forHTTPHeaderField: "User-Agent")
        return try await loadHTMLResponse(request)
    }

    private func multipartBody(fields: [String: String], boundary: String) -> Data {
        var body = Data()
        for key in fields.keys.sorted() {
            let value = fields[key] ?? ""
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(key)\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(value)\r\n".data(using: .utf8)!)
        }
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        return body
    }
}


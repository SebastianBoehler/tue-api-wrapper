import Foundation

extension BackendClient {
    func submitAppFeedback(_ feedback: AppFeedbackIssueRequest) async throws -> AppFeedbackIssueResponse {
        let url = try makeURL(path: "api/feedback/issues", queryItems: [])
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody = try JSONEncoder().encode(feedback)

        let data = try await execute(request)
        return try JSONDecoder().decode(AppFeedbackIssueResponse.self, from: data)
    }
}

import Foundation

extension BackendClient {
    func fetchAlmaEnrollment() async throws -> AlmaEnrollmentState {
        let url = try makeURL(path: "api/alma/enrollments", queryItems: [])
        let data = try await get(url)
        return try JSONDecoder().decode(AlmaEnrollmentState.self, from: data)
    }

    func fetchAlmaExams(limit: Int = 50) async throws -> [AlmaExamRecord] {
        let url = try makeURL(
            path: "api/alma/exams",
            queryItems: [URLQueryItem(name: "limit", value: "\(limit)")]
        )
        let data = try await get(url)
        return try JSONDecoder().decode([AlmaExamRecord].self, from: data)
    }

    func fetchMoodleGrades(limit: Int = 50) async throws -> MoodleGradesResponse {
        let url = try makeURL(
            path: "api/moodle/grades",
            queryItems: [URLQueryItem(name: "limit", value: "\(limit)")]
        )
        let data = try await get(url)
        return try JSONDecoder().decode(MoodleGradesResponse.self, from: data)
    }
}

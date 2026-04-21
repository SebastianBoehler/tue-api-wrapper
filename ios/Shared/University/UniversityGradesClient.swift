import Foundation

enum UniversityGradesError: LocalizedError, Equatable {
    case missingCredentials

    var errorDescription: String? {
        switch self {
        case .missingCredentials:
            "Save university credentials in Settings before loading grades."
        }
    }
}

protocol UniversityMoodleGradeLoading {
    func fetchGrades(limit: Int) async throws -> MoodleGradesResponse
}

struct UniversityGradesClient {
    private let credentialsLoader: UniversityCredentialsLoading
    private let almaBaseURL: URL
    private let almaClientFactory: (URL) -> AlmaClient
    private let moodleClientFactory: (AlmaCredentials) -> UniversityMoodleGradeLoading

    init(
        credentialsLoader: UniversityCredentialsLoading,
        almaBaseURL: URL,
        almaClientFactory: @escaping (URL) -> AlmaClient = { AlmaClient(baseURL: $0) },
        moodleClientFactory: @escaping (AlmaCredentials) -> UniversityMoodleGradeLoading = { MoodleOnDeviceClient(credentials: $0) }
    ) {
        self.credentialsLoader = credentialsLoader
        self.almaBaseURL = almaBaseURL
        self.almaClientFactory = almaClientFactory
        self.moodleClientFactory = moodleClientFactory
    }

    func fetchGrades(examLimit: Int = 50, moodleLimit: Int = 50) async throws -> GradeOverviewPayload {
        guard let credentials = try credentialsLoader.load() else {
            throw UniversityGradesError.missingCredentials
        }

        async let almaOverview = almaClientFactory(almaBaseURL).fetchAcademicOverview(
            credentials: credentials,
            examLimit: examLimit
        )
        async let moodleGrades = moodleClientFactory(credentials).fetchGrades(limit: moodleLimit)
        let (alma, moodle) = try await (almaOverview, moodleGrades)

        return GradeOverviewPayload(
            enrollment: alma.enrollment,
            exams: alma.exams,
            moodleGrades: moodle,
            refreshedAt: Date()
        )
    }
}

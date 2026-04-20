import Foundation

enum UniversityPortalError: LocalizedError, Equatable {
    case missingCredentials
    case invalidURL(String)
    case loginFailed(String)
    case portal(String)
    case parsing(String)

    var errorDescription: String? {
        switch self {
        case .missingCredentials:
            "Save university credentials before loading tasks and deadlines."
        case .invalidURL(let message), .loginFailed(let message), .portal(let message), .parsing(let message):
            message
        }
    }
}

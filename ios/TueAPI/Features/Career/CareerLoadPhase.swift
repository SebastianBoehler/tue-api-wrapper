import Foundation

enum CareerLoadPhase: Equatable {
    case idle
    case loading
    case loaded(Date)
    case unavailable
    case failed(String)

    var isLoading: Bool {
        if case .loading = self {
            return true
        }
        return false
    }
}

enum CareerDetailPhase: Equatable {
    case loading
    case loaded
    case failed(String)
}

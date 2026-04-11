import Foundation

struct AlmaCredentials: Codable, Equatable {
    var username: String
    var password: String
}

struct AlmaLoginForm {
    var actionURL: URL
    var payload: [String: String]
}

struct AlmaTerm: Hashable {
    var label: String
    var value: String
    var isSelected: Bool
}

struct AlmaCalendarEvent {
    var summary: String
    var startDate: Date
    var endDate: Date?
    var location: String?
    var detail: String?
    var uid: String?
    var recurrenceRule: String?
    var excludedStarts: Set<Date>
}

struct AlmaCurrentLecturesForm {
    var actionURL: URL
    var payload: [(String, String)]
    var dateFieldName: String
    var searchButtonName: String
    var filterFieldName: String?
    var filterValues: [String]
}

struct AlmaCurrentLecture: Codable, Identifiable, Hashable {
    var id: String
    var title: String
    var detailURL: URL?
    var start: String?
    var end: String?
    var number: String?
    var parallelGroup: String?
    var eventType: String?
    var responsibleLecturer: String?
    var lecturer: String?
    var building: String?
    var room: String?
    var semester: String?
    var remark: String?
}

struct AlmaCurrentLecturesPage {
    var pageURL: URL
    var selectedDate: String?
    var results: [AlmaCurrentLecture]
}

enum AlmaClientError: LocalizedError {
    case invalidURL
    case loginFormMissing
    case loginFailed(String)
    case unauthenticated
    case timetableMissing(String)
    case unsupportedRecurrence(String)
    case server(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            "The Alma base URL is invalid."
        case .loginFormMissing:
            "Could not find the Alma login form."
        case .loginFailed(let message):
            message
        case .unauthenticated:
            "The Alma session is not authenticated."
        case .timetableMissing(let message):
            message
        case .unsupportedRecurrence(let rule):
            "Unsupported calendar recurrence rule: \(rule)"
        case .server(let message):
            message
        }
    }
}

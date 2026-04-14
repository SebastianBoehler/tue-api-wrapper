import Foundation
import SwiftUI

struct CourseDetailReference: Hashable {
    var id: String
    var title: String
    var number: String?
    var detailURL: URL?
    var timeRange: String?
    var eventType: String?
    var lecturer: String?
    var location: String?
    var semester: String?
    var remark: String?
    var sourceDetail: String?

    init(lecture: AlmaCurrentLecture) {
        self.id = lecture.id
        self.title = lecture.title
        self.number = lecture.number?.nilIfBlank ?? CourseIdentifierFinder.firstIdentifier(in: [
            lecture.title,
            lecture.remark
        ])
        self.detailURL = lecture.detailURL
        self.timeRange = lecture.timeRange
        self.eventType = lecture.eventType
        self.lecturer = lecture.lecturer ?? lecture.responsibleLecturer
        self.location = lecture.location
        self.semester = lecture.semester
        self.remark = lecture.remark
        self.sourceDetail = nil
    }

    init(event: LectureEvent) {
        self.id = event.id
        self.title = event.title
        self.number = CourseIdentifierFinder.firstIdentifier(in: [
            event.title,
            event.detail
        ])
        self.detailURL = event.detailURL
        self.timeRange = event.timeRangeText
        self.eventType = nil
        self.lecturer = nil
        self.location = event.location?.nilIfBlank
        self.semester = nil
        self.remark = nil
        self.sourceDetail = event.detail?.nilIfBlank
    }
}

private enum CourseIdentifierFinder {
    static func firstIdentifier(in values: [String?]) -> String? {
        for value in values.compactMap({ $0 }) {
            let range = NSRange(value.startIndex..<value.endIndex, in: value)
            guard let match = expression.firstMatch(in: value, range: range),
                  let matchRange = Range(match.range, in: value) else {
                continue
            }
            return String(value[matchRange]).normalizedIdentifierSpacing
        }
        return nil
    }

    private static let expression = try! NSRegularExpression(
        pattern: #"\b[A-Z]{2,12}[-\s]?\d{2,5}[A-Z]?\b"#
    )
}

extension AlmaCurrentLecture {
    var timeRange: String? {
        switch (start, end) {
        case (.some(let start), .some(let end)):
            "\(start)-\(end)"
        case (.some(let start), .none):
            start
        default:
            nil
        }
    }

    var location: String? {
        [building, room]
            .compactMap { $0?.nilIfBlank }
            .joined(separator: ", ")
            .nilIfBlank
    }
}

extension LectureEvent {
    var detailURL: URL? {
        guard let detail else { return nil }
        return CourseDetailURLFinder.firstURL(in: detail)
    }
}

private enum CourseDetailURLFinder {
    static func firstURL(in text: String) -> URL? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let range = NSRange(text.startIndex..<text.endIndex, in: text)
        return detector?
            .firstMatch(in: text, options: [], range: range)?
            .url
    }
}

struct PortalStatusRow: View {
    var status: CoursePortalStatus

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Label(status.displayStatus, systemImage: status.systemImage)
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Text(status.portalLabel)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            if let title = status.title?.nilIfBlank {
                Text(title)
                    .font(.subheadline)
            }
            if let message = status.error ?? status.message ?? status.matchReason {
                Text(message)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            if let url = status.resolvedURL {
                Link("Open match", destination: url)
                    .font(.footnote.weight(.semibold))
            }
        }
    }
}

struct CoursePortalStatusPayload: Decodable {
    var portalStatuses: [CoursePortalStatus]

    enum CodingKeys: String, CodingKey {
        case portalStatuses = "portal_statuses"
    }
}

struct CoursePortalStatus: Decodable, Identifiable {
    var portal: String
    var status: String
    var signedUp: Bool?
    var title: String?
    var url: String?
    var matchReason: String?
    var score: Int?
    var message: String?
    var error: String?

    var id: String { portal }

    enum CodingKeys: String, CodingKey {
        case portal
        case status
        case signedUp = "signed_up"
        case title
        case url
        case matchReason = "match_reason"
        case score
        case message
        case error
    }

    var portalLabel: String {
        switch portal {
        case "alma": "Alma"
        case "ilias": "ILIAS"
        case "moodle": "Moodle"
        default: portal
        }
    }

    var displayStatus: String {
        if signedUp == true { return "Signed up" }
        if signedUp == false { return "Not signed up" }
        if status == "error" { return "Unavailable" }
        return "Unknown"
    }

    var systemImage: String {
        if signedUp == true { return "checkmark.circle.fill" }
        if signedUp == false { return "xmark.circle" }
        return status == "error" ? "exclamationmark.triangle" : "questionmark.circle"
    }

    var resolvedURL: URL? {
        guard let url else { return nil }
        return URL(string: url)
    }
}

enum PortalStatusPhase {
    case idle
    case loading
    case loaded([CoursePortalStatus])
    case unavailable(String)
    case failed(String)
}

enum PortalStatusError: LocalizedError {
    case server(String)

    var errorDescription: String? {
        switch self {
        case .server(let message):
            message
        }
    }
}

private extension String {
    var nilIfBlank: String? {
        let value = trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : value
    }

    var normalizedIdentifierSpacing: String {
        replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

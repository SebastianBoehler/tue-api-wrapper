import Foundation

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
        self.number = lecture.number
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
        self.number = nil
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

private extension String {
    var nilIfBlank: String? {
        let value = trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : value
    }
}

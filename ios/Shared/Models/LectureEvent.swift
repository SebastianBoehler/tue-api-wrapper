import Foundation

struct LectureEvent: Codable, Identifiable, Hashable {
    var id: String
    var title: String
    var startDate: Date
    var endDate: Date?
    var location: String?
    var detail: String?

    var timeRangeText: String {
        let formatter = DateFormatter()
        formatter.timeZone = TimeZone(identifier: "Europe/Berlin")
        formatter.dateFormat = "E, dd.MM. HH:mm"

        guard let endDate else {
            return formatter.string(from: startDate)
        }

        let endFormatter = DateFormatter()
        endFormatter.timeZone = formatter.timeZone
        endFormatter.dateFormat = "HH:mm"
        return "\(formatter.string(from: startDate)) - \(endFormatter.string(from: endDate))"
    }
}

struct LectureSnapshot: Codable, Equatable {
    var refreshedAt: Date
    var sourceTerm: String
    var events: [LectureEvent]
}

import ActivityKit
import Foundation

struct LectureActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var title: String
        var startDate: Date
        var endDate: Date?
        var location: String?
    }

    var eventID: String
}

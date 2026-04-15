import Foundation

enum CareerDateFormatter {
    static func displayText(_ value: String?) -> String? {
        guard let value, !value.isEmpty else { return nil }
        if let date = ISO8601DateFormatter().date(from: value) {
            return date.formatted(date: .abbreviated, time: .omitted)
        }
        return value
    }
}

import Foundation

enum MailDateFormatter {
    static func displayText(_ value: String?) -> String? {
        guard let value, !value.isEmpty else { return nil }
        if let date = ISO8601DateFormatter().date(from: value) {
            return date.formatted(date: .abbreviated, time: .shortened)
        }
        return value
    }
}

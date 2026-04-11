import Foundation

enum ICSDateParser {
    static let berlinTimeZone = TimeZone(identifier: "Europe/Berlin") ?? .current

    static func parse(_ value: String, parameters: [String: String]) -> Date? {
        if parameters["VALUE"] == "DATE" || value.range(of: #"^\d{8}$"#, options: .regularExpression) != nil {
            return dateFormatter(format: "yyyyMMdd", timeZone: berlinTimeZone).date(from: value)
        }

        if value.hasSuffix("Z") {
            return dateFormatter(format: "yyyyMMdd'T'HHmmss'Z'", timeZone: TimeZone(secondsFromGMT: 0)!).date(from: value)
        }

        let timeZone = parameters["TZID"].flatMap(TimeZone.init(identifier:)) ?? berlinTimeZone
        return dateFormatter(format: "yyyyMMdd'T'HHmmss", timeZone: timeZone).date(from: value)
    }

    static func parseUntil(_ value: String, defaultTimeZone: TimeZone) -> Date? {
        if value.hasSuffix("Z") {
            return dateFormatter(format: "yyyyMMdd'T'HHmmss'Z'", timeZone: TimeZone(secondsFromGMT: 0)!).date(from: value)
        }
        if value.range(of: #"^\d{8}T\d{6}$"#, options: .regularExpression) != nil {
            return dateFormatter(format: "yyyyMMdd'T'HHmmss", timeZone: defaultTimeZone).date(from: value)
        }
        if value.range(of: #"^\d{8}$"#, options: .regularExpression) != nil {
            return dateFormatter(format: "yyyyMMdd", timeZone: defaultTimeZone).date(from: value)
        }
        return nil
    }

    static func calendar() -> Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = berlinTimeZone
        return calendar
    }

    private static func dateFormatter(format: String, timeZone: TimeZone) -> DateFormatter {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = timeZone
        formatter.dateFormat = format
        return formatter
    }
}

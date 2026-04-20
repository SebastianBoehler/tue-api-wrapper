import Foundation

enum MoodleCalendarNormalizer {
    static func deadlines(from data: Data, baseURL: URL) throws -> [MoodleDeadline] {
        let payload = try JSONSerialization.jsonObject(with: data)
        let result = try ajaxResult(from: payload)
        let items = eventItems(from: result)
        return items.compactMap { item in
            normalize(item, baseURL: baseURL)
        }
    }

    static func sesskey(in html: String) throws -> String {
        guard let raw = HTMLRegex.firstCapture(#"M\.cfg\s*=\s*(\{.*?\});"#, in: html),
              let data = raw.data(using: .utf8),
              let payload = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let sesskey = text(payload["sesskey"]) else {
            throw UniversityPortalError.parsing("Could not find a Moodle sesskey.")
        }
        return sesskey
    }

    private static func ajaxResult(from payload: Any) throws -> Any {
        guard let array = payload as? [Any],
              let first = array.first as? [String: Any] else {
            return payload
        }

        if bool(first["error"]) == true {
            throw UniversityPortalError.portal(
                text(first["exception"]) ?? text(first["message"]) ?? "Moodle AJAX request failed."
            )
        }
        return first["data"] ?? first
    }

    private static func eventItems(from payload: Any) -> [[String: Any]] {
        if let dictionary = payload as? [String: Any] {
            return dictionary["events"] as? [[String: Any]] ?? []
        }
        return payload as? [[String: Any]] ?? []
    }

    private static func normalize(_ item: [String: Any], baseURL: URL) -> MoodleDeadline {
        let course = item["course"] as? [String: Any]
        let action = item["action"] as? [String: Any]
        let actionURL = urlString(
            action?["url"] ?? item["url"] ?? item["viewurl"],
            baseURL: baseURL
        )

        return MoodleDeadline(
            rawId: int(item["id"]),
            title: text(item["name"]) ?? text(item["title"]) ?? "Untitled event",
            dueAt: isoTimestamp(item["timesort"]),
            formattedTime: text(item["formattedtime"]),
            courseName: text(course?["fullname"]) ?? text(course?["shortname"]) ?? text(item["course"]),
            courseId: int(course?["id"]) ?? int(item["courseid"]),
            actionURL: actionURL,
            isActionable: actionURL != nil
        )
    }

    private static func text(_ value: Any?) -> String? {
        guard let value = value as? String else {
            return nil
        }
        let cleaned = value.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
        return cleaned.isEmpty ? nil : cleaned
    }

    private static func int(_ value: Any?) -> Int? {
        if let value = value as? Int {
            return value
        }
        if let value = value as? Double, value.rounded() == value {
            return Int(value)
        }
        if let value = value as? String {
            return Int(value.trimmingCharacters(in: .whitespacesAndNewlines))
        }
        return nil
    }

    private static func bool(_ value: Any?) -> Bool? {
        if let value = value as? Bool {
            return value
        }
        if let value = value as? Int {
            return value != 0
        }
        if let value = text(value) {
            return ["1", "true", "yes"].contains(value.lowercased())
        }
        return nil
    }

    private static func urlString(_ value: Any?, baseURL: URL) -> String? {
        guard let raw = text(value),
              let url = URL(string: raw, relativeTo: baseURL)?.absoluteURL else {
            return nil
        }
        return url.absoluteString
    }

    private static func isoTimestamp(_ value: Any?) -> String? {
        guard let timestamp = int(value), timestamp > 0 else {
            return nil
        }
        return ISO8601DateFormatter().string(from: Date(timeIntervalSince1970: TimeInterval(timestamp)))
    }
}

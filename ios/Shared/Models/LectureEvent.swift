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
    var semesterCredits: SemesterCreditSummary?
}

struct SemesterCreditSummary: Codable, Equatable {
    var totalCredits: Double
    var resolvedCourseCount: Int
    var unresolvedCourseCount: Int
    var unresolvedCourseTitles: [String]

    var isComplete: Bool {
        unresolvedCourseCount == 0
    }

    var displayText: String {
        let credits = totalCredits.rounded() == totalCredits ? String(Int(totalCredits)) : String(format: "%.1f", totalCredits)
        if unresolvedCourseCount > 0 {
            return "\(credits) CP resolved, \(unresolvedCourseCount) courses missing CP"
        }
        return "\(credits) CP saved semester"
    }
}

enum SemesterCreditCounter {
    private static let creditRegex = try? NSRegularExpression(
        pattern: #"(?i)(?:^|[^0-9])(\d{1,2}(?:[,.]\d{1,2})?)\s*(?:CP|LP|ECTS)\b"#
    )

    static func summarize(_ events: [AlmaCalendarEvent]) -> SemesterCreditSummary {
        let titles = Set(events.map(\.summary).filter { !$0.isEmpty })
        var creditsByTitle: [String: Double] = [:]

        for event in events {
            guard creditsByTitle[event.summary] == nil,
                  let credits = parseCredits(from: event.detail ?? "") else {
                continue
            }
            creditsByTitle[event.summary] = credits
        }

        let unresolved = titles
            .filter { creditsByTitle[$0] == nil }
            .sorted { $0.localizedCaseInsensitiveCompare($1) == .orderedAscending }

        return SemesterCreditSummary(
            totalCredits: creditsByTitle.values.reduce(0, +),
            resolvedCourseCount: creditsByTitle.count,
            unresolvedCourseCount: unresolved.count,
            unresolvedCourseTitles: unresolved
        )
    }

    private static func parseCredits(from text: String) -> Double? {
        guard let creditRegex else {
            return nil
        }
        let fullRange = NSRange(text.startIndex..<text.endIndex, in: text)
        guard let match = creditRegex.firstMatch(in: text, range: fullRange),
              match.numberOfRanges > 1,
              let valueRange = Range(match.range(at: 1), in: text),
              let value = Double(text[valueRange].replacingOccurrences(of: ",", with: ".")) else {
            return nil
        }
        return value
    }
}

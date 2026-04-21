import Foundation

enum RecurrenceExpander {
    static func expand(
        _ events: [AlmaCalendarEvent],
        from windowStart: Date,
        to windowEnd: Date
    ) throws -> [LectureEvent] {
        var output: [LectureEvent] = []
        for event in events {
            if let rule = event.recurrenceRule, !rule.isEmpty {
                output.append(contentsOf: try expandRecurring(event, rule: rule, windowStart: windowStart, windowEnd: windowEnd))
            } else if overlapsWindow(start: event.startDate, end: event.endDate, windowStart: windowStart, windowEnd: windowEnd) {
                output.append(makeLecture(from: event, start: event.startDate))
            }
        }
        return output.sorted { lhs, rhs in
            if lhs.startDate == rhs.startDate {
                return lhs.title.localizedCaseInsensitiveCompare(rhs.title) == .orderedAscending
            }
            return lhs.startDate < rhs.startDate
        }
    }

    private static func expandRecurring(
        _ event: AlmaCalendarEvent,
        rule: String,
        windowStart: Date,
        windowEnd: Date
    ) throws -> [LectureEvent] {
        let parts = parseRule(rule)
        let frequency = parts["FREQ"] ?? ""
        guard frequency == "WEEKLY" || frequency == "DAILY" else {
            throw AlmaClientError.unsupportedRecurrence(rule)
        }

        let calendar = ICSDateParser.calendar()
        let interval = max(Int(parts["INTERVAL"] ?? "1") ?? 1, 1)
        let until = parts["UNTIL"].flatMap { ICSDateParser.parseUntil($0, defaultTimeZone: calendar.timeZone) } ?? windowEnd
        let maxDate = min(until, windowEnd)
        let byDays = parseWeekdays(parts["BYDAY"], fallback: calendar.component(.weekday, from: event.startDate))
        let duration = event.endDate.map { $0.timeIntervalSince(event.startDate) }

        let countLimit = Int(parts["COUNT"] ?? "")
        var generatedCount = 0
        var cursor = event.startDate
        var lectures: [LectureEvent] = []

        while cursor <= maxDate {
            defer { cursor = calendar.date(byAdding: .day, value: 1, to: cursor) ?? maxDate.addingTimeInterval(1) }
            guard frequency == "DAILY" || byDays.contains(calendar.component(.weekday, from: cursor)) else { continue }

            let daysSinceStart = calendar.dateComponents([.day], from: calendar.startOfDay(for: event.startDate), to: calendar.startOfDay(for: cursor)).day ?? 0
            let intervalMatches = frequency == "DAILY" ? daysSinceStart % interval == 0 : (daysSinceStart / 7) % interval == 0
            guard intervalMatches, !event.excludedStarts.contains(cursor) else { continue }
            generatedCount += 1
            if let countLimit, generatedCount > countLimit {
                break
            }
            var occurrence = event
            occurrence.endDate = duration.map { cursor.addingTimeInterval($0) }
            guard overlapsWindow(start: cursor, end: occurrence.endDate, windowStart: windowStart, windowEnd: windowEnd) else {
                continue
            }
            lectures.append(makeLecture(from: occurrence, start: cursor))
        }

        return lectures
    }

    private static func overlapsWindow(start: Date, end: Date?, windowStart: Date, windowEnd: Date) -> Bool {
        let effectiveEnd = max(end ?? start, start)
        return start <= windowEnd && effectiveEnd >= windowStart
    }

    private static func makeLecture(from event: AlmaCalendarEvent, start: Date) -> LectureEvent {
        LectureEvent(
            id: "\(event.uid ?? event.summary)-\(Int(start.timeIntervalSince1970))",
            title: event.summary.isEmpty ? "Untitled lecture" : event.summary,
            startDate: start,
            endDate: event.endDate,
            location: event.location,
            detail: event.detail
        )
    }

    private static func parseRule(_ rule: String) -> [String: String] {
        Dictionary(uniqueKeysWithValues: rule.split(separator: ";").compactMap { part in
            let pieces = part.split(separator: "=", maxSplits: 1).map(String.init)
            return pieces.count == 2 ? (pieces[0].uppercased(), pieces[1]) : nil
        })
    }

    private static func parseWeekdays(_ raw: String?, fallback: Int) -> Set<Int> {
        let map = ["SU": 1, "MO": 2, "TU": 3, "WE": 4, "TH": 5, "FR": 6, "SA": 7]
        guard let raw, !raw.isEmpty else {
            return [fallback]
        }
        return Set(raw.split(separator: ",").compactMap { map[String($0.suffix(2)).uppercased()] })
    }
}

import Foundation

enum ICSEventParser {
    static func parse(_ rawICS: String) throws -> [AlmaCalendarEvent] {
        let properties = ICSLineParser.properties(from: rawICS)
        var events: [AlmaCalendarEvent] = []
        var current: [String: [ICSProperty]]?

        for property in properties {
            if property.name == "BEGIN", property.value == "VEVENT" {
                current = [:]
                continue
            }
            if property.name == "END", property.value == "VEVENT" {
                if let current, let event = parseEvent(current) {
                    events.append(event)
                }
                current = nil
                continue
            }
            current?[property.name, default: []].append(property)
        }

        return events
    }

    private static func parseEvent(_ fields: [String: [ICSProperty]]) -> AlmaCalendarEvent? {
        guard let start = fields["DTSTART"]?.first,
              let startDate = ICSDateParser.parse(start.value, parameters: start.parameters) else {
            return nil
        }

        let endDate = fields["DTEND"]?.first.flatMap {
            ICSDateParser.parse($0.value, parameters: $0.parameters)
        }

        let excluded = Set((fields["EXDATE"] ?? []).flatMap { property in
            property.value
                .split(separator: ",")
                .compactMap { ICSDateParser.parse(String($0), parameters: property.parameters) }
        })

        return AlmaCalendarEvent(
            summary: text(fields["SUMMARY"]?.first),
            startDate: startDate,
            endDate: endDate,
            location: optionalText(fields["LOCATION"]?.first),
            detail: optionalText(fields["DESCRIPTION"]?.first),
            uid: optionalText(fields["UID"]?.first),
            recurrenceRule: fields["RRULE"]?.first?.value,
            excludedStarts: excluded
        )
    }

    private static func text(_ property: ICSProperty?) -> String {
        optionalText(property) ?? ""
    }

    private static func optionalText(_ property: ICSProperty?) -> String? {
        guard let value = property?.value, !value.isEmpty else {
            return nil
        }
        return ICSLineParser.decodeText(value)
    }
}

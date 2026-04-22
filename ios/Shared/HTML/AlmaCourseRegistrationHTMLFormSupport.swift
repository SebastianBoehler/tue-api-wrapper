import Foundation

struct AlmaHTMLFormBlock {
    var tag: String
    var body: String
}

enum AlmaCourseRegistrationHTMLFormSupport {
    static let registrationAction = "ANMELDUNG"
    static let detailActionFields: Set<String> = [
        "unitId",
        "periodUsageId",
        "planelementId",
        "wunschVerbuchungspfad",
        "belegungsAktion"
    ]
    private static let assignmentRowLimitSuffixes = [
        ":modules:moduleAssignments:moduleAssignmentsNavi2NumRowsInput",
        ":courseOfStudies:courseOfStudyAssignments:courseOfStudyAssignmentsNavi2NumRowsInput"
    ]

    static func form(named name: String, in html: String) -> AlmaHTMLFormBlock? {
        for match in HTMLRegex.matches(#"(<form\b[^>]*>)(.*?)</form>"#, in: html) {
            guard let tagRange = Range(match.range(at: 1), in: html),
                  let bodyRange = Range(match.range(at: 2), in: html) else {
                continue
            }
            let tag = String(html[tagRange])
            if HTMLRegex.attribute("id", in: tag) == name || HTMLRegex.attribute("name", in: tag) == name {
                return AlmaHTMLFormBlock(tag: tag, body: String(html[bodyRange]))
            }
        }
        return nil
    }

    static func formPayload(in html: String) -> [String: String] {
        var payload: [String: String] = [:]

        for input in HTMLRegex.matches(#"<input\b[^>]*>"#, in: html) {
            guard let range = Range(input.range(at: 0), in: html) else { continue }
            let tag = String(html[range])
            guard let name = HTMLRegex.attribute("name", in: tag), !name.isEmpty else { continue }
            let type = HTMLRegex.attribute("type", in: tag)?.lowercased()
            if ["button", "file", "image", "password", "reset", "submit"].contains(type) { continue }
            payload[name] = HTMLRegex.attribute("value", in: tag) ?? ""
        }

        for select in HTMLRegex.matches(#"(<select\b[^>]*>)(.*?)</select>"#, in: html) {
            guard let tagRange = Range(select.range(at: 1), in: html),
                  let bodyRange = Range(select.range(at: 2), in: html) else {
                continue
            }
            let tag = String(html[tagRange])
            guard let name = HTMLRegex.attribute("name", in: tag), !name.isEmpty else { continue }
            payload[name] = selectedOptionValue(in: String(html[bodyRange]))
        }

        for area in HTMLRegex.matches(#"(<textarea\b[^>]*>)(.*?)</textarea>"#, in: html) {
            guard let tagRange = Range(area.range(at: 1), in: html),
                  let bodyRange = Range(area.range(at: 2), in: html) else {
                continue
            }
            let tag = String(html[tagRange])
            guard let name = HTMLRegex.attribute("name", in: tag), !name.isEmpty else { continue }
            payload[name] = HTMLText.decodeEntities(String(html[bodyRange]))
        }

        return payload
    }

    static func controlBlocks(in html: String) -> [String] {
        let patterns = [#"<button\b[^>]*>.*?</button>"#, #"<input\b[^>]*>"#, #"<a\b[^>]*>.*?</a>"#]
        return patterns.flatMap { pattern in
            HTMLRegex.matches(pattern, in: html).compactMap { match in
                Range(match.range(at: 0), in: html).map { String(html[$0]) }
            }
        }
    }

    static func rowScopes(in html: String) -> [String] {
        let rows = HTMLRegex.matches(#"<tr\b[^>]*>.*?</tr>"#, in: html).compactMap { match in
            Range(match.range(at: 0), in: html).map { String(html[$0]) }
        }
        return rows.isEmpty ? [html] : rows
    }

    static func findRegistrationStartTarget(in html: String) -> (String?, [String: String]) {
        for control in controlBlocks(in: html) {
            let identity = controlIdentity(for: control)
            guard identity.contains("anmeld") || identity.contains("beleg") else {
                continue
            }
            let fields = jsFields(from: control)
            let target = HTMLRegex.attribute("name", in: control)
                ?? HTMLRegex.attribute("id", in: control)
                ?? fields.keys.first(where: { $0.hasSuffix(":anmelden") })
            return (target, fields)
        }
        return (nil, [:])
    }

    static func registrationConfirmActionName(for control: String) -> String? {
        let name = HTMLRegex.attribute("name", in: control) ?? HTMLRegex.attribute("id", in: control)
        let identity = controlIdentity(for: control)
        if let name, identity.contains("anmeld") || identity.contains("beleg") || name.lowercased().contains("anechtzeit") {
            return name
        }
        return jsFields(from: control).keys.first(where: { $0.lowercased().hasSuffix(":anechtzeit") })
    }

    static func extractPlanelementID(from control: String, scope: String) -> String? {
        if let value = jsFields(from: control)["planelementId"], !value.isEmpty {
            return value
        }
        return HTMLRegex.firstCapture(#"<input\b[^>]*name\s*=\s*['"]planelementId['"][^>]*value\s*=\s*['"](.*?)['"]"#, in: scope)
    }

    static func selectOption(
        from options: [AlmaCourseRegistrationOption],
        planelementID: String?
    ) throws -> AlmaCourseRegistrationOption {
        guard !options.isEmpty else {
            throw AlmaClientError.courseRegistration("Alma did not expose a selectable course-registration path.")
        }
        let requested = planelementID?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if !requested.isEmpty, let selected = options.first(where: { $0.planelementID == requested }) {
            return selected
        }
        if !requested.isEmpty {
            throw AlmaClientError.courseRegistration("Unknown Alma course-registration path '\(requested)'.")
        }
        if options.count > 1 {
            throw AlmaClientError.courseRegistration("Multiple Alma course-registration paths are available; choose one in Alma directly.")
        }
        return options[0]
    }

    static func setAssignmentRowLimits(in payload: inout [String: String]) {
        for key in payload.keys where assignmentRowLimitSuffixes.contains(where: key.hasSuffix) {
            payload[key] = "300"
        }
    }

    static func fillDetailIdentifiers(in payload: inout [String: String], pageURL: URL) {
        let items = URLComponents(url: pageURL, resolvingAgainstBaseURL: false)?.queryItems ?? []
        for name in ["unitId", "periodUsageId", "planelementId"] where payload[name]?.isEmpty != false {
            payload[name] = items.first(where: { $0.name == name })?.value ?? ""
        }
        payload["wunschVerbuchungspfad"] = payload["wunschVerbuchungspfad"] ?? ""
    }

    static func optionLabel(from html: String, fallbackIndex: Int) -> String {
        let label = HTMLText.stripTags(html).replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
        return label.isEmpty ? "Registration path \(fallbackIndex)" : label
    }

    static func resolveURL(from rawURL: String, pageURL: URL) throws -> URL {
        guard let url = URL(string: rawURL, relativeTo: pageURL)?.absoluteURL else {
            throw AlmaClientError.invalidURL
        }
        return url
    }

    private static func selectedOptionValue(in html: String) -> String {
        for option in HTMLRegex.matches(#"<option\b[^>]*>(.*?)</option>"#, in: html) {
            guard let range = Range(option.range(at: 0), in: html) else { continue }
            let tag = String(html[range])
            if tag.localizedCaseInsensitiveContains("selected") {
                return HTMLRegex.attribute("value", in: tag) ?? ""
            }
        }
        return ""
    }

    private static func jsFields(from control: String) -> [String: String] {
        let onclick = HTMLRegex.attribute("onclick", in: control) ?? ""
        var fields: [String: String] = [:]
        for match in HTMLRegex.matches(#"['"]([^'"]+)['"]\s*:\s*['"]([^'"]*)['"]"#, in: onclick) {
            guard let keyRange = Range(match.range(at: 1), in: onclick),
                  let valueRange = Range(match.range(at: 2), in: onclick) else {
                continue
            }
            let key = String(onclick[keyRange]).removingPercentEncoding ?? String(onclick[keyRange])
            let value = String(onclick[valueRange]).removingPercentEncoding ?? String(onclick[valueRange])
            fields[key] = value
        }
        return fields
    }

    private static func controlIdentity(for control: String) -> String {
        [
            HTMLRegex.attribute("name", in: control) ?? "",
            HTMLRegex.attribute("id", in: control) ?? "",
            HTMLRegex.attribute("value", in: control) ?? "",
            HTMLRegex.attribute("title", in: control) ?? "",
            HTMLRegex.attribute("aria-label", in: control) ?? "",
            HTMLText.stripTags(control),
            HTMLRegex.attribute("onclick", in: control) ?? ""
        ]
        .joined(separator: " ")
        .lowercased()
    }
}

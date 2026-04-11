import Foundation

enum AlmaHTMLParser {
    static func extractLoginForm(from html: String, pageURL: URL) throws -> AlmaLoginForm {
        for formBlock in blocks(named: "form", in: html) {
            guard let opening = openingTag(named: "form", in: formBlock),
                  ["loginForm", "mobileLoginForm"].contains(HTMLRegex.attribute("id", in: opening)) else {
                continue
            }
            let action = HTMLRegex.attribute("action", in: opening) ?? ""
            guard let actionURL = URL(string: action, relativeTo: pageURL)?.absoluteURL else {
                throw AlmaClientError.loginFormMissing
            }

            var payload: [String: String] = [:]
            for input in HTMLRegex.matches("<input\\b[^>]*>", in: formBlock) {
                guard let range = Range(input.range, in: formBlock) else { continue }
                let tag = String(formBlock[range])
                guard let name = HTMLRegex.attribute("name", in: tag), !name.isEmpty else {
                    continue
                }
                let type = HTMLRegex.attribute("type", in: tag)?.lowercased()
                if type == "checkbox" || type == "button" {
                    continue
                }
                payload[name] = HTMLRegex.attribute("value", in: tag) ?? ""
            }

            payload["submit", default: ""] = ""
            return AlmaLoginForm(actionURL: actionURL, payload: payload)
        }

        throw AlmaClientError.loginFormMissing
    }

    static func looksLoggedOut(_ html: String) -> Bool {
        if html.range(of: #"<body[^>]*class=['"][^'"]*notloggedin"#, options: [.regularExpression, .caseInsensitive]) != nil {
            return true
        }
        return html.range(of: #"<form[^>]*id=['"]loginForm['"]"#, options: [.regularExpression, .caseInsensitive]) != nil
    }

    static func extractLoginError(from html: String) -> String? {
        let text = HTMLText.stripTags(html)
        guard let range = text.range(of: #"Fehler:\s*(.+?)(Studierende, die aktuell|$)"#, options: .regularExpression) else {
            return nil
        }
        let fragment = String(text[range])
            .replacingOccurrences(of: #"^Fehler:\s*"#, with: "", options: .regularExpression)
            .replacingOccurrences(of: #"Studierende, die aktuell.*$"#, with: "", options: .regularExpression)
        return fragment.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    static func extractTerms(from html: String) throws -> [AlmaTerm] {
        let target = "plan:scheduleConfiguration:anzeigeoptionen:changeTerm_input"
        for select in blocks(named: "select", in: html) {
            guard let opening = openingTag(named: "select", in: select),
                  HTMLRegex.attribute("name", in: opening) == target else {
                continue
            }
            return parseOptions(in: select)
        }
        throw AlmaClientError.timetableMissing("Could not find the timetable term selector.")
    }

    static func extractExportURL(from html: String) throws -> String {
        let target = "plan:scheduleConfiguration:anzeigeoptionen:ical:cal_add"
        for textarea in blocks(named: "textarea", in: html) {
            guard let opening = openingTag(named: "textarea", in: textarea),
                  HTMLRegex.attribute("name", in: opening) == target,
                  let body = HTMLRegex.firstCapture("<textarea\\b[^>]*>(.*?)</textarea>", in: textarea) else {
                continue
            }
            let value = HTMLText.decodeEntities(body).trimmingCharacters(in: .whitespacesAndNewlines)
            if !value.isEmpty {
                return value
            }
        }
        throw AlmaClientError.timetableMissing("Could not find the timetable iCalendar export field.")
    }

    private static func parseOptions(in select: String) -> [AlmaTerm] {
        HTMLRegex.matches("<option\\b[^>]*>(.*?)</option>", in: select).compactMap { match in
            guard let fullRange = Range(match.range(at: 0), in: select),
                  let labelRange = Range(match.range(at: 1), in: select) else {
                return nil
            }
            let tag = String(select[fullRange])
            let value = HTMLRegex.attribute("value", in: tag)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            let label = HTMLText.stripTags(String(select[labelRange]))
            guard !value.isEmpty, !label.isEmpty else {
                return nil
            }
            return AlmaTerm(label: label, value: value, isSelected: tag.localizedCaseInsensitiveContains("selected"))
        }
    }

    private static func blocks(named name: String, in html: String) -> [String] {
        let pattern = "<\(name)\\b[^>]*>.*?</\(name)>"
        return HTMLRegex.matches(pattern, in: html).compactMap { match in
            Range(match.range, in: html).map { String(html[$0]) }
        }
    }

    private static func openingTag(named name: String, in block: String) -> String? {
        HTMLRegex.firstCapture("(<\(name)\\b[^>]*>)", in: block)
    }
}

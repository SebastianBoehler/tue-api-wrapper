import Foundation

enum AlmaCurrentLecturesParser {
    static func extractForm(from html: String, pageURL: URL) throws -> AlmaCurrentLecturesForm {
        guard let form = formBlock(in: html),
              let opening = HTMLRegex.firstCapture("(<form\\b[^>]*>)", in: form) else {
            throw AlmaClientError.timetableMissing("Could not find the Alma current-lectures form.")
        }

        var payload: [(String, String)] = []
        var checkboxName: String?
        var checkboxValues: [String] = []
        var checkedValues: [String] = []

        for field in fieldTags(in: form) {
            guard let name = HTMLRegex.attribute("name", in: field), !name.isEmpty else { continue }

            if field.lowercased().hasPrefix("<select") {
                payload.append((name, selectedOptionValue(in: field) ?? ""))
                continue
            }

            let type = HTMLRegex.attribute("type", in: field)?.lowercased()
            if ["button", "file", "image", "password", "radio", "reset", "submit"].contains(type) {
                continue
            }
            if type == "checkbox" {
                let value = HTMLRegex.attribute("value", in: field) ?? "true"
                checkboxName = name
                checkboxValues.append(value)
                if field.localizedCaseInsensitiveContains("checked") {
                    checkedValues.append(value)
                }
                continue
            }
            payload.append((name, HTMLRegex.attribute("value", in: field) ?? ""))
        }

        guard let dateName = firstName(in: form, suffix: ":date"),
              let searchName = firstName(in: form, suffix: ":searchButtonId") else {
            throw AlmaClientError.timetableMissing("Could not identify the Alma current-lectures search fields.")
        }

        let action = HTMLRegex.attribute("action", in: opening) ?? pageURL.absoluteString
        guard let actionURL = URL(string: action, relativeTo: pageURL)?.absoluteURL else {
            throw AlmaClientError.invalidURL
        }

        return AlmaCurrentLecturesForm(
            actionURL: actionURL,
            payload: payload,
            dateFieldName: dateName,
            searchButtonName: searchName,
            filterFieldName: checkboxName,
            filterValues: checkedValues.isEmpty && checkboxValues.contains("selectAllCourses") ? ["selectAllCourses"] : checkedValues
        )
    }

    static func parsePage(_ html: String, pageURL: URL) throws -> AlmaCurrentLecturesPage {
        let selectedDate = firstTag(in: html, tagName: "input", nameSuffix: ":date")
            .flatMap { HTMLRegex.attribute("value", in: $0) }
        guard let table = lectureTable(in: html) else {
            if html.contains("Tagesaktuelle Veranstaltungen anzeigen") {
                return AlmaCurrentLecturesPage(pageURL: pageURL, selectedDate: selectedDate, results: [])
            }
            throw AlmaClientError.timetableMissing("The response did not look like an Alma current-lectures page.")
        }

        let rows = HTMLRegex.matches("<tr\\b[^>]*>.*?</tr>", in: table).compactMap { match -> AlmaCurrentLecture? in
            guard let range = Range(match.range, in: table) else { return nil }
            return parseRow(String(table[range]), pageURL: pageURL)
        }
        return AlmaCurrentLecturesPage(pageURL: pageURL, selectedDate: selectedDate, results: rows)
    }

    private static func parseRow(_ row: String, pageURL: URL) -> AlmaCurrentLecture? {
        let cells = HTMLRegex.matches("<td\\b[^>]*>.*?</td>", in: row).compactMap { match -> String? in
            Range(match.range, in: row).map { String(row[$0]) }
        }
        guard cells.count >= 13 else { return nil }

        let values = cells.map { cell in
            let text = HTMLText.stripTags(cell)
            return text.isEmpty ? nil : text
        }
        let href = (linkHref(in: cells[1]) ?? linkHref(in: cells[0])).flatMap { URL(string: $0, relativeTo: pageURL)?.absoluteURL }
        let title = values[1] ?? "-"
        let rowID = [title, values[2], values[3], values[4]].compactMap(\.self).joined(separator: "|")

        return AlmaCurrentLecture(
            id: rowID,
            title: title,
            detailURL: href,
            start: values[2],
            end: values[3],
            number: values[4],
            parallelGroup: values[5],
            eventType: values[6],
            responsibleLecturer: values[7],
            lecturer: values[8],
            building: values[9],
            room: values[10],
            semester: values[11],
            remark: values[12]
        )
    }

    private static func formBlock(in html: String) -> String? {
        HTMLRegex.matches("<form\\b[^>]*id=(['\"])showEventsAndExaminationsOnDateForm\\1[^>]*>.*?</form>", in: html)
            .first
            .flatMap { Range($0.range, in: html).map { String(html[$0]) } }
    }

    private static func lectureTable(in html: String) -> String? {
        HTMLRegex.matches("<table\\b[^>]*id=(['\"])[^'\"]*coursesAndExaminationsOnDateListTableTable\\1[^>]*>.*?</table>", in: html)
            .first
            .flatMap { Range($0.range, in: html).map { String(html[$0]) } }
    }

    private static func selectedOptionValue(in select: String) -> String? {
        HTMLRegex.matches("<option\\b[^>]*selected[^>]*>", in: select)
            .first
            .flatMap { Range($0.range, in: select).map { HTMLRegex.attribute("value", in: String(select[$0])) } } ?? nil
    }

    private static func firstName(in html: String, suffix: String) -> String? {
        firstTag(in: html, tagName: "input", nameSuffix: suffix)
            .flatMap { HTMLRegex.attribute("name", in: $0) }
            ?? firstTag(in: html, tagName: "button", nameSuffix: suffix)
            .flatMap { HTMLRegex.attribute("name", in: $0) }
    }

    private static func firstTag(in html: String, tagName: String, nameSuffix: String) -> String? {
        HTMLRegex.matches("<\(tagName)\\b[^>]*>", in: html).compactMap { match in
            Range(match.range, in: html).map { String(html[$0]) }
        }.first { tag in
            HTMLRegex.attribute("name", in: tag)?.hasSuffix(nameSuffix) == true
        }
    }

    private static func fieldTags(in html: String) -> [String] {
        var fields: [(Int, String)] = []
        for pattern in ["<input\\b[^>]*>", "<select\\b[^>]*>.*?</select>"] {
            for match in HTMLRegex.matches(pattern, in: html) {
                guard let range = Range(match.range, in: html) else { continue }
                fields.append((match.range.location, String(html[range])))
            }
        }
        return fields.sorted { $0.0 < $1.0 }.map(\.1)
    }

    private static func linkHref(in html: String) -> String? {
        HTMLRegex.firstCapture(#"<a\b[^>]*href=(['"])(.*?)\1"#, in: html, group: 2).map(HTMLText.decodeEntities)
    }
}

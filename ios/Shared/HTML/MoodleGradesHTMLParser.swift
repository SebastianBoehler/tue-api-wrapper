import Foundation

enum MoodleGradesHTMLParser {
    static func parse(_ html: String, pageURL: URL, limit: Int) -> MoodleGradesResponse {
        let rows = tableRows(in: html)
        let items = rows.compactMap { cells, row -> MoodleGradeItem? in
            let values = cells
                .map(HTMLText.stripTags)
                .filter { !$0.isEmpty }
            guard !values.isEmpty else {
                return nil
            }

            let link = gradeLink(in: row)
            let courseTitle = link.text.flatMap { $0.isEmpty ? nil : $0 } ?? values[0]
            let tail = values.filter { $0 != courseTitle }
            return MoodleGradeItem(
                courseTitle: courseTitle,
                grade: tail.value(at: 0),
                percentage: tail.value(at: 1),
                rangeHint: tail.value(at: 2),
                rank: tail.value(at: 3),
                feedback: tail.value(at: 4),
                url: link.href.flatMap { URL(string: $0, relativeTo: pageURL)?.absoluteString }
            )
        }

        return MoodleGradesResponse(
            sourceURL: pageURL.absoluteString,
            items: Array(items.prefix(max(1, limit)))
        )
    }

    private static func tableRows(in html: String) -> [(cells: [String], row: String)] {
        for table in tableBlocks(in: html) {
            let headers = HTMLRegex.matches("<th\\b[^>]*>.*?</th>", in: table).compactMap { match -> String? in
                Range(match.range, in: table).map { HTMLText.stripTags(String(table[$0])).lowercased() }
            }
            if !headers.isEmpty && !headers.contains(where: containsGradeKeyword) {
                continue
            }

            let rows = HTMLRegex.matches("<tr\\b[^>]*>.*?</tr>", in: table).compactMap { match -> ([String], String)? in
                guard let range = Range(match.range, in: table) else {
                    return nil
                }
                let row = String(table[range])
                if row.range(of: "<th\\b", options: [.regularExpression, .caseInsensitive]) != nil {
                    return nil
                }
                let cells = HTMLRegex.matches("<t[dh]\\b[^>]*>.*?</t[dh]>", in: row).compactMap { cellMatch in
                    Range(cellMatch.range, in: row).map { String(row[$0]) }
                }
                return cells.count >= 2 ? (cells, row) : nil
            }
            if !rows.isEmpty {
                return rows
            }
        }
        return []
    }

    private static func containsGradeKeyword(_ header: String) -> Bool {
        ["grade", "bewertung", "course", "kurs"].contains { header.contains($0) }
    }

    private static func gradeLink(in row: String) -> (href: String?, text: String?) {
        for match in HTMLRegex.matches("<a\\b[^>]*>.*?</a>", in: row) {
            guard let range = Range(match.range, in: row) else {
                continue
            }
            let anchor = String(row[range])
            guard let href = HTMLRegex.attribute("href", in: anchor),
                  href.contains("/course/view.php") || href.contains("/grade/") else {
                continue
            }
            return (href, HTMLText.stripTags(anchor))
        }
        return (nil, nil)
    }

    private static func tableBlocks(in html: String) -> [String] {
        HTMLRegex.matches("<table\\b[^>]*>.*?</table>", in: html).compactMap { match in
            Range(match.range, in: html).map { String(html[$0]) }
        }
    }
}

private extension Array {
    func value(at index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}

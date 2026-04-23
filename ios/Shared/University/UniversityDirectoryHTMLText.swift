import Foundation

extension String {
    var normalizedDirectoryText: String {
        var value = self
        value = value.replacingOccurrences(
            of: #"<img\b[^>]*alt\s*=\s*(['"])At\1[^>]*>"#,
            with: "@",
            options: [.regularExpression, .caseInsensitive]
        )
        value = value.replacingOccurrences(of: #"<br\s*/?>"#, with: "\n", options: [.regularExpression, .caseInsensitive])
        value = value.replacingOccurrences(of: #"(?i)</p\s*>"#, with: "\n", options: .regularExpression)
        value = value.replacingOccurrences(of: #"(?i)</div\s*>"#, with: "\n", options: .regularExpression)
        value = value.replacingOccurrences(of: #"<[^>]+>"#, with: "", options: .regularExpression)
        value = HTMLText.decodeEntities(value)

        let lines = value
            .replacingOccurrences(of: "\r", with: "")
            .components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        return lines.joined(separator: "\n")
    }
}

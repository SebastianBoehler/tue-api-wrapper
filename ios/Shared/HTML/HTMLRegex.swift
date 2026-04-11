import Foundation

enum HTMLRegex {
    static func matches(_ pattern: String, in text: String) -> [NSTextCheckingResult] {
        guard let regex = try? NSRegularExpression(
            pattern: pattern,
            options: [.caseInsensitive, .dotMatchesLineSeparators]
        ) else {
            return []
        }
        return regex.matches(in: text, range: NSRange(text.startIndex..., in: text))
    }

    static func firstCapture(_ pattern: String, in text: String, group: Int = 1) -> String? {
        guard let match = matches(pattern, in: text).first,
              match.numberOfRanges > group,
              let range = Range(match.range(at: group), in: text) else {
            return nil
        }
        return String(text[range])
    }

    static func attribute(_ name: String, in tag: String) -> String? {
        let escaped = NSRegularExpression.escapedPattern(for: name)
        let pattern = "\\b\(escaped)\\s*=\\s*(['\"])(.*?)\\1"
        return firstCapture(pattern, in: tag, group: 2).map(HTMLText.decodeEntities)
    }
}

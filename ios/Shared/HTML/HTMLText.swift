import Foundation

enum HTMLText {
    static func decodeEntities(_ value: String) -> String {
        var result = value
            .replacingOccurrences(of: "&amp;", with: "&")
            .replacingOccurrences(of: "&lt;", with: "<")
            .replacingOccurrences(of: "&gt;", with: ">")
            .replacingOccurrences(of: "&quot;", with: "\"")
            .replacingOccurrences(of: "&#39;", with: "'")
            .replacingOccurrences(of: "&apos;", with: "'")

        result = replaceNumericEntities(in: result)
        return result
    }

    static func stripTags(_ value: String) -> String {
        let stripped = value.replacingOccurrences(
            of: "<[^>]+>",
            with: "",
            options: .regularExpression
        )
        return decodeEntities(stripped)
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func replaceNumericEntities(in value: String) -> String {
        let pattern = #"&#(x?[0-9A-Fa-f]+);"#
        guard let regex = try? NSRegularExpression(pattern: pattern) else {
            return value
        }

        var output = value
        let matches = regex.matches(in: value, range: NSRange(value.startIndex..., in: value)).reversed()
        for match in matches {
            guard let fullRange = Range(match.range(at: 0), in: output),
                  let codeRange = Range(match.range(at: 1), in: output) else {
                continue
            }
            let raw = String(output[codeRange])
            let radix = raw.hasPrefix("x") ? 16 : 10
            let digits = raw.hasPrefix("x") ? String(raw.dropFirst()) : raw
            guard let scalarValue = UInt32(digits, radix: radix),
                  let scalar = UnicodeScalar(scalarValue) else {
                continue
            }
            output.replaceSubrange(fullRange, with: String(Character(scalar)))
        }
        return output
    }
}

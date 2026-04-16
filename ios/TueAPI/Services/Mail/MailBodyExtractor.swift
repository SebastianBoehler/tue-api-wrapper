import Foundation

enum MailBodyExtractor {
    static func bodyText(from part: MIMEPart) -> String? {
        let leaves = leafParts(from: part)
        if let plain = leaves.first(where: { isText($0, subtype: "plain") && !$0.isAttachment }),
           let text = decodedText(from: plain)?.trimmedOrNil {
            return normalize(text)
        }

        if let html = leaves.first(where: { isText($0, subtype: "html") && !$0.isAttachment }),
           let text = decodedText(from: html)?.trimmedOrNil {
            return normalize(htmlToText(text))
        }

        return nil
    }

    static func preview(from part: MIMEPart, limit: Int = 160) -> String? {
        guard let body = bodyText(from: part) else { return nil }
        let collapsed = body
            .split(whereSeparator: \.isWhitespace)
            .joined(separator: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard !collapsed.isEmpty else { return nil }
        return String(collapsed.prefix(limit))
    }

    static func attachmentNames(from part: MIMEPart) -> [String] {
        leafParts(from: part).compactMap { leaf in
            guard leaf.isAttachment else { return nil }
            if let filename = leaf.parameter("filename", in: leaf.contentDisposition) {
                return filename
            }
            return leaf.parameter("name", in: leaf.contentType)
        }
        .map { MailHeaderDecoder.decode($0) }
        .filter { !$0.isEmpty }
    }

    private static func leafParts(from part: MIMEPart) -> [MIMEPart] {
        let children = part.childParts()
        guard !children.isEmpty else {
            return [part]
        }
        return children.flatMap(leafParts)
    }

    private static func isText(_ part: MIMEPart, subtype: String) -> Bool {
        part.contentType.lowercased().hasPrefix("text/\(subtype)")
    }

    private static func decodedText(from part: MIMEPart) -> String? {
        let text = MailHeaderDecoder.decodeBody(
            part.body,
            transferEncoding: part.header("Content-Transfer-Encoding"),
            charset: part.parameter("charset", in: part.contentType)
        )
        return text.isEmpty ? nil : text
    }

    private static func htmlToText(_ value: String) -> String {
        value
            .replacingOccurrences(of: #"(?i)<br\s*/?>"#, with: "\n", options: .regularExpression)
            .replacingOccurrences(
                of: #"(?i)</(p|div|li|tr|h1|h2|h3|h4|h5|h6|blockquote)>"#,
                with: "\n",
                options: .regularExpression
            )
            .replacingOccurrences(of: #"(?i)<li[^>]*>"#, with: "- ", options: .regularExpression)
            .replacingOccurrences(of: #"<[^>]+>"#, with: "", options: .regularExpression)
            .replacingOccurrences(of: "&nbsp;", with: " ")
            .replacingOccurrences(of: "&amp;", with: "&")
            .replacingOccurrences(of: "&lt;", with: "<")
            .replacingOccurrences(of: "&gt;", with: ">")
            .replacingOccurrences(of: "&quot;", with: "\"")
    }

    private static func normalize(_ value: String) -> String? {
        var lines: [String] = []
        var blankStreak = 0

        for line in value
            .replacingOccurrences(of: "\r\n", with: "\n")
            .replacingOccurrences(of: "\r", with: "\n")
            .split(separator: "\n", omittingEmptySubsequences: false) {
            let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.isEmpty {
                blankStreak += 1
                if blankStreak <= 1 {
                    lines.append("")
                }
                continue
            }

            blankStreak = 0
            lines.append(trimmed)
        }

        return lines.joined(separator: "\n").trimmedOrNil
    }
}

import Foundation

struct MailBodyContent {
    var text: String?
    var universityApprovalNotice: MailUniversityApprovalNotice?
}

enum MailBodyExtractor {
    static func bodyContent(from part: MIMEPart) -> MailBodyContent {
        let leaves = leafParts(from: part)
        if let plain = leaves.first(where: { isText($0, subtype: "plain") && !$0.isAttachment }),
           let text = decodedText(from: plain)?.trimmedOrNil {
            return normalizedContent(text)
        }

        if let html = leaves.first(where: { isText($0, subtype: "html") && !$0.isAttachment }),
           let text = decodedText(from: html)?.trimmedOrNil {
            return normalizedContent(htmlToText(text))
        }

        return MailBodyContent(text: nil, universityApprovalNotice: nil)
    }

    static func bodyText(from part: MIMEPart) -> String? {
        bodyContent(from: part).text
    }

    static func preview(from part: MIMEPart, limit: Int = 160) -> String? {
        preview(from: bodyContent(from: part), limit: limit)
    }

    static func preview(from content: MailBodyContent, limit: Int = 160) -> String? {
        guard let body = content.text else { return nil }
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

    private static func normalizedContent(_ value: String) -> MailBodyContent {
        guard let normalized = normalize(value) else {
            return MailBodyContent(text: nil, universityApprovalNotice: nil)
        }
        return stripUniversityApprovalBanner(from: normalized)
    }

    private static func stripUniversityApprovalBanner(from value: String) -> MailBodyContent {
        let lines = value.components(separatedBy: "\n")
        guard let firstContentIndex = lines.firstIndex(where: { !$0.trimmedForBanner.isEmpty }),
              firstContentIndex < lines.count - 3,
              isBannerSeparator(lines[firstContentIndex]) else {
            return MailBodyContent(text: value, universityApprovalNotice: nil)
        }

        let approvalLine = bannerText(lines[firstContentIndex + 1])
        let responsibilityLine = bannerText(lines[firstContentIndex + 2])
        guard approvalLine.contains("Die Hochschulleitung hat dem Versand dieser Rundmail zugestimmt"),
              responsibilityLine.contains("Die inhaltliche Verantwortung liegt bei der Absenderin/dem Absender"),
              isBannerSeparator(lines[firstContentIndex + 3]) else {
            return MailBodyContent(text: value, universityApprovalNotice: nil)
        }

        let remainingStart = firstBodyLineIndex(in: lines, after: firstContentIndex + 3)
        let body = lines[remainingStart...].joined(separator: "\n").trimmedOrNil
        let notice = MailUniversityApprovalNotice(
            title: "Approved university broadcast",
            message: "Die Hochschulleitung hat dem Versand dieser Rundmail zugestimmt."
        )
        return MailBodyContent(text: body, universityApprovalNotice: notice)
    }

    private static func firstBodyLineIndex(in lines: [String], after bannerEndIndex: Int) -> Int {
        var index = bannerEndIndex + 1
        while index < lines.count && lines[index].trimmedForBanner.isEmpty {
            index += 1
        }
        return min(index, lines.count)
    }

    private static func isBannerSeparator(_ value: String) -> Bool {
        let trimmed = value.trimmedForBanner
        guard trimmed.count >= 10 else { return false }
        return trimmed.allSatisfy { $0 == "*" }
    }

    private static func bannerText(_ value: String) -> String {
        value.trimmedForBanner
            .trimmingCharacters(in: CharacterSet(charactersIn: "*"))
            .trimmingCharacters(in: .whitespacesAndNewlines)
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

private extension String {
    var trimmedForBanner: String {
        trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

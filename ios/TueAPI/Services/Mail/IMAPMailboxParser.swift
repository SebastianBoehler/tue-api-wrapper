import Foundation

enum IMAPMailboxParser {
    static func parseListLine(_ line: String) -> MailboxSummary? {
        guard line.hasPrefix("* LIST "),
              let flagsRange = parenthesizedRange(in: line) else {
            return nil
        }

        let flagsText = line[flagsRange].dropFirst().dropLast()
        let flags = flagsText
            .split(separator: " ")
            .map { String($0).lowercased() }
        let suffix = String(line[flagsRange.upperBound...])
        guard let name = parseAStrings(in: suffix).last, name.uppercased() != "NIL" else {
            return nil
        }

        return MailboxSummary(
            name: name,
            label: label(for: name, flags: flags),
            specialUse: specialUse(for: name, flags: flags),
            messageCount: nil,
            unreadCount: nil
        )
    }

    static func parseStatusCounts(_ response: IMAPCommandResponse) -> (Int?, Int?) {
        guard let line = response.lines.first(where: { $0.hasPrefix("* STATUS ") }) else {
            return (nil, nil)
        }

        let normalized = line
            .replacingOccurrences(of: "(", with: " ")
            .replacingOccurrences(of: ")", with: " ")
        let tokens = normalized.split(separator: " ").map(String.init)
        return (value(after: "MESSAGES", in: tokens), value(after: "UNSEEN", in: tokens))
    }

    static func parseSearchUIDs(_ response: IMAPCommandResponse) -> [String] {
        guard let line = response.lines.first(where: { $0.hasPrefix("* SEARCH") }) else {
            return []
        }

        return line
            .dropFirst("* SEARCH".count)
            .split(separator: " ")
            .map(String.init)
            .filter { $0.allSatisfy(\.isNumber) }
    }

    private static func parenthesizedRange(in line: String) -> Range<String.Index>? {
        guard let start = line.firstIndex(of: "(") else {
            return nil
        }

        var depth = 0
        var index = start
        while index < line.endIndex {
            if line[index] == "(" {
                depth += 1
            } else if line[index] == ")" {
                depth -= 1
                if depth == 0 {
                    return start..<line.index(after: index)
                }
            }
            index = line.index(after: index)
        }
        return nil
    }

    private static func parseAStrings(in value: String) -> [String] {
        var result: [String] = []
        var index = value.startIndex

        while index < value.endIndex {
            while index < value.endIndex, value[index].isWhitespace {
                index = value.index(after: index)
            }
            guard index < value.endIndex else { break }

            if value[index] == "\"" {
                result.append(parseQuotedString(in: value, from: &index))
            } else {
                let start = index
                while index < value.endIndex, !value[index].isWhitespace {
                    index = value.index(after: index)
                }
                result.append(String(value[start..<index]))
            }
        }

        return result
    }

    private static func parseQuotedString(in value: String, from index: inout String.Index) -> String {
        index = value.index(after: index)
        var output = ""
        var isEscaped = false

        while index < value.endIndex {
            let character = value[index]
            index = value.index(after: index)

            if isEscaped {
                output.append(character)
                isEscaped = false
            } else if character == "\\" {
                isEscaped = true
            } else if character == "\"" {
                break
            } else {
                output.append(character)
            }
        }

        return output
    }

    private static func value(after key: String, in tokens: [String]) -> Int? {
        guard let index = tokens.firstIndex(where: { $0.uppercased() == key }),
              tokens.indices.contains(index + 1) else {
            return nil
        }
        return Int(tokens[index + 1])
    }

    private static func specialUse(for name: String, flags: [String]) -> String? {
        let lowerName = name.lowercased()
        if name.uppercased() == "INBOX" { return "inbox" }
        if flags.contains("\\sent") || lowerName.contains("sent") { return "sent" }
        if flags.contains("\\drafts") || lowerName.contains("draft") { return "drafts" }
        if flags.contains("\\trash") || lowerName.contains("trash") { return "trash" }
        if flags.contains("\\junk") || lowerName.contains("junk") || lowerName.contains("spam") { return "junk" }
        if flags.contains("\\archive") || lowerName.contains("archive") { return "archive" }
        return nil
    }

    private static func label(for name: String, flags: [String]) -> String {
        switch specialUse(for: name, flags: flags) {
        case "inbox": return "Inbox"
        case "sent": return "Sent"
        case "drafts": return "Drafts"
        case "trash": return "Trash"
        case "junk": return "Junk"
        case "archive": return "Archive"
        default:
            return name.split(whereSeparator: { $0 == "/" || $0 == "." }).last.map(String.init) ?? name
        }
    }
}

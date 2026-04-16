import Foundation

enum IMAPEncoding {
    static func quoted(_ value: String) -> String {
        let sanitized = value
            .replacingOccurrences(of: "\r", with: " ")
            .replacingOccurrences(of: "\n", with: " ")
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "\"", with: "\\\"")
        return "\"\(sanitized)\""
    }

    static func literalCount(in line: String) -> Int? {
        guard line.hasSuffix("}"),
              let open = line.lastIndex(of: "{"),
              open < line.index(before: line.endIndex) else {
            return nil
        }

        var token = String(line[line.index(after: open)..<line.index(before: line.endIndex)])
        if token.hasSuffix("+") {
            token.removeLast()
        }
        return Int(token)
    }
}

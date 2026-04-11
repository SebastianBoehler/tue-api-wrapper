import Foundation

struct ICSProperty {
    var name: String
    var parameters: [String: String]
    var value: String
}

enum ICSLineParser {
    static func properties(from rawICS: String) -> [ICSProperty] {
        unfold(rawICS).compactMap(parseLine)
    }

    static func decodeText(_ value: String) -> String {
        value
            .replacingOccurrences(of: "\\n", with: "\n")
            .replacingOccurrences(of: "\\N", with: "\n")
            .replacingOccurrences(of: "\\,", with: ",")
            .replacingOccurrences(of: "\\;", with: ";")
            .replacingOccurrences(of: "\\\\", with: "\\")
    }

    private static func unfold(_ rawICS: String) -> [String] {
        var lines: [String] = []
        for line in rawICS
            .replacingOccurrences(of: "\r\n", with: "\n")
            .replacingOccurrences(of: "\r", with: "\n")
            .components(separatedBy: "\n") {
            if line.hasPrefix(" ") || line.hasPrefix("\t"), let last = lines.popLast() {
                lines.append(last + line.dropFirst())
            } else {
                lines.append(line)
            }
        }
        return lines
    }

    private static func parseLine(_ line: String) -> ICSProperty? {
        guard let separator = line.firstIndex(of: ":") else {
            return nil
        }
        let rawKey = String(line[..<separator])
        let value = String(line[line.index(after: separator)...])
        let keyParts = rawKey.components(separatedBy: ";")
        guard let name = keyParts.first?.uppercased(), !name.isEmpty else {
            return nil
        }

        var parameters: [String: String] = [:]
        for part in keyParts.dropFirst() {
            let pair = part.split(separator: "=", maxSplits: 1).map(String.init)
            if pair.count == 2 {
                parameters[pair[0].uppercased()] = pair[1]
            }
        }

        return ICSProperty(name: name, parameters: parameters, value: value)
    }
}

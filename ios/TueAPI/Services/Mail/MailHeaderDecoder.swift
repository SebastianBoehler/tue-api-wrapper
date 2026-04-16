import Foundation

enum MailHeaderDecoder {
    static func decode(_ value: String?) -> String {
        guard let value, !value.isEmpty else { return "" }
        let compacted = value.replacingOccurrences(
            of: #"(\?=)\s+(=\?)"#,
            with: "$1$2",
            options: .regularExpression
        )

        let pattern = #"=\?([^?]+)\?([bBqQ])\?([^?]*)\?="#
        guard let regex = try? NSRegularExpression(pattern: pattern) else {
            return compacted.trimmingCharacters(in: .whitespacesAndNewlines)
        }

        let nsValue = compacted as NSString
        let fullRange = NSRange(location: 0, length: nsValue.length)
        let matches = regex.matches(in: compacted, range: fullRange)
        guard !matches.isEmpty else {
            return compacted.trimmingCharacters(in: .whitespacesAndNewlines)
        }

        var output = ""
        var cursor = 0
        for match in matches {
            output += nsValue.substring(with: NSRange(location: cursor, length: match.range.location - cursor))
            let charset = nsValue.substring(with: match.range(at: 1))
            let encoding = nsValue.substring(with: match.range(at: 2)).lowercased()
            let payload = nsValue.substring(with: match.range(at: 3))
            output += decodeWord(payload, encoding: encoding, charset: charset)
            cursor = match.range.location + match.range.length
        }
        output += nsValue.substring(from: cursor)
        return output.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    static func isoDate(_ value: String?) -> String? {
        let decoded = decode(value)
        guard !decoded.isEmpty else { return nil }

        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        let patterns = [
            "EEE, d MMM yyyy HH:mm:ss Z",
            "EEE, dd MMM yyyy HH:mm:ss Z",
            "d MMM yyyy HH:mm:ss Z",
            "dd MMM yyyy HH:mm:ss Z"
        ]

        for pattern in patterns {
            formatter.dateFormat = pattern
            if let date = formatter.date(from: decoded) {
                return ISO8601DateFormatter().string(from: date)
            }
        }

        return decoded
    }

    static func decodeBody(_ data: Data, transferEncoding: String?, charset: String?) -> String {
        let decodedData = decodeTransfer(data, encoding: transferEncoding)
        if let string = string(from: decodedData, charset: charset) {
            return string
        }
        return String(data: decodedData, encoding: .utf8)
            ?? String(data: decodedData, encoding: .isoLatin1)
            ?? ""
    }

    private static func decodeWord(
        _ payload: String,
        encoding: String,
        charset: String
    ) -> String {
        let data: Data?
        if encoding == "b" {
            data = Data(base64Encoded: payload)
        } else {
            data = decodeQuotedPrintable(payload.replacingOccurrences(of: "_", with: " "))
        }
        guard let data else { return payload }
        return string(from: data, charset: charset) ?? payload
    }

    private static func decodeTransfer(_ data: Data, encoding: String?) -> Data {
        switch encoding?.lowercased() {
        case "base64":
            let text = String(data: data, encoding: .ascii) ?? ""
            let compacted = text.filter { !$0.isWhitespace }
            return Data(base64Encoded: compacted) ?? data
        case "quoted-printable":
            return decodeQuotedPrintable(data)
        default:
            return data
        }
    }

    private static func decodeQuotedPrintable(_ value: String) -> Data {
        decodeQuotedPrintable(Data(value.utf8))
    }

    private static func decodeQuotedPrintable(_ data: Data) -> Data {
        var output = Data()
        var index = data.startIndex

        while index < data.endIndex {
            let byte = data[index]
            if byte == 61, data.indices.contains(data.index(after: index)) {
                let next = data.index(after: index)
                if data[next] == 13 || data[next] == 10 {
                    index = skipSoftLineBreak(in: data, from: next)
                    continue
                }
                let second = data.index(after: next)
                if data.indices.contains(second),
                   let decoded = hexByte(data[next], data[second]) {
                    output.append(decoded)
                    index = data.index(after: second)
                    continue
                }
            }
            output.append(byte)
            index = data.index(after: index)
        }

        return output
    }

    private static func skipSoftLineBreak(in data: Data, from index: Data.Index) -> Data.Index {
        if data[index] == 13, data[safe: data.index(after: index)] == 10 {
            return data.index(index, offsetBy: 2)
        }
        return data.index(after: index)
    }

    private static func hexByte(_ first: UInt8, _ second: UInt8) -> UInt8? {
        guard let high = hexNibble(first), let low = hexNibble(second) else { return nil }
        return high << 4 | low
    }

    private static func hexNibble(_ byte: UInt8) -> UInt8? {
        switch byte {
        case 48...57: return byte - 48
        case 65...70: return byte - 55
        case 97...102: return byte - 87
        default: return nil
        }
    }

    private static func string(from data: Data, charset: String?) -> String? {
        switch charset?.lowercased() {
        case "iso-8859-1", "latin1", "latin-1":
            return String(data: data, encoding: .isoLatin1)
        case "windows-1252", "cp1252":
            return String(data: data, encoding: .windowsCP1252)
        default:
            return String(data: data, encoding: .utf8)
                ?? String(data: data, encoding: .isoLatin1)
        }
    }
}

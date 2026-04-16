import Foundation

enum MailAddressParser {
    static func single(_ value: String?) -> (name: String?, address: String?) {
        let first = addressList(value).first
        return (first?.name, first?.address)
    }

    static func formattedList(_ value: String?) -> [String] {
        addressList(value).map { item in
            if let name = item.name, let address = item.address {
                return "\(name) <\(address)>"
            }
            return item.address ?? item.name ?? ""
        }
        .filter { !$0.isEmpty }
    }

    private static func addressList(_ value: String?) -> [(name: String?, address: String?)] {
        let decoded = MailHeaderDecoder.decode(value)
        guard !decoded.isEmpty else { return [] }
        return splitAddresses(decoded).map(parseAddress)
    }

    private static func splitAddresses(_ value: String) -> [String] {
        var parts: [String] = []
        var current = ""
        var isQuoted = false
        var isEscaped = false

        for character in value {
            if isEscaped {
                current.append(character)
                isEscaped = false
                continue
            }
            if character == "\\" {
                current.append(character)
                isEscaped = true
                continue
            }
            if character == "\"" {
                isQuoted.toggle()
                current.append(character)
                continue
            }
            if character == ",", !isQuoted {
                parts.append(current.trimmingCharacters(in: .whitespacesAndNewlines))
                current = ""
                continue
            }
            current.append(character)
        }

        let tail = current.trimmingCharacters(in: .whitespacesAndNewlines)
        if !tail.isEmpty {
            parts.append(tail)
        }
        return parts
    }

    private static func parseAddress(_ value: String) -> (name: String?, address: String?) {
        if let open = value.firstIndex(of: "<"), let close = value.lastIndex(of: ">"), open < close {
            let rawName = String(value[..<open])
                .trimmingCharacters(in: .whitespacesAndNewlines)
                .trimmingCharacters(in: CharacterSet(charactersIn: "\""))
            let address = String(value[value.index(after: open)..<close])
                .trimmingCharacters(in: .whitespacesAndNewlines)
            return (rawName.isEmpty ? nil : rawName, address.isEmpty ? nil : address)
        }

        let trimmed = value
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "\""))
        if trimmed.contains("@") {
            return (nil, trimmed)
        }
        return (trimmed.isEmpty ? nil : trimmed, nil)
    }
}

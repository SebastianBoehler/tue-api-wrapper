import Foundation

enum HTTPFormEncoder {
    static func encode(_ fields: [String: String]) -> Data {
        encode(fields.map { ($0.key, $0.value) })
    }

    static func encode(_ fields: [(String, String)]) -> Data {
        fields
            .map { key, value in
                "\(escape(key))=\(escape(value))"
            }
            .joined(separator: "&")
            .data(using: .utf8) ?? Data()
    }

    private static func escape(_ value: String) -> String {
        var allowed = CharacterSet.urlQueryAllowed
        allowed.remove(charactersIn: "&+=?")
        return value.addingPercentEncoding(withAllowedCharacters: allowed) ?? value
    }
}

import Foundation

struct MIMEPart {
    var headers: [String: [String]]
    var body: Data

    init(data: Data) {
        let split = Self.splitHeaderAndBody(data)
        headers = Self.parseHeaders(split.headers)
        body = split.body
    }

    func header(_ name: String) -> String? {
        headers[name.lowercased()]?.joined(separator: ", ")
    }

    var contentType: String {
        header("Content-Type") ?? "text/plain"
    }

    var contentDisposition: String {
        header("Content-Disposition") ?? ""
    }

    var isAttachment: Bool {
        contentDisposition.lowercased().contains("attachment")
    }

    func parameter(_ name: String, in headerValue: String) -> String? {
        let target = name.lowercased()
        let segments = headerValue.split(separator: ";").dropFirst()
        for segment in segments {
            let pair = segment.split(separator: "=", maxSplits: 1).map {
                String($0).trimmingCharacters(in: .whitespacesAndNewlines)
            }
            guard pair.count == 2, pair[0].lowercased() == target else {
                continue
            }
            return pair[1].trimmingCharacters(in: CharacterSet(charactersIn: "\""))
        }
        return nil
    }

    func childParts() -> [MIMEPart] {
        guard contentType.lowercased().hasPrefix("multipart/"),
              let boundary = parameter("boundary", in: contentType) else {
            return []
        }

        return Self.multipartSections(in: body, boundary: boundary).map(MIMEPart.init)
    }

    private static func splitHeaderAndBody(_ data: Data) -> (headers: Data, body: Data) {
        for separator in [Data([13, 10, 13, 10]), Data([10, 10])] {
            if let range = data.range(of: separator) {
                return (
                    data.subdata(in: data.startIndex..<range.lowerBound),
                    data.subdata(in: range.upperBound..<data.endIndex)
                )
            }
        }
        return (data, Data())
    }

    private static func parseHeaders(_ data: Data) -> [String: [String]] {
        let text = String(data: data, encoding: .utf8)
            ?? String(data: data, encoding: .isoLatin1)
            ?? ""
        let lines = text
            .replacingOccurrences(of: "\r\n", with: "\n")
            .replacingOccurrences(of: "\r", with: "\n")
            .split(separator: "\n", omittingEmptySubsequences: false)
            .map(String.init)

        var unfolded: [String] = []
        for line in lines {
            if let first = line.first, first == " " || first == "\t" {
                let continuation = line.trimmingCharacters(in: .whitespacesAndNewlines)
                if unfolded.isEmpty {
                    unfolded.append(continuation)
                } else {
                    unfolded[unfolded.count - 1] += " \(continuation)"
                }
            } else {
                unfolded.append(line)
            }
        }

        var headers: [String: [String]] = [:]
        for line in unfolded {
            let pair = line.split(separator: ":", maxSplits: 1).map(String.init)
            guard pair.count == 2 else { continue }
            let key = pair[0].trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            let value = pair[1].trimmingCharacters(in: .whitespacesAndNewlines)
            headers[key, default: []].append(value)
        }
        return headers
    }

    private static func multipartSections(in data: Data, boundary: String) -> [Data] {
        let marker = Data("--\(boundary)".utf8)
        var sections: [Data] = []
        var cursor = data.startIndex

        while let markerRange = data.range(of: marker, in: cursor..<data.endIndex) {
            var sectionStart = markerRange.upperBound
            let nextIndex = sectionStart < data.endIndex ? data.index(after: sectionStart) : sectionStart
            if data[safe: sectionStart] == 45, data[safe: nextIndex] == 45 {
                break
            }
            sectionStart = skipLineEnding(in: data, from: sectionStart)

            guard let nextMarker = data.range(of: marker, in: sectionStart..<data.endIndex) else {
                break
            }
            let section = trimLineEndings(data.subdata(in: sectionStart..<nextMarker.lowerBound))
            if !section.isEmpty {
                sections.append(section)
            }
            cursor = nextMarker.lowerBound
        }

        return sections
    }

    private static func skipLineEnding(in data: Data, from index: Data.Index) -> Data.Index {
        guard index < data.endIndex else {
            return index
        }

        let nextIndex = data.index(after: index)
        if data[safe: index] == 13, data[safe: nextIndex] == 10 {
            return data.index(index, offsetBy: 2)
        }
        if data[safe: index] == 10 {
            return data.index(after: index)
        }
        return index
    }

    private static func trimLineEndings(_ data: Data) -> Data {
        var start = data.startIndex
        var end = data.endIndex
        while start < end, data[start] == 10 || data[start] == 13 {
            start = data.index(after: start)
        }
        while end > start {
            let previous = data.index(before: end)
            guard data[previous] == 10 || data[previous] == 13 else { break }
            end = previous
        }
        return data.subdata(in: start..<end)
    }
}

import Foundation

struct TalkTag: Codable, Identifiable, Hashable {
    var id: Int
    var name: String
}

struct Talk: Codable, Identifiable, Hashable {
    var id: Int
    var title: String
    var timestamp: String
    var description: String?
    var location: String?
    var speakerName: String?
    var speakerBio: String?
    var disabled: Bool
    var tags: [TalkTag]

    var sourceURL: URL? {
        URL(string: "https://talks.tuebingen.ai/talks/talk/id=\(id)")
    }

    var startDate: Date? {
        TalksDateParser.date(from: timestamp)
    }

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case timestamp
        case description
        case location
        case speakerName = "speaker_name"
        case speakerBio = "speaker_bio"
        case disabled
        case tags
    }
}

struct TalksPayload: Decodable {
    var talks: [Talk]
}

enum TalksScope: String, CaseIterable, Identifiable {
    case upcoming
    case previous

    var id: String { rawValue }

    var label: String {
        switch self {
        case .upcoming:
            "Upcoming"
        case .previous:
            "Previous"
        }
    }
}

enum TalksLoadPhase: Equatable {
    case idle
    case loading
    case loaded(Date, Int)
    case failed(String)
}

enum TalksDateParser {
    static func date(from value: String) -> Date? {
        formatter.date(from: value)
    }

    static func formattedDate(_ date: Date) -> String {
        displayFormatter.string(from: date)
    }

    private static let formatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "Europe/Berlin")
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        return formatter
    }()

    private static let displayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "de_DE")
        formatter.timeZone = TimeZone(identifier: "Europe/Berlin")
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()
}

import Foundation

enum BrowsePhase: Equatable {
    case idle
    case loading
    case loaded(String?, Int, BrowseResultScope)
    case failed(String)
}

enum BrowseResultScope: Equatable {
    case publicOnly
    case publicAndAuthenticated(authenticatedOnlyCount: Int)
    case publicOnlyAuthenticatedFailed(String)
}

enum BrowseLectureMerger {
    static func merged(
        _ publicLectures: [AlmaCurrentLecture],
        _ authenticatedLectures: [AlmaCurrentLecture]
    ) -> [AlmaCurrentLecture] {
        var seen = Set<String>()
        return (authenticatedLectures + publicLectures).filter { lecture in
            seen.insert(key(for: lecture)).inserted
        }
    }

    static func authenticatedOnlyCount(
        _ publicLectures: [AlmaCurrentLecture],
        _ authenticatedLectures: [AlmaCurrentLecture]
    ) -> Int {
        let publicKeys = Set(publicLectures.map { key(for: $0) })
        return authenticatedLectures.filter { !publicKeys.contains(key(for: $0)) }.count
    }

    private static func key(for lecture: AlmaCurrentLecture) -> String {
        if let detailURL = lecture.detailURL {
            return detailURL.absoluteString
        }
        return [
            lecture.title,
            lecture.start,
            lecture.end,
            lecture.number,
            lecture.room
        ]
        .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
        .joined(separator: "|")
    }
}

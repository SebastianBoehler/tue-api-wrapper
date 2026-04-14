import Foundation

struct ModuleSearchOption: Decodable, Identifiable, Hashable {
    var value: String
    var label: String

    var id: String { value }
}

struct ModuleSearchFiltersResponse: Decodable {
    var sourcePageUrl: String
    var filters: ModuleSearchFilters
}

struct ModuleSearchFilters: Decodable, Equatable {
    var elementTypes: [ModuleSearchOption]
    var languages: [ModuleSearchOption]
    var degrees: [ModuleSearchOption]
    var subjects: [ModuleSearchOption]
    var faculties: [ModuleSearchOption]
}

struct ModuleSearchResult: Decodable, Identifiable, Hashable {
    var number: String?
    var title: String
    var elementType: String?
    var detailURL: String?

    var id: String { [detailURL, number, title].compactMap(\.self).joined(separator: ":") }

    enum CodingKeys: String, CodingKey {
        case number, title
        case elementType = "element_type"
        case detailURL = "detail_url"
    }
}

struct ModuleSearchResponse: Decodable {
    var results: [ModuleSearchResult]
    var returnedResults: Int
    var totalResults: Int?
    var totalPages: Int?
    var truncated: Bool
    var sourcePageUrl: String
}

struct ModuleSearchRequest: Equatable {
    var query = ""
    var degree: String?
    var subject: String?
    var elementType: String?
    var language: String?
    var faculty: String?
    var maxResults = 80

    var hasCriteria: Bool {
        !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            || degree != nil
            || subject != nil
            || elementType != nil
            || language != nil
            || faculty != nil
    }
}

enum ModuleSearchPhase: Equatable {
    case idle
    case loading
    case loaded(Int, Int?)
    case unavailable
    case failed(String)
}

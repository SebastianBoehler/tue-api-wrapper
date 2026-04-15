import Foundation

struct CareerFacetOption: Decodable, Identifiable, Hashable {
    var id: Int
    var label: String
    var count: Int
}

struct CareerSearchFilters: Decodable, Hashable {
    var projectTypes: [CareerFacetOption]
    var industries: [CareerFacetOption]

    enum CodingKeys: String, CodingKey {
        case projectTypes = "project_types"
        case industries
    }
}

struct CareerOrganization: Decodable, Identifiable, Hashable {
    var rawId: Int?
    var name: String
    var logoURL: String?

    var id: String { rawId.map(String.init) ?? name }

    enum CodingKeys: String, CodingKey {
        case rawId = "id"
        case name
        case logoURL = "logo_url"
    }
}

struct CareerProjectSummary: Decodable, Identifiable, Hashable {
    var id: Int
    var title: String
    var preview: String?
    var location: String?
    var projectTypes: [String]
    var industries: [String]
    var organizations: [String]
    var createdAt: String?
    var startDate: String?
    var endDate: String?
    var sourceURL: String

    enum CodingKeys: String, CodingKey {
        case id, title, preview, location, industries, organizations
        case projectTypes = "project_types"
        case createdAt = "created_at"
        case startDate = "start_date"
        case endDate = "end_date"
        case sourceURL = "source_url"
    }
}

struct CareerProjectDetail: Decodable, Identifiable {
    var id: Int
    var title: String
    var location: String?
    var description: String?
    var requirements: String?
    var projectTypes: [String]
    var industries: [String]
    var organizations: [CareerOrganization]
    var createdAt: String?
    var startDate: String?
    var endDate: String?
    var sourceURL: String?

    enum CodingKeys: String, CodingKey {
        case id, title, location, description, requirements, industries, organizations
        case projectTypes = "project_types"
        case createdAt = "created_at"
        case startDate = "start_date"
        case endDate = "end_date"
        case sourceURL = "source_url"
    }
}

struct CareerSearchResponse: Decodable {
    var query: String
    var page: Int
    var perPage: Int
    var totalHits: Int
    var totalPages: Int
    var sourceURL: String
    var filters: CareerSearchFilters
    var items: [CareerProjectSummary]

    enum CodingKeys: String, CodingKey {
        case query, page, filters, items
        case perPage = "per_page"
        case totalHits = "total_hits"
        case totalPages = "total_pages"
        case sourceURL = "source_url"
    }
}

struct CareerProjectSelection: Hashable {
    var id: Int
    var title: String
}

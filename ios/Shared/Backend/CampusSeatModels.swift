import Foundation

struct CampusSeatAvailability: Decodable {
    var sourceURL: String
    var retrievedAt: String
    var locations: [CampusSeatLocation]

    enum CodingKeys: String, CodingKey {
        case sourceURL = "source_url"
        case retrievedAt = "retrieved_at"
        case locations
    }
}

struct CampusSeatLocation: Decodable, Identifiable {
    var locationID: String
    var name: String
    var longName: String?
    var level: String?
    var building: String?
    var room: String?
    var totalSeats: Int?
    var freeSeats: Int?
    var occupiedSeats: Int?
    var occupancyPercent: Double?
    var updatedAt: String?
    var url: String?
    var geoCoordinates: String?

    var id: String { locationID }

    enum CodingKeys: String, CodingKey {
        case locationID = "location_id"
        case name
        case longName = "long_name"
        case level
        case building
        case room
        case totalSeats = "total_seats"
        case freeSeats = "free_seats"
        case occupiedSeats = "occupied_seats"
        case occupancyPercent = "occupancy_percent"
        case updatedAt = "updated_at"
        case url
        case geoCoordinates = "geo_coordinates"
    }
}

enum CampusSeatLoadPhase: Equatable {
    case idle
    case loading
    case loaded(Date)
    case unavailable
    case failed(String)

    var isLoading: Bool {
        if case .loading = self {
            true
        } else {
            false
        }
    }
}

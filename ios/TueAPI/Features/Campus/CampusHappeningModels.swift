import CoreLocation
import Foundation
import SwiftUI

struct CampusHappening: Identifiable, Codable, Hashable {
    var id: UUID
    var title: String
    var locationName: String
    var note: String?
    var category: HappeningCategory
    var startsAt: Date
    var createdAt: Date
    var latitude: Double
    var longitude: Double

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
}

struct CampusLandmark: Identifiable, Hashable {
    var id: String
    var name: String
    var detail: String
    var symbolName: String
    var latitude: Double
    var longitude: Double

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    static let important: [CampusLandmark] = [
        CampusLandmark(
            id: "university-library",
            name: "University Library",
            detail: "Wilhelmstraße study hub",
            symbolName: "books.vertical",
            latitude: 48.5239,
            longitude: 9.0587
        ),
        CampusLandmark(
            id: "neue-aula",
            name: "Neue Aula",
            detail: "Central lecture building",
            symbolName: "building.columns",
            latitude: 48.5247,
            longitude: 9.0584
        ),
        CampusLandmark(
            id: "kupferbau",
            name: "Kupferbau",
            detail: "Large lecture halls",
            symbolName: "graduationcap",
            latitude: 48.5246,
            longitude: 9.0609
        ),
        CampusLandmark(
            id: "mensa-wilhelmstrasse",
            name: "Mensa Wilhelmstraße",
            detail: "Central cafeteria",
            symbolName: "fork.knife",
            latitude: 48.5231,
            longitude: 9.0573
        ),
        CampusLandmark(
            id: "morgenstelle",
            name: "Campus Morgenstelle",
            detail: "Natural sciences campus",
            symbolName: "atom",
            latitude: 48.5371,
            longitude: 9.0359
        ),
        CampusLandmark(
            id: "brechtbau",
            name: "Brechtbau",
            detail: "Humanities lecture rooms",
            symbolName: "text.book.closed",
            latitude: 48.5270,
            longitude: 9.0603
        )
    ]
}

enum HappeningCategory: String, CaseIterable, Codable, Identifiable {
    case study
    case food
    case sport
    case social
    case help
    case other

    var id: String { rawValue }

    var label: String {
        switch self {
        case .study: "Study"
        case .food: "Food"
        case .sport: "Sport"
        case .social: "Social"
        case .help: "Help"
        case .other: "Other"
        }
    }

    var symbolName: String {
        switch self {
        case .study: "book"
        case .food: "fork.knife"
        case .sport: "figure.run"
        case .social: "person.2"
        case .help: "hand.raised"
        case .other: "mappin"
        }
    }

    var tint: Color {
        switch self {
        case .study: .indigo
        case .food: .green
        case .sport: .red
        case .social: .teal
        case .help: .orange
        case .other: .gray
        }
    }
}

enum CampusHappeningPhase: Equatable {
    case idle
    case saving
    case saved
    case failed(String)
}

enum CampusHappeningStoreError: LocalizedError {
    case missingTitle
    case missingLocation
    case locationNotFound

    var errorDescription: String? {
        switch self {
        case .missingTitle:
            "Add a short title before posting."
        case .missingLocation:
            "Add a location before posting."
        case .locationNotFound:
            "Maps could not find that location. Use a building name, room, or street address."
        }
    }
}

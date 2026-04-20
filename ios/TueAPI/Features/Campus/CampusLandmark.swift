import CoreLocation
import Foundation

struct CampusLandmark: Identifiable, Hashable {
    var id: String
    var name: String
    var detail: String
    var symbolName: String
    var latitude: Double
    var longitude: Double
    var aliases: [String]

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    static let important: [CampusLandmark] = [
        CampusLandmark(
            id: "university-library",
            name: "University Library",
            detail: "Bonatzbau, Wilhelmstraße 32",
            symbolName: "books.vertical",
            latitude: 48.525118,
            longitude: 9.061779,
            aliases: [
                "Universitätsbibliothek",
                "Universitaetsbibliothek",
                "University Library",
                "Bonatzbau",
                "Wilhelmstraße 32",
                "Wilhelmstr. 32"
            ]
        ),
        CampusLandmark(
            id: "neue-aula",
            name: "Neue Aula",
            detail: "Geschwister-Scholl-Platz",
            symbolName: "building.columns",
            latitude: 48.524890,
            longitude: 9.058743,
            aliases: [
                "Neue Aula",
                "Geschwister-Scholl-Platz"
            ]
        ),
        CampusLandmark(
            id: "kupferbau",
            name: "Kupferbau",
            detail: "Hölderlinstraße 5",
            symbolName: "graduationcap",
            latitude: 48.525928,
            longitude: 9.058378,
            aliases: [
                "Kupferbau",
                "Hörsaalgebäude",
                "Hoersaalgebaeude",
                "Hölderlinstraße 5",
                "Hoelderlinstrasse 5",
                "Hölderlinstr. 5"
            ]
        ),
        CampusLandmark(
            id: "mensa-wilhelmstrasse",
            name: "Mensa Wilhelmstraße",
            detail: "Wilhelmstraße 13-15",
            symbolName: "fork.knife",
            latitude: 48.526056,
            longitude: 9.060910,
            aliases: [
                "Mensa Wilhelmstraße",
                "Mensa Wilhelmstrasse",
                "Mensa I",
                "Wilhelmstraße 13",
                "Wilhelmstraße 13-15",
                "Wilhelmstr. 13"
            ]
        ),
        CampusLandmark(
            id: "morgenstelle",
            name: "Morgenstelle Mensa",
            detail: "Auf der Morgenstelle 26",
            symbolName: "atom",
            latitude: 48.535164,
            longitude: 9.036040,
            aliases: [
                "Mensa Morgenstelle",
                "Mensa II",
                "Campus Morgenstelle",
                "Auf der Morgenstelle 26"
            ]
        ),
        CampusLandmark(
            id: "brechtbau",
            name: "Brechtbau",
            detail: "Wilhelmstraße 50",
            symbolName: "text.book.closed",
            latitude: 48.526972,
            longitude: 9.063023,
            aliases: [
                "Brechtbau",
                "Neuphilologikum",
                "Wilhelmstraße 50",
                "Wilhelmstr. 50"
            ]
        )
    ]

    static let navigationLookup: [CampusLandmark] = important + [
        CampusLandmark(
            id: "theologicum",
            name: "Theologicum",
            detail: "Liebermeisterstraße 12-16",
            symbolName: "building.2",
            latitude: 48.525771,
            longitude: 9.055224,
            aliases: [
                "Theologicum",
                "Liebermeisterstraße 12",
                "Liebermeisterstraße 16",
                "Liebermeisterstr. 12"
            ]
        ),
        CampusLandmark(
            id: "alte-aula",
            name: "Alte Aula",
            detail: "Münzgasse 30",
            symbolName: "building.columns",
            latitude: 48.519767,
            longitude: 9.055631,
            aliases: [
                "Alte Aula",
                "Münzgasse 30",
                "Muenzgasse 30"
            ]
        ),
        CampusLandmark(
            id: "sand-13-14",
            name: "Sand 13 und 14",
            detail: "Fachbereich Informatik",
            symbolName: "desktopcomputer",
            latitude: 48.534503,
            longitude: 9.071242,
            aliases: [
                "Sand 13",
                "Sand 14",
                "Sand 13 und 14",
                "Sand 13/14"
            ]
        ),
        CampusLandmark(
            id: "cyber-valley-mvl1",
            name: "Cyber Valley Campus MvL1",
            detail: "Maria-von-Linden-Straße 1",
            symbolName: "brain.head.profile",
            latitude: 48.5386315,
            longitude: 9.0550182,
            aliases: [
                "Cyber Valley Campus",
                "Cyber-Valley-Campus",
                "Cyber Valley 1",
                "Cyber Valley I",
                "MvL1",
                "MVL1",
                "Gebäude MvL1",
                "Tübingen AI Center",
                "Tuebingen AI Center",
                "Maria-von-Linden-Straße 1",
                "Maria-von-Linden-Str. 1",
                "Maria von Linden Strasse 1"
            ]
        ),
        CampusLandmark(
            id: "hoelderlinstrasse-11",
            name: "Hölderlinstraße 11",
            detail: "Wilhelmstraße area",
            symbolName: "building",
            latitude: 48.526567,
            longitude: 9.059193,
            aliases: [
                "Hölderlinstraße 11",
                "Hoelderlinstrasse 11",
                "Hölderlinstr. 11"
            ]
        ),
        CampusLandmark(
            id: "hoelderlinstrasse-12",
            name: "Hölderlinstraße 12",
            detail: "Eckgebäude Sigwartstraße 10",
            symbolName: "building",
            latitude: 48.526467,
            longitude: 9.059776,
            aliases: [
                "Hölderlinstraße 12",
                "Hoelderlinstrasse 12",
                "Hölderlinstr. 12",
                "Sigwartstraße 10"
            ]
        ),
        CampusLandmark(
            id: "keplerstrasse-2",
            name: "Keplerstraße 2",
            detail: "Philosophische Fakultät",
            symbolName: "building",
            latitude: 48.525935,
            longitude: 9.063721,
            aliases: [
                "Keplerstraße 2",
                "Keplerstrasse 2",
                "Keplerstr. 2"
            ]
        )
    ]

    static func navigationMatch(for location: String) -> CampusLandmark? {
        let normalizedLocation = location.normalizedCampusSearchText
        return navigationLookup.first { landmark in
            landmark.aliases.contains { alias in
                normalizedLocation.contains(alias.normalizedCampusSearchText)
            }
        }
    }
}

private extension String {
    var normalizedCampusSearchText: String {
        folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
            .replacingOccurrences(of: "straße", with: "strasse")
            .replacingOccurrences(of: "str.", with: "strasse")
            .replacingOccurrences(of: #"[^a-z0-9]+"#, with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

import CoreLocation
import MapKit
import SwiftUI

struct CourseNavigationActions: View {
    var course: CourseDetailReference

    @State private var phase: CourseNavigationPhase = .idle

    private let resolver = CampusLectureDestinationResolver()

    var body: some View {
        if let location = course.location?.nilIfBlank {
            Button {
                openMaps(for: location, directions: true)
            } label: {
                Label("Navigate to lecture", systemImage: "location.north.line")
            }
            .disabled(phase == .loading)

            Button {
                openMaps(for: location, directions: false)
            } label: {
                Label("Show lecture on map", systemImage: "map")
            }
            .disabled(phase == .loading)

            LabeledContent("Destination", value: location)

            switch phase {
            case .idle:
                EmptyView()
            case .loading:
                ProgressView("Finding lecture building")
            case .failed(let message):
                Text(message)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }
        }
    }

    private func openMaps(for location: String, directions: Bool) {
        Task {
            phase = .loading
            do {
                let destination = try await resolver.resolve(location)
                let mapItem = MKMapItem(placemark: MKPlacemark(coordinate: destination.coordinate))
                mapItem.name = destination.name

                let options = directions ? [
                    MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeWalking
                ] : [:]
                mapItem.openInMaps(launchOptions: options)
                phase = .idle
            } catch {
                phase = .failed(error.localizedDescription)
            }
        }
    }
}

private struct CampusLectureDestination {
    var name: String
    var coordinate: CLLocationCoordinate2D
}

private enum CourseNavigationPhase: Equatable {
    case idle
    case loading
    case failed(String)
}

private enum CampusLectureDestinationError: LocalizedError {
    case noCampusMatch

    var errorDescription: String? {
        switch self {
        case .noCampusMatch:
            "Maps could not find a matching Tübingen campus building for this lecture location."
        }
    }
}

private struct CampusLectureDestinationResolver {
    private let geocoder = CLGeocoder()

    func resolve(_ location: String) async throws -> CampusLectureDestination {
        for query in queries(for: location) {
            let placemarks = try await geocoder.geocodeAddressString(query)
            if let match = placemarks.first(where: \.isNearTuebingenCampus),
               let coordinate = match.location?.coordinate {
                return CampusLectureDestination(name: query, coordinate: coordinate)
            }
        }
        throw CampusLectureDestinationError.noCampusMatch
    }

    private func queries(for location: String) -> [String] {
        let cleaned = location.trimmingCharacters(in: .whitespacesAndNewlines)
        let building = cleaned.components(separatedBy: ",").first?.nilIfBlank

        return [
            building.map { "\($0), Universität Tübingen, Tübingen, Germany" },
            "\(cleaned), Universität Tübingen, Tübingen, Germany",
            building.map { "\($0), Tübingen, Germany" },
            "\(cleaned), Tübingen, Germany"
        ]
        .compactMap(\.self)
        .uniqued()
    }
}

private extension CLPlacemark {
    var isNearTuebingenCampus: Bool {
        guard let coordinate = location?.coordinate else { return false }
        return (48.48...48.56).contains(coordinate.latitude)
            && (8.99...9.10).contains(coordinate.longitude)
    }
}

private extension Array where Element == String {
    func uniqued() -> [String] {
        var seen: Set<String> = []
        return filter { seen.insert($0).inserted }
    }
}

private extension String {
    var nilIfBlank: String? {
        let value = trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : value
    }
}

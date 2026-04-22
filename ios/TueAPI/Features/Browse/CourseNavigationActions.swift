import CoreLocation
import MapKit
import SwiftUI

struct CampusNavigationActions: View {
    private let location: String?
    private let destinationLabel: String
    private let progressLabel: String

    @State private var phase: CourseNavigationPhase = .idle

    private let resolver = CampusLectureDestinationResolver()

    init(course: CourseDetailReference) {
        location = course.location
        destinationLabel = "lecture"
        progressLabel = "Finding lecture building"
    }

    init(talk: Talk) {
        location = talk.location
        destinationLabel = "talk"
        progressLabel = "Finding talk location"
    }

    var body: some View {
        if let location = location?.nilIfBlank {
            Button {
                openMaps(for: location, directions: true)
            } label: {
                Label("Navigate to \(destinationLabel)", systemImage: "location.north.line")
            }
            .disabled(phase == .loading)

            Button {
                openMaps(for: location, directions: false)
            } label: {
                Label("Show \(destinationLabel) on map", systemImage: "map")
            }
            .disabled(phase == .loading)

            LabeledContent("Destination", value: location)

            switch phase {
            case .idle:
                EmptyView()
            case .loading:
                ProgressView(progressLabel)
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

struct CourseNavigationActions: View {
    var course: CourseDetailReference

    var body: some View {
        CampusNavigationActions(course: course)
    }
}

struct CampusLectureDestination {
    var name: String
    var coordinate: CLLocationCoordinate2D
}

private enum CourseNavigationPhase: Equatable {
    case idle
    case loading
    case failed(String)
}

enum CampusLectureDestinationError: LocalizedError {
    case noCampusMatch

    var errorDescription: String? {
        switch self {
        case .noCampusMatch:
            "Maps could not find a matching Tübingen campus building for this lecture location."
        }
    }
}

protocol CampusLectureGeocoding {
    func geocodeAddressString(_ addressString: String) async throws -> [CLPlacemark]
}

extension CLGeocoder: CampusLectureGeocoding {}

struct CampusLectureDestinationResolver {
    private let geocoder: CampusLectureGeocoding

    init(geocoder: CampusLectureGeocoding = CLGeocoder()) {
        self.geocoder = geocoder
    }

    func resolve(_ location: String) async throws -> CampusLectureDestination {
        if let known = CampusLandmark.navigationMatch(for: location) {
            return CampusLectureDestination(name: known.name, coordinate: known.coordinate)
        }

        for query in queries(for: location) {
            do {
                let placemarks = try await geocoder.geocodeAddressString(query)
                if let match = placemarks.first(where: \.isNearTuebingenCampus),
                   let coordinate = match.location?.coordinate {
                    return CampusLectureDestination(name: query, coordinate: coordinate)
                }
            } catch {
                continue
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

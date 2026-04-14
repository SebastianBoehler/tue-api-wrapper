import CoreLocation
import Foundation
import Observation

@MainActor
@Observable
final class CampusHappeningStore {
    private(set) var happenings: [CampusHappening] = []
    var phase: CampusHappeningPhase = .idle

    private let geocoder = CLGeocoder()
    private let storageKey = "campusHappenings"

    init() {
        happenings = load()
    }

    func post(
        title: String,
        locationName: String,
        note: String?,
        category: HappeningCategory,
        startsAt: Date
    ) async {
        let cleanTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanLocation = locationName.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanNote = note?.trimmingCharacters(in: .whitespacesAndNewlines)

        do {
            guard !cleanTitle.isEmpty else {
                throw CampusHappeningStoreError.missingTitle
            }
            guard !cleanLocation.isEmpty else {
                throw CampusHappeningStoreError.missingLocation
            }

            phase = .saving
            let coordinate = try await coordinate(for: cleanLocation)
            happenings.insert(
                CampusHappening(
                    id: UUID(),
                    title: cleanTitle,
                    locationName: cleanLocation,
                    note: cleanNote?.nilIfBlank,
                    category: category,
                    startsAt: startsAt,
                    createdAt: Date(),
                    latitude: coordinate.latitude,
                    longitude: coordinate.longitude
                ),
                at: 0
            )
            try save()
            phase = .saved
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    func delete(at offsets: IndexSet) {
        happenings.remove(atOffsets: offsets)
        try? save()
    }

    private func coordinate(for locationName: String) async throws -> CLLocationCoordinate2D {
        let lookup = locationName.localizedCaseInsensitiveContains("tübingen") ||
            locationName.localizedCaseInsensitiveContains("tuebingen")
            ? locationName
            : "\(locationName), Tübingen"
        let matches = try await geocoder.geocodeAddressString(lookup)
        guard let coordinate = matches.first?.location?.coordinate else {
            throw CampusHappeningStoreError.locationNotFound
        }
        return coordinate
    }

    private func load() -> [CampusHappening] {
        guard let data = UserDefaults.standard.data(forKey: storageKey) else {
            return []
        }
        return (try? JSONDecoder().decode([CampusHappening].self, from: data)) ?? []
    }

    private func save() throws {
        let data = try JSONEncoder().encode(happenings)
        UserDefaults.standard.set(data, forKey: storageKey)
    }
}

private extension String {
    var nilIfBlank: String? {
        isEmpty ? nil : self
    }
}

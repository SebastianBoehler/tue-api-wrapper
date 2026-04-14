import SwiftUI

struct CourseNavigationActions: View {
    var course: CourseDetailReference

    @Environment(\.openURL) private var openURL

    var body: some View {
        if let location = course.location?.nilIfBlank {
            Button {
                openMaps(for: location, directions: true)
            } label: {
                Label("Navigate to lecture", systemImage: "location.north.line")
            }

            Button {
                openMaps(for: location, directions: false)
            } label: {
                Label("Show lecture on map", systemImage: "map")
            }

            LabeledContent("Destination", value: location)
        }
    }

    private func openMaps(for location: String, directions: Bool) {
        var components = URLComponents()
        components.scheme = "https"
        components.host = "maps.apple.com"
        components.queryItems = directions ? [
            URLQueryItem(name: "daddr", value: location),
            URLQueryItem(name: "dirflg", value: "w")
        ] : [
            URLQueryItem(name: "q", value: location)
        ]

        guard let url = components.url else { return }
        openURL(url)
    }
}

private extension String {
    var nilIfBlank: String? {
        let value = trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : value
    }
}

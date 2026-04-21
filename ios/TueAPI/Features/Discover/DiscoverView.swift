import SwiftUI

struct DiscoverView: View {
    var model: AppModel

    @State private var selectedScope: DiscoverScope = .campus

    var body: some View {
        VStack(spacing: 0) {
            Picker("Discover area", selection: $selectedScope) {
                ForEach(DiscoverScope.allCases) { scope in
                    Text(scope.title).tag(scope)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            .padding(.vertical, 10)

            Divider()

            switch selectedScope {
            case .campus:
                CampusMapView()
            case .talks:
                TalksView()
            case .career:
                CareerView(model: model)
            }
        }
        .navigationTitle(selectedScope.title)
    }
}

private enum DiscoverScope: String, CaseIterable, Identifiable {
    case campus
    case talks
    case career

    var id: Self { self }

    var title: String {
        switch self {
        case .campus:
            "Campus"
        case .talks:
            "Talks"
        case .career:
            "Career"
        }
    }
}

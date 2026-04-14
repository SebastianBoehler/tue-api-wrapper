import MapKit
import SwiftUI

struct CampusMapView: View {
    @State private var store = CampusHappeningStore()
    @State private var selectedHappening: CampusHappening?
    @State private var isShowingPostSheet = false
    @State private var mapPosition = MapCameraPosition.region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 48.5236, longitude: 9.0576),
            span: MKCoordinateSpan(latitudeDelta: 0.04, longitudeDelta: 0.04)
        )
    )

    var body: some View {
        VStack(spacing: 0) {
            Map(position: $mapPosition, selection: $selectedHappening) {
                ForEach(CampusLandmark.important) { landmark in
                    Marker(
                        landmark.name,
                        systemImage: landmark.symbolName,
                        coordinate: landmark.coordinate
                    )
                    .tint(.blue)
                }

                ForEach(store.happenings) { happening in
                    Marker(
                        happening.title,
                        systemImage: happening.category.symbolName,
                        coordinate: happening.coordinate
                    )
                    .tint(happening.category.tint)
                    .tag(happening)
                }
            }
            .frame(minHeight: 260)
            .mapControls {
                MapCompass()
                MapScaleView()
            }

            List {
                Section {
                    statusContent
                }

                Section("Places") {
                    ForEach(CampusLandmark.important) { landmark in
                        LandmarkRow(landmark: landmark)
                            .onTapGesture {
                                mapPosition = .region(landmark.focusRegion)
                            }
                    }
                }

                Section("Happenings") {
                    if store.happenings.isEmpty {
                        ContentUnavailableView(
                            "No happenings yet",
                            systemImage: "map",
                            description: Text("Post a study session, lunch plan, pickup sport, or campus meetup.")
                        )
                    } else {
                        ForEach(store.happenings) { happening in
                            HappeningRow(happening: happening)
                                .onTapGesture {
                                    selectedHappening = happening
                                    mapPosition = .region(happening.focusRegion)
                                }
                        }
                        .onDelete(perform: store.delete)
                    }
                }
            }
        }
        .navigationTitle("Campus")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    isShowingPostSheet = true
                } label: {
                    Label("Post happening", systemImage: "plus")
                }
            }
        }
        .sheet(isPresented: $isShowingPostSheet) {
            PostHappeningSheet(store: store)
        }
    }

    @ViewBuilder
    private var statusContent: some View {
        switch store.phase {
        case .idle:
            StatusBanner(
                title: "Campus map",
                message: "Important campus places are pinned. Posts are saved on this device after Maps finds the location.",
                systemImage: "mappin.and.ellipse"
            )
        case .saving:
            ProgressView("Finding location")
        case .saved:
            StatusBanner(title: "Posted", message: "The happening is pinned on the map.", systemImage: "checkmark.circle")
        case .failed(let message):
            StatusBanner(title: "Could not post", message: message, systemImage: "exclamationmark.triangle")
        }
    }
}

private struct LandmarkRow: View {
    var landmark: CampusLandmark

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label(landmark.name, systemImage: landmark.symbolName)
                .font(.headline)
            Text(landmark.detail)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}

private struct HappeningRow: View {
    var happening: CampusHappening

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Label(happening.title, systemImage: happening.category.symbolName)
                    .font(.headline)
                Spacer()
                Text(happening.category.label)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(happening.category.tint)
            }
            Label(happening.locationName, systemImage: "mappin.and.ellipse")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            if let note = happening.note {
                Text(note)
                    .font(.subheadline)
            }
            Text(happening.startsAt.formatted(date: .abbreviated, time: .shortened))
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}

private struct PostHappeningSheet: View {
    var store: CampusHappeningStore

    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var locationName = ""
    @State private var note = ""
    @State private var category: HappeningCategory = .social
    @State private var startsAt = Date()

    var body: some View {
        NavigationStack {
            Form {
                Section("Happening") {
                    TextField("Coffee after lecture", text: $title)
                    Picker("Type", selection: $category) {
                        ForEach(HappeningCategory.allCases) { category in
                            Label(category.label, systemImage: category.symbolName)
                                .tag(category)
                        }
                    }
                    DatePicker("Starts", selection: $startsAt)
                }

                Section("Location") {
                    TextField("Neue Aula, Morgenstelle, room name", text: $locationName)
                    Text("Use a location Maps can find around Tübingen.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("Details") {
                    TextField("What should others know?", text: $note, axis: .vertical)
                        .lineLimit(3, reservesSpace: true)
                }

                if case .failed(let message) = store.phase {
                    Section {
                        StatusBanner(title: "Could not post", message: message, systemImage: "exclamationmark.triangle")
                    }
                }
            }
            .navigationTitle("Post")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Post") {
                        Task {
                            await store.post(
                                title: title,
                                locationName: locationName,
                                note: note,
                                category: category,
                                startsAt: startsAt
                            )
                            if case .saved = store.phase {
                                dismiss()
                            }
                        }
                    }
                    .disabled(store.phase == .saving)
                }
            }
        }
    }
}

private extension CampusLandmark {
    var focusRegion: MKCoordinateRegion {
        MKCoordinateRegion(
            center: coordinate,
            span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
        )
    }
}

private extension CampusHappening {
    var focusRegion: MKCoordinateRegion {
        MKCoordinateRegion(
            center: coordinate,
            span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
        )
    }
}

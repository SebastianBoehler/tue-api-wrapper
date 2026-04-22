import MapKit
import SwiftUI

struct CampusMapView: View {
    @State private var store = CampusHappeningStore()
    @StateObject private var locationController = CampusLocationController()
    @State private var selectedSection: CampusMapSection = .places
    @State private var selectedHappening: CampusHappening?
    @State private var isShowingPostSheet = false
    @State private var mapPosition = MapCameraPosition.region(Self.defaultRegion)

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .bottom) {
                Map(position: $mapPosition, selection: $selectedHappening) {
                    UserAnnotation()

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
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .ignoresSafeArea(edges: .bottom)
                .mapControls {
                    MapCompass()
                    MapScaleView()
                }
                .overlay(alignment: .topTrailing) {
                    CampusMapFloatingControls(
                        focusUser: focusUser,
                        openPost: { isShowingPostSheet = true }
                    )
                    .padding(.top, 16)
                    .padding(.trailing, 16)
                }

                CampusMapBottomSheet(
                    selectedSection: $selectedSection,
                    statusLine: statusLine,
                    store: store,
                    focusLandmark: focusLandmark(_:),
                    focusHappening: focusHappening(_:),
                    openPost: { isShowingPostSheet = true }
                )
                .padding(.horizontal, 16)
                .padding(.bottom, max(104, proxy.safeAreaInsets.bottom + 72))
            }
            .background(Color(uiColor: .systemGroupedBackground))
        }
        .navigationTitle("Campus")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $isShowingPostSheet) {
            PostHappeningSheet(store: store)
        }
        .task {
            locationController.requestAuthorizationIfNeeded()
        }
        .onChange(of: selectedHappening) { _, newValue in
            if newValue != nil {
                selectedSection = .happenings
            }
        }
    }

    private var statusLine: CampusMapStatusLine? {
        switch store.phase {
        case .saving:
            return CampusMapStatusLine(
                text: "Finding location for your post.",
                tint: .accentColor,
                isLoading: true
            )
        case .saved:
            return CampusMapStatusLine(
                text: "Happening posted on the map.",
                systemImage: "checkmark.circle",
                tint: .accentColor
            )
        case .failed(let message):
            return CampusMapStatusLine(
                text: message,
                systemImage: "exclamationmark.triangle",
                tint: .orange
            )
        case .idle:
            return locationController.permissionStatusLine
        }
    }

    private func focusUser() {
        locationController.refreshLocation()
        guard let coordinate = locationController.lastLocation else {
            return
        }
        mapPosition = .region(
            MKCoordinateRegion(
                center: coordinate,
                span: MKCoordinateSpan(latitudeDelta: 0.008, longitudeDelta: 0.008)
            )
        )
    }

    private func focusLandmark(_ landmark: CampusLandmark) {
        selectedHappening = nil
        selectedSection = .places
        mapPosition = .region(landmark.focusRegion)
    }

    private func focusHappening(_ happening: CampusHappening) {
        selectedHappening = happening
        selectedSection = .happenings
        mapPosition = .region(happening.focusRegion)
    }

    private static let defaultRegion = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 48.5236, longitude: 9.0576),
        span: MKCoordinateSpan(latitudeDelta: 0.04, longitudeDelta: 0.04)
    )
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

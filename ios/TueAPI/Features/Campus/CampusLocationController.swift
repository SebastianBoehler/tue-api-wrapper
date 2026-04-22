import CoreLocation
import SwiftUI

final class CampusLocationController: NSObject, ObservableObject, CLLocationManagerDelegate {
    @Published private(set) var authorizationStatus: CLAuthorizationStatus
    @Published private(set) var lastLocation: CLLocationCoordinate2D?
    @Published private(set) var errorMessage: String?

    private let manager: CLLocationManager

    override init() {
        let manager = CLLocationManager()
        self.manager = manager
        self.authorizationStatus = manager.authorizationStatus
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
    }

    var permissionStatusLine: CampusMapStatusLine? {
        switch authorizationStatus {
        case .restricted, .denied:
            return CampusMapStatusLine(
                text: "Allow location access to show your position on campus.",
                systemImage: "location.slash",
                tint: .orange
            )
        default:
            return nil
        }
    }

    func requestAuthorizationIfNeeded() {
        switch authorizationStatus {
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        case .authorizedAlways, .authorizedWhenInUse:
            manager.startUpdatingLocation()
            manager.requestLocation()
        case .restricted, .denied:
            break
        @unknown default:
            break
        }
    }

    func refreshLocation() {
        requestAuthorizationIfNeeded()
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus
        if authorizationStatus == .authorizedAlways || authorizationStatus == .authorizedWhenInUse {
            manager.startUpdatingLocation()
            manager.requestLocation()
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        lastLocation = locations.last?.coordinate
        errorMessage = nil
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        errorMessage = error.localizedDescription
    }
}

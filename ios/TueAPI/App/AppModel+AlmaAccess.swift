import Foundation

extension AppModel {
    func almaAccessContext(for feature: String) throws -> (client: AlmaClient, credentials: AlmaCredentials) {
        guard let baseURL = URL(string: baseURLString),
              ["http", "https"].contains(baseURL.scheme?.lowercased() ?? "") else {
            throw AlmaClientError.invalidURL
        }
        guard let credentials = try keychain.load() else {
            throw AlmaClientError.courseRegistration("Connect your university account before trying to \(feature).")
        }
        return (AlmaClient(baseURL: baseURL), credentials)
    }
}

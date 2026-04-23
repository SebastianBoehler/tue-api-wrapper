import Foundation
import UIKit

struct AppFeedbackContext {
    var appVersion: String
    var buildNumber: String
    var systemVersion: String
    var deviceModel: String

    var versionLabel: String {
        "\(appVersion) (\(buildNumber))"
    }

    static var current: AppFeedbackContext {
        let info = Bundle.main.infoDictionary ?? [:]
        let appVersion = info["CFBundleShortVersionString"] as? String ?? "unknown"
        let buildNumber = info["CFBundleVersion"] as? String ?? "unknown"
        return AppFeedbackContext(
            appVersion: appVersion,
            buildNumber: buildNumber,
            systemVersion: "\(UIDevice.current.systemName) \(UIDevice.current.systemVersion)",
            deviceModel: UIDevice.current.model
        )
    }
}

import Foundation

struct CriticalActionResult: Hashable {
    var status: String
    var message: String?
    var finalURL: URL?

    var displayMessage: String {
        if let message, !message.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return message
        }
        return "Finished with status \(status)."
    }
}

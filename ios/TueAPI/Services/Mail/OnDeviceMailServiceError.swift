import Foundation

enum OnDeviceMailServiceError: LocalizedError {
    case credentialsMissing
    case invalidUID
    case emptyMessage(String)

    var errorDescription: String? {
        switch self {
        case .credentialsMissing:
            "Connect your university account in Settings to read mail."
        case .invalidUID:
            "The selected mail message identifier is invalid."
        case .emptyMessage(let uid):
            "The mail server returned no message body for UID \(uid)."
        }
    }
}

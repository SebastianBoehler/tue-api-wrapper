import Foundation
import Network

enum IMAPConnectionError: LocalizedError {
    case invalidPort
    case connectionFailed(String)
    case disconnected
    case unexpectedGreeting(String)
    case commandFailed(String)

    var errorDescription: String? {
        switch self {
        case .invalidPort:
            "The mail server port is invalid."
        case .connectionFailed(let message):
            "Could not connect to the mail server: \(message)"
        case .disconnected:
            "The mail server closed the connection."
        case .unexpectedGreeting(let line):
            "The mail server returned an unexpected greeting: \(line)"
        case .commandFailed(let line):
            "The mail server rejected the request: \(line)"
        }
    }
}

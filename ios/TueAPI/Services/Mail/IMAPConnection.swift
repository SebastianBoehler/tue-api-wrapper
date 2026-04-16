import Foundation
import Network

final class IMAPConnection {
    private let connection: NWConnection
    private let queue = DispatchQueue(label: "dev.sebastianboehler.tueapi.imap")
    private var buffer = Data()
    private var commandNumber = 1

    init(config: MailServerConfig) throws {
        guard let port = NWEndpoint.Port(rawValue: config.port) else {
            throw IMAPConnectionError.invalidPort
        }

        let parameters = NWParameters(tls: NWProtocolTLS.Options())
        connection = NWConnection(
            host: NWEndpoint.Host(config.host),
            port: port,
            using: parameters
        )
    }

    func connect() async throws {
        try await waitUntilReady()
        let greeting = try await readLine()
        guard greeting.hasPrefix("* OK") || greeting.hasPrefix("* PREAUTH") else {
            throw IMAPConnectionError.unexpectedGreeting(greeting)
        }
    }

    func login(username: String, password: String) async throws {
        _ = try await command(
            "LOGIN \(IMAPEncoding.quoted(username)) \(IMAPEncoding.quoted(password))"
        )
    }

    func command(_ command: String) async throws -> IMAPCommandResponse {
        let tag = nextTag()
        try await send("\(tag) \(command)\r\n")

        var lines: [String] = []
        var literals: [Data] = []

        while true {
            let line = try await readLine()
            lines.append(line)

            if let count = IMAPEncoding.literalCount(in: line) {
                literals.append(try await readBytes(count: count))
            }

            guard line.hasPrefix("\(tag) ") else {
                continue
            }

            if line.hasPrefix("\(tag) OK") {
                return IMAPCommandResponse(lines: lines, literals: literals)
            }
            throw IMAPConnectionError.commandFailed(line)
        }
    }

    func close() {
        connection.cancel()
    }

    private func waitUntilReady() async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            let gate = ContinuationGate()
            connection.stateUpdateHandler = { state in
                switch state {
                case .ready:
                    gate.resume {
                        continuation.resume()
                    }
                case .failed(let error), .waiting(let error):
                    gate.resume {
                        continuation.resume(
                            throwing: IMAPConnectionError.connectionFailed(error.localizedDescription)
                        )
                    }
                case .cancelled:
                    gate.resume {
                        continuation.resume(throwing: IMAPConnectionError.disconnected)
                    }
                default:
                    break
                }
            }
            connection.start(queue: queue)
        }
    }

    private func send(_ value: String) async throws {
        guard let data = value.data(using: .utf8) else {
            throw IMAPConnectionError.commandFailed("Could not encode IMAP command.")
        }

        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            connection.send(content: data, completion: .contentProcessed { error in
                if let error {
                    continuation.resume(
                        throwing: IMAPConnectionError.connectionFailed(error.localizedDescription)
                    )
                } else {
                    continuation.resume()
                }
            })
        }
    }

    private func readLine() async throws -> String {
        let newline = Data([13, 10])

        while true {
            if let range = buffer.range(of: newline) {
                let lineData = buffer.subdata(in: buffer.startIndex..<range.lowerBound)
                buffer.removeSubrange(buffer.startIndex..<range.upperBound)
                return String(data: lineData, encoding: .utf8)
                    ?? String(data: lineData, encoding: .isoLatin1)
                    ?? ""
            }

            buffer.append(try await receiveChunk())
        }
    }

    private func readBytes(count: Int) async throws -> Data {
        while buffer.count < count {
            buffer.append(try await receiveChunk())
        }

        let bytes = buffer.prefix(count)
        buffer.removeSubrange(buffer.startIndex..<buffer.index(buffer.startIndex, offsetBy: count))
        return Data(bytes)
    }

    private func receiveChunk() async throws -> Data {
        try await withCheckedThrowingContinuation { continuation in
            connection.receive(minimumIncompleteLength: 1, maximumLength: 16 * 1024) { data, _, isComplete, error in
                if let error {
                    continuation.resume(
                        throwing: IMAPConnectionError.connectionFailed(error.localizedDescription)
                    )
                    return
                }

                if let data, !data.isEmpty {
                    continuation.resume(returning: data)
                    return
                }

                if isComplete {
                    continuation.resume(throwing: IMAPConnectionError.disconnected)
                    return
                }

                continuation.resume(returning: Data())
            }
        }
    }

    private func nextTag() -> String {
        defer { commandNumber += 1 }
        return "A\(String(format: "%04d", commandNumber))"
    }
}

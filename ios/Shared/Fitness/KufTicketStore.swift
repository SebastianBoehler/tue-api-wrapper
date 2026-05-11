import Foundation

struct KufTicketStore {
    private static let defaultKey = "fitness.kuf.ticket.v1"

    private let defaults: UserDefaults
    private let key: String

    init?() {
        guard let defaults = UserDefaults(suiteName: AppGroup.identifier) else {
            return nil
        }
        self.init(defaults: defaults)
    }

    init(defaults: UserDefaults, key: String = Self.defaultKey) {
        self.defaults = defaults
        self.key = key
    }

    func loadTicket() -> KufTicket? {
        guard let data = defaults.data(forKey: key) else { return nil }
        return try? decoder.decode(KufTicket.self, from: data)
    }

    func save(_ ticket: KufTicket) throws {
        let data = try encoder.encode(ticket)
        defaults.set(data, forKey: key)
    }

    func deleteTicket() {
        defaults.removeObject(forKey: key)
    }

    private var encoder: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }

    private var decoder: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }
}

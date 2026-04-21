import Foundation

struct KufOccupancyHistoryRecord: Codable, Hashable, Identifiable {
    var facilityId: String
    var facilityName: String
    var count: Int
    var recordedAt: Date
    var hourStartedAt: Date

    var id: String {
        "\(facilityId)-\(Int(hourStartedAt.timeIntervalSince1970))"
    }
}

struct KufOccupancyHistoryStore {
    private static let defaultKey = "fitness.kuf.occupancy.history.v1"
    private static let retentionDays = 90

    private let defaults: UserDefaults
    private let key: String
    private let calendar: Calendar

    init?() {
        guard let defaults = UserDefaults(suiteName: AppGroup.identifier) else {
            return nil
        }
        self.init(defaults: defaults)
    }

    init(
        defaults: UserDefaults,
        key: String = Self.defaultKey,
        calendar: Calendar = .current
    ) {
        self.defaults = defaults
        self.key = key
        self.calendar = calendar
    }

    func loadRecords() -> [KufOccupancyHistoryRecord] {
        guard let data = defaults.data(forKey: key),
              let records = try? decoder.decode([KufOccupancyHistoryRecord].self, from: data) else {
            return []
        }
        return records.sorted { $0.hourStartedAt < $1.hourStartedAt }
    }

    func record(_ occupancy: KufTrainingOccupancy, recordedAt: Date = Date()) {
        let hourStartedAt = calendar.dateInterval(of: .hour, for: recordedAt)?.start ?? recordedAt
        let retentionStart = calendar.date(
            byAdding: .day,
            value: -Self.retentionDays,
            to: recordedAt
        ) ?? recordedAt

        var records = loadRecords().filter { record in
            record.hourStartedAt >= retentionStart
                && !(record.facilityId == occupancy.facilityId && record.hourStartedAt == hourStartedAt)
        }
        records.append(
            KufOccupancyHistoryRecord(
                facilityId: occupancy.facilityId,
                facilityName: occupancy.facilityName,
                count: occupancy.count,
                recordedAt: recordedAt,
                hourStartedAt: hourStartedAt
            )
        )
        records.sort { $0.hourStartedAt < $1.hourStartedAt }

        guard let data = try? encoder.encode(records) else {
            return
        }
        defaults.set(data, forKey: key)
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

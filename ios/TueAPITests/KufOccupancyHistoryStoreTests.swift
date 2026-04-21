import XCTest
@testable import TueAPI

final class KufOccupancyHistoryStoreTests: XCTestCase {
    func testRecordKeepsOneSamplePerHour() throws {
        let (store, suiteName) = try makeStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }

        store.record(makeOccupancy(count: 12), recordedAt: makeDate(hour: 10, minute: 5))
        store.record(makeOccupancy(count: 18), recordedAt: makeDate(hour: 10, minute: 55))

        let records = store.loadRecords()
        XCTAssertEqual(records.count, 1)
        XCTAssertEqual(records[0].count, 18)
        XCTAssertEqual(records[0].hourStartedAt, makeDate(hour: 10, minute: 0))
    }

    func testRecordPrunesSamplesOlderThanRetentionWindow() throws {
        let (store, suiteName) = try makeStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }

        store.record(makeOccupancy(count: 8), recordedAt: makeDate(day: 1, hour: 9))
        store.record(makeOccupancy(count: 14), recordedAt: makeDate(day: 95, hour: 9))

        let records = store.loadRecords()
        XCTAssertEqual(records.count, 1)
        XCTAssertEqual(records[0].count, 14)
    }

    private func makeStore() throws -> (KufOccupancyHistoryStore, String) {
        let suiteName = "KufOccupancyHistoryStoreTests.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suiteName))
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        return (KufOccupancyHistoryStore(defaults: defaults, calendar: calendar), suiteName)
    }

    private func makeOccupancy(count: Int) -> KufTrainingOccupancy {
        KufTrainingOccupancy(
            facilityId: "kuf",
            facilityName: "Kraft und Fitnesshalle",
            count: count,
            sourceURL: URL(string: "https://example.com/kuf")!,
            imageURL: URL(string: "https://example.com/kuf.png")!,
            retrievedAt: "2026-04-21T08:00:00Z",
            refreshAfterSeconds: 900
        )
    }

    private func makeDate(day: Int = 21, hour: Int, minute: Int = 0) -> Date {
        var components = DateComponents()
        components.calendar = Calendar(identifier: .gregorian)
        components.timeZone = TimeZone(secondsFromGMT: 0)
        components.year = 2026
        components.month = 4
        components.day = day
        components.hour = hour
        components.minute = minute
        return components.date!
    }
}

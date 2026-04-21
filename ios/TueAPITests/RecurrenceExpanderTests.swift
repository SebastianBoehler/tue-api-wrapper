import XCTest
@testable import TueAPI

final class RecurrenceExpanderTests: XCTestCase {
    func testNonRecurringLectureThatAlreadyStartedStillExpands() throws {
        let start = makeDate(hour: 10, minute: 0)
        let end = makeDate(hour: 11, minute: 30)
        let windowStart = makeDate(hour: 10, minute: 3)
        let windowEnd = makeDate(day: 22, hour: 10, minute: 3)
        let event = makeEvent(start: start, end: end)

        let lectures = try RecurrenceExpander.expand([event], from: windowStart, to: windowEnd)

        XCTAssertEqual(lectures.count, 1)
        XCTAssertEqual(lectures[0].startDate, start)
        XCTAssertEqual(lectures[0].endDate, end)
    }

    func testRecurringLectureThatAlreadyStartedStillExpands() throws {
        let start = makeDate(hour: 10, minute: 0)
        let end = makeDate(hour: 11, minute: 30)
        let windowStart = makeDate(hour: 10, minute: 3)
        let windowEnd = makeDate(day: 22, hour: 10, minute: 3)
        let event = makeEvent(
            start: start,
            end: end,
            recurrenceRule: "FREQ=WEEKLY;COUNT=1"
        )

        let lectures = try RecurrenceExpander.expand([event], from: windowStart, to: windowEnd)

        XCTAssertEqual(lectures.count, 1)
        XCTAssertEqual(lectures[0].startDate, start)
        XCTAssertEqual(lectures[0].endDate, end)
    }

    func testEndedLectureBeforeWindowIsSkipped() throws {
        let start = makeDate(hour: 8, minute: 0)
        let end = makeDate(hour: 9, minute: 30)
        let windowStart = makeDate(hour: 10, minute: 3)
        let windowEnd = makeDate(day: 22, hour: 10, minute: 3)
        let event = makeEvent(start: start, end: end)

        let lectures = try RecurrenceExpander.expand([event], from: windowStart, to: windowEnd)

        XCTAssertTrue(lectures.isEmpty)
    }

    private func makeEvent(
        start: Date,
        end: Date?,
        recurrenceRule: String? = nil
    ) -> AlmaCalendarEvent {
        AlmaCalendarEvent(
            summary: "Current Lecture",
            startDate: start,
            endDate: end,
            location: nil,
            detail: nil,
            uid: "current-lecture",
            recurrenceRule: recurrenceRule,
            excludedStarts: []
        )
    }

    private func makeDate(day: Int = 21, hour: Int, minute: Int) -> Date {
        var components = DateComponents()
        components.calendar = ICSDateParser.calendar()
        components.timeZone = components.calendar?.timeZone
        components.year = 2026
        components.month = 4
        components.day = day
        components.hour = hour
        components.minute = minute
        return components.date!
    }
}

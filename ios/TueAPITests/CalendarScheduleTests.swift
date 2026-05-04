import XCTest
@testable import TueAPI

final class CalendarScheduleTests: XCTestCase {
    func testDaysExpandLectureRangeToFullWeeks() throws {
        let events = [
            makeLecture(id: "first", day: 14),
            makeLecture(id: "second", day: 23),
        ]

        let days = CalendarSchedule.days(from: events)

        XCTAssertEqual(days.count, 14)
        XCTAssertEqual(dayNumber(days.first), 13)
        XCTAssertEqual(dayNumber(days.last), 26)
        XCTAssertTrue(days.contains { dayNumber($0) == 18 })
        XCTAssertTrue(days.contains { dayNumber($0) == 19 })
    }

    private func makeLecture(id: String, day: Int) -> LectureEvent {
        var components = DateComponents()
        components.calendar = CalendarSchedule.calendar
        components.timeZone = CalendarSchedule.calendar.timeZone
        components.year = 2026
        components.month = 4
        components.day = day
        components.hour = 10
        components.minute = 0
        let startDate = CalendarSchedule.calendar.date(from: components)!

        return LectureEvent(
            id: id,
            title: "Lecture \(id)",
            startDate: startDate,
            endDate: startDate.addingTimeInterval(90 * 60),
            location: "Campus"
        )
    }

    private func dayNumber(_ date: Date?) -> Int? {
        guard let date else { return nil }
        return CalendarSchedule.calendar.component(.day, from: date)
    }
}

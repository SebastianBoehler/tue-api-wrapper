import XCTest
@testable import TueAPI

final class AlmaTimetableRoomHTMLParserTests: XCTestCase {
    func testParsesDetailedRoomFields() throws {
        let entries = AlmaTimetableRoomHTMLParser.entries(
            from: Self.roomDetailHTML,
            pageURL: URL(string: "https://alma.example/alma/pages/plan/individualTimetable.xhtml")!
        )

        let entry = try XCTUnwrap(entries.first)
        XCTAssertEqual(entry.summary, "INFO4195b AI for Scientific Discovery")
        XCTAssertEqual(entry.weekday, 4)
        XCTAssertEqual(entry.startTime, "18:00")
        XCTAssertEqual(entry.endTime, "20:00")
        XCTAssertEqual(entry.roomDetails.floorDefault, "EG")
        XCTAssertEqual(entry.roomDetails.buildingDefault, "Cyber Valley Campus, MVL1")
        XCTAssertEqual(entry.roomDetails.campusDefault, "Morgenstelle")
        XCTAssertEqual(
            entry.roomDetails.displayText,
            "Hörsaal A1 (A-206), EG, Cyber Valley Campus, MVL1, Morgenstelle"
        )
        XCTAssertEqual(
            entry.roomDetails.detailURL?.absoluteString,
            "https://alma.example/alma/pages/cm/exa/searchRoomDetail.xhtml?roomId=470"
        )
    }

    func testEnrichesLectureEventsWithDetailedRoomFields() throws {
        let lecture = LectureEvent(
            id: "ai-20260422",
            title: "INFO4195b AI for Scientific Discovery",
            startDate: try Self.date("2026-04-22 18:00"),
            endDate: try Self.date("2026-04-22 20:00"),
            location: "Hörsaal A1 (A-206) Cyber Valley Campus, MVL1"
        )

        let enriched = AlmaTimetableRoomHTMLParser.enrich(
            [lecture],
            html: Self.roomDetailHTML,
            pageURL: URL(string: "https://alma.example/alma/pages/plan/individualTimetable.xhtml")!
        )

        XCTAssertEqual(
            enriched.first?.location,
            "Hörsaal A1 (A-206), EG, Cyber Valley Campus, MVL1, Morgenstelle"
        )
        XCTAssertEqual(enriched.first?.roomDetails?.floorDefault, "EG")
    }

    private static func date(_ value: String) throws -> Date {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "Europe/Berlin")
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        return try XCTUnwrap(formatter.date(from: value))
    }

    private static let roomDetailHTML = """
    <div class="schedulePanel" id="plan:schedule:scheduleColumn:0:termin:0:scheduleItem:schedulePanelGroup">
      <div class="scheduleItemInnerContent">
        <h3 class="scheduleTitle">INFO4195b AI for Scientific Discovery</h3>
        <span id="plan:schedule:scheduleColumn:0:termin:0:scheduleItem:weekdayDefaulttext">Mittwoch</span>
        <span id="plan:schedule:scheduleColumn:0:termin:0:scheduleItem:processingTimes">18:00 bis 20:00</span>
        <span id="plan:schedule:scheduleColumn:0:termin:0:scheduleItem:scheduleStartDate">15.04.2026</span>
        <span id="plan:schedule:scheduleColumn:0:termin:0:scheduleItem:scheduleEndDate">22.07.2026</span>
        <a href="/alma/pages/cm/exa/searchRoomDetail.xhtml?roomId=470"
           id="plan:schedule:scheduleColumn:0:termin:0:scheduleItem:roomDefaulttext:showRoomDetailLink">
          <span>Hörsaal A1 (A-206)</span>
        </a>
        <span id="plan:schedule:scheduleColumn:0:termin:0:scheduleItem:floorDefaulttext">EG</span>
        <span id="plan:schedule:scheduleColumn:0:termin:0:scheduleItem:buildingDefaulttext">
          Cyber Valley Campus, MVL1
        </span>
        <span id="plan:schedule:scheduleColumn:0:termin:0:scheduleItem:campusDefaulttext">Morgenstelle</span>
      </div>
    </div>
    """
}

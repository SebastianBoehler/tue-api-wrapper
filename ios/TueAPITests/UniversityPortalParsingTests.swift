import XCTest
@testable import TueAPI

final class UniversityPortalParsingTests: XCTestCase {
    func testIliasTaskParserExtractsDerivedTaskRows() throws {
        let pageURL = URL(string: "https://ovidius.uni-tuebingen.de/ilias3/ilias.php?baseClass=ilderivedtasksgui")!
        let html = """
        <html>
          <head><title>ILIAS Universität Tübingen</title></head>
          <body>
            <div class="il-item il-std-item">
              <div class="il-item-title">
                <a href="goto.php/exc_123">Assignment 4 &amp; Review</a>
              </div>
              <span class="il-item-property-name">Übung</span>
              <span class="il-item-property-value">Practical Machine Learning</span>
              <span class="il-item-property-name">Beginn</span>
              <span class="il-item-property-value">17. Apr 2026</span>
              <span class="il-item-property-name">Ende</span>
              <span class="il-item-property-value">24. Apr 2026, 23:59</span>
            </div>
          </body>
        </html>
        """

        let tasks = try IliasTaskHTMLParser.parse(html, pageURL: pageURL)

        XCTAssertEqual(tasks.count, 1)
        XCTAssertEqual(tasks[0].title, "Assignment 4 & Review")
        XCTAssertEqual(tasks[0].url, "https://ovidius.uni-tuebingen.de/ilias3/goto.php/exc_123")
        XCTAssertEqual(tasks[0].itemType, "Practical Machine Learning")
        XCTAssertEqual(tasks[0].start, "17. Apr 2026")
        XCTAssertEqual(tasks[0].end, "24. Apr 2026, 23:59")
    }

    func testMoodleCalendarNormalizerExtractsActionableEvents() throws {
        let baseURL = URL(string: "https://moodle.zdv.uni-tuebingen.de")!
        let payload = """
        [{
          "error": false,
          "data": {
            "events": [{
              "id": 42,
              "name": "Essay submission",
              "timesort": 1777071540,
              "formattedtime": "Due Friday, 24 April 2026, 23:59",
              "course": {"id": 7, "fullname": "Probabilistic Machine Learning"},
              "action": {"url": "/mod/assign/view.php?id=99"}
            }]
          }
        }]
        """.data(using: .utf8)!

        let deadlines = try MoodleCalendarNormalizer.deadlines(from: payload, baseURL: baseURL)

        XCTAssertEqual(deadlines.count, 1)
        XCTAssertEqual(deadlines[0].rawId, 42)
        XCTAssertEqual(deadlines[0].title, "Essay submission")
        XCTAssertEqual(deadlines[0].formattedTime, "Due Friday, 24 April 2026, 23:59")
        XCTAssertEqual(deadlines[0].courseName, "Probabilistic Machine Learning")
        XCTAssertEqual(deadlines[0].courseId, 7)
        XCTAssertEqual(deadlines[0].actionURL, "https://moodle.zdv.uni-tuebingen.de/mod/assign/view.php?id=99")
        XCTAssertTrue(deadlines[0].isActionable)
    }

    func testMoodleCalendarNormalizerThrowsMoodleErrorMessage() throws {
        let baseURL = URL(string: "https://moodle.zdv.uni-tuebingen.de")!
        let payload = """
        [{"error": true, "exception": "Invalid sesskey"}]
        """.data(using: .utf8)!

        XCTAssertThrowsError(try MoodleCalendarNormalizer.deadlines(from: payload, baseURL: baseURL)) { error in
            XCTAssertEqual(error.localizedDescription, "Invalid sesskey")
        }
    }
}

import XCTest
@testable import TueAPI

final class MoodleGradesHTMLParserTests: XCTestCase {
    func testParsesGradeOverviewRows() throws {
        let html = """
        <table>
          <thead>
            <tr><th>Course</th><th>Grade</th><th>Percentage</th><th>Range</th><th>Rank</th><th>Feedback</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><a href="/grade/report/user/index.php?id=42">Data Systems</a></td>
              <td>1,7</td>
              <td>86%</td>
              <td>0-100</td>
              <td>3/20</td>
              <td>Good work</td>
            </tr>
          </tbody>
        </table>
        """

        let response = MoodleGradesHTMLParser.parse(
            html,
            pageURL: URL(string: "https://moodle.zdv.uni-tuebingen.de/grade/report/overview/index.php")!,
            limit: 10
        )

        XCTAssertEqual(response.items.count, 1)
        XCTAssertEqual(response.items[0].courseTitle, "Data Systems")
        XCTAssertEqual(response.items[0].grade, "1,7")
        XCTAssertEqual(response.items[0].percentage, "86%")
        XCTAssertEqual(response.items[0].rangeHint, "0-100")
        XCTAssertEqual(response.items[0].rank, "3/20")
        XCTAssertEqual(response.items[0].feedback, "Good work")
        XCTAssertEqual(
            response.items[0].url,
            "https://moodle.zdv.uni-tuebingen.de/grade/report/user/index.php?id=42"
        )
    }
}

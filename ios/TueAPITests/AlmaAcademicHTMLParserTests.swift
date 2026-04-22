import XCTest
@testable import TueAPI

final class AlmaAcademicHTMLParserTests: XCTestCase {
    func testParsesEnrollmentTermsAndMessage() throws {
        let html = """
        <form id="studentOverviewForm">
          <select name="studentOverviewForm:enrollmentsDiv:termSelector:termPeriodDropDownList_input">
            <option value="20241">Winter 2024/25</option>
            <option value="20251" selected="selected">Summer 2025</option>
          </select>
          <p>Sie haben bisher fuer diesen Studiengang keine Anmeldung zugelassen.</p>
        </form>
        <h2>Personendaten: Sebastian Böhler</h2>
        """

        let enrollment = try AlmaAcademicHTMLParser.parseEnrollment(html)

        XCTAssertEqual(enrollment.selectedTerm, "Summer 2025")
        XCTAssertEqual(enrollment.availableTerms["Winter 2024/25"], "20241")
        XCTAssertEqual(enrollment.message, "Sie haben bisher fuer diesen Studiengang keine Anmeldung zugelassen.")
        XCTAssertEqual(enrollment.personName, "Sebastian Böhler")
    }

    func testParsesExamOverviewRows() throws {
        let html = """
        <table class="treeTableWithIcons">
          <tr class="treeTableCellLevel2">
            <td><img class="submitImageTable" alt="Module"></td>
            <td><span id="examsReadonly:0:defaulttext">Algorithms</span></td>
            <td><span id="examsReadonly:0:elementnr">INF-101</span></td>
            <td><span id="examsReadonly:0:attempt">1</span></td>
            <td><span id="examsReadonly:0:grade">1,3</span></td>
            <td><span id="examsReadonly:0:bonus">6,0</span></td>
            <td><span id="examsReadonly:0:malus"></span></td>
            <td><span id="examsReadonly:0:workstatus">BE</span></td>
            <td><span id="examsReadonly:0:remark"></span></td>
            <td><span id="examsReadonly:0:release"></span></td>
          </tr>
        </table>
        """

        let exams = try AlmaAcademicHTMLParser.parseExamOverview(html, limit: 10)

        XCTAssertEqual(exams.count, 1)
        XCTAssertEqual(exams[0].level, 2)
        XCTAssertEqual(exams[0].kind, "Module")
        XCTAssertEqual(exams[0].title, "Algorithms")
        XCTAssertEqual(exams[0].number, "INF-101")
        XCTAssertEqual(exams[0].attempt, "1")
        XCTAssertEqual(exams[0].grade, "1,3")
        XCTAssertEqual(exams[0].cp, "6,0")
        XCTAssertEqual(exams[0].status, "BE")
    }

    func testParsesExamRowsWhenTreeTableClassIsMissing() throws {
        let html = """
        <form id="examsReadonly">
          <table id="examsReadonly:tree">
            <tbody>
              <tr>
                <td class="treeTableCellLevel3"><img class="submitImageTable" alt="Konto"></td>
                <td><span id = "examsReadonly:0:unDeftxt">Studienbegleitende Leistungen</span></td>
                <td><span id="examsReadonly:0:elementnr">9055</span></td>
                <td><span id="examsReadonly:0:attempt">1</span></td>
                <td><span id="examsReadonly:0:grade">1,0</span></td>
                <td><span id="examsReadonly:0:bonus">9</span></td>
                <td><span id="examsReadonly:0:malus">0</span></td>
                <td><span id="examsReadonly:0:workstatus">BE</span></td>
                <td><span id="examsReadonly:0:remark"></span></td>
                <td><span id="examsReadonly:0:release"></span></td>
              </tr>
            </tbody>
          </table>
        </form>
        """

        let exams = try AlmaAcademicHTMLParser.parseExamOverview(html, limit: 10)

        XCTAssertEqual(exams.count, 1)
        XCTAssertEqual(exams[0].level, 3)
        XCTAssertEqual(exams[0].kind, "Konto")
        XCTAssertEqual(exams[0].title, "Studienbegleitende Leistungen")
        XCTAssertEqual(exams[0].number, "9055")
        XCTAssertEqual(exams[0].grade, "1,0")
        XCTAssertEqual(exams[0].cp, "9")
        XCTAssertEqual(exams[0].status, "BE")
    }
}

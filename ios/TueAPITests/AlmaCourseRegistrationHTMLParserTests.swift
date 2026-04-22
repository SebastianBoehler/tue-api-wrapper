import XCTest
@testable import TueAPI

final class AlmaCourseRegistrationHTMLParserTests: XCTestCase {
    func testExtractStartRequestBuildsJSFPayload() throws {
        let pageURL = URL(string: "https://alma.uni-tuebingen.de/alma/pages/cm/exa/course/detail.xhtml?unitId=12&periodUsageId=34")!
        let html = """
        <form id="detailViewData" action="/alma/pages/cm/exa/course/detail.xhtml" enctype="application/x-www-form-urlencoded">
          <input type="hidden" name="foo" value="bar">
          <input type="hidden" name="study:modules:moduleAssignments:moduleAssignmentsNavi2NumRowsInput" value="20">
          <button
            id="detailViewData:anmelden"
            onclick="PrimeFaces.ab({'unitId':'12','periodUsageId':'34','belegungsAktion':'ANMELDUNG','detailViewData:anmelden':'detailViewData:anmelden'});return false;"
          >
            Anmeldung
          </button>
        </form>
        """

        let request = try XCTUnwrap(
            AlmaCourseRegistrationHTMLParser.extractStartRequest(from: html, pageURL: pageURL)
        )

        XCTAssertEqual(request.actionURL.absoluteString, "https://alma.uni-tuebingen.de/alma/pages/cm/exa/course/detail.xhtml")
        XCTAssertEqual(request.payload["foo"], "bar")
        XCTAssertEqual(request.payload["unitId"], "12")
        XCTAssertEqual(request.payload["periodUsageId"], "34")
        XCTAssertEqual(request.payload["belegungsAktion"], "ANMELDUNG")
        XCTAssertEqual(request.payload["detailViewData_SUBMIT"], "1")
        XCTAssertEqual(request.payload["detailViewData:_idcl"], "detailViewData:anmelden")
        XCTAssertEqual(
            request.payload["study:modules:moduleAssignments:moduleAssignmentsNavi2NumRowsInput"],
            "300"
        )
    }

    func testExtractStatusTreatsPositiveAndNegativeStatesSeparately() {
        let registeredHTML = """
        <ul class="listMessages">
          <li>Sie sind erfolgreich angemeldet.</li>
        </ul>
        """
        let unregisteredHTML = """
        <ul class="listMessages">
          <li>Sie sind nicht angemeldet.</li>
        </ul>
        """

        XCTAssertEqual(
            AlmaCourseRegistrationHTMLParser.extractStatus(
                from: registeredHTML,
                messages: AlmaCourseRegistrationHTMLParser.extractMessages(from: registeredHTML)
            ),
            "registered"
        )
        XCTAssertEqual(
            AlmaCourseRegistrationHTMLParser.extractStatus(
                from: unregisteredHTML,
                messages: AlmaCourseRegistrationHTMLParser.extractMessages(from: unregisteredHTML)
            ),
            "not_registered"
        )
    }

    func testBuildConfirmRequestSelectsSingleOption() throws {
        let pageURL = URL(string: "https://alma.uni-tuebingen.de/alma/pages/cm/exa/course/enroll.xhtml")!
        let html = """
        <form id="enrollForm" action="/alma/pages/cm/exa/course/enroll.xhtml">
          <input type="hidden" name="token" value="abc">
          <table>
            <tr>
              <td>Lecture Group A</td>
              <td>
                <button
                  name="enrollForm:0:anechtzeit"
                  onclick="PrimeFaces.ab({'planelementId':'111'});return false;"
                >
                  Register
                </button>
              </td>
            </tr>
          </table>
        </form>
        """

        let request = try AlmaCourseRegistrationHTMLParser.buildConfirmRequest(from: html, pageURL: pageURL)

        XCTAssertEqual(request.actionURL.absoluteString, "https://alma.uni-tuebingen.de/alma/pages/cm/exa/course/enroll.xhtml")
        XCTAssertEqual(request.selectedOption.planelementID, "111")
        XCTAssertEqual(request.payload["token"], "abc")
        XCTAssertEqual(request.payload["planelementId"], "111")
        XCTAssertEqual(request.payload["belegungsAktion"], "ANMELDUNG")
        XCTAssertEqual(request.payload["enrollForm_SUBMIT"], "1")
        XCTAssertEqual(request.payload["enrollForm:_idcl"], "enrollForm:0:anechtzeit")
    }

    func testBuildConfirmRequestRejectsMultipleOptionsWithoutSelection() {
        let pageURL = URL(string: "https://alma.uni-tuebingen.de/alma/pages/cm/exa/course/enroll.xhtml")!
        let html = """
        <form id="enrollForm" action="/alma/pages/cm/exa/course/enroll.xhtml">
          <table>
            <tr>
              <td>Group A</td>
              <td><button name="enrollForm:0:anechtzeit" onclick="PrimeFaces.ab({'planelementId':'111'});return false;">A</button></td>
            </tr>
            <tr>
              <td>Group B</td>
              <td><button name="enrollForm:1:anechtzeit" onclick="PrimeFaces.ab({'planelementId':'222'});return false;">B</button></td>
            </tr>
          </table>
        </form>
        """

        XCTAssertThrowsError(
            try AlmaCourseRegistrationHTMLParser.buildConfirmRequest(from: html, pageURL: pageURL)
        ) { error in
            XCTAssertEqual(
                error.localizedDescription,
                "Multiple Alma course-registration paths are available; choose one in Alma directly."
            )
        }
    }
}

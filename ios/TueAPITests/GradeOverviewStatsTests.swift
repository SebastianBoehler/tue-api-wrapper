import XCTest
@testable import TueAPI

final class GradeOverviewStatsTests: XCTestCase {
    func testCountsPassedGradedPendingAndCredits() {
        let stats = GradeOverviewStats(exams: [
            exam(title: "Passed by grade", grade: "1,0", cp: "6,0", status: nil),
            exam(title: "Passed by status", grade: nil, cp: "3.5", status: "BE"),
            exam(title: "Failed", grade: "5,0", cp: "4,0", status: nil),
            exam(title: "Pending", grade: "-", cp: nil, status: nil),
            exam(title: "Empty", grade: nil, cp: nil, status: nil)
        ])

        XCTAssertEqual(stats.actionable.count, 4)
        XCTAssertEqual(stats.graded.count, 2)
        XCTAssertEqual(stats.pending.count, 2)
        XCTAssertEqual(stats.passedExamCount, 2)
        XCTAssertEqual(stats.trackedCredits, 13.5)
    }

    func testBestandenStatusCountsAsPassed() {
        let stats = GradeOverviewStats(exams: [
            exam(title: "Bestanden", grade: nil, cp: "6", status: "BESTANDEN")
        ])

        XCTAssertEqual(stats.passedExamCount, 1)
    }

    private func exam(
        title: String,
        grade: String?,
        cp: String?,
        status: String?,
        number: String? = nil
    ) -> AlmaExamRecord {
        AlmaExamRecord(
            level: 1,
            kind: "Module",
            title: title,
            number: number,
            attempt: nil,
            grade: grade,
            cp: cp,
            status: status
        )
    }
}

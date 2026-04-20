import Foundation

struct GradeOverviewStats: Equatable {
    let actionable: [AlmaExamRecord]
    let graded: [AlmaExamRecord]
    let pending: [AlmaExamRecord]
    let passedExamCount: Int
    let trackedCredits: Double

    init(exams: [AlmaExamRecord]) {
        let actionable = exams.filter(Self.isActionable)
        self.actionable = actionable
        self.graded = actionable.filter(Self.isGraded)
        self.pending = actionable.filter { !Self.isGraded($0) }
        self.passedExamCount = actionable.filter(Self.isPassed).count
        self.trackedCredits = actionable
            .compactMap { Self.creditValue($0.cp) }
            .reduce(0, +)
    }

    static func isPassed(_ exam: AlmaExamRecord) -> Bool {
        let normalizedStatus = exam.status?.trimmedOrNil?.uppercased()
        let normalizedGrade = exam.grade?.trimmedOrNil

        if let normalizedStatus,
           ["BE", "PASSED", "BESTANDEN"].contains(normalizedStatus) {
            return true
        }

        guard let normalizedGrade, normalizedGrade != "-", normalizedGrade != "5,0" else {
            return false
        }
        return true
    }

    static func isGraded(_ exam: AlmaExamRecord) -> Bool {
        guard let grade = exam.grade?.trimmedOrNil else {
            return false
        }
        return grade != "-"
    }

    private static func isActionable(_ exam: AlmaExamRecord) -> Bool {
        [
            exam.number,
            exam.grade,
            exam.status,
            exam.cp,
            exam.attempt
        ].contains { $0?.trimmedOrNil != nil }
    }

    private static func creditValue(_ value: String?) -> Double? {
        guard let value = value?.trimmedOrNil else {
            return nil
        }
        return Double(value.replacingOccurrences(of: ",", with: "."))
    }
}

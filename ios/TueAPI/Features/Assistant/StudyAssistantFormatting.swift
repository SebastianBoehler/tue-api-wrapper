import Foundation

func studyAssistantFormattedLocation(_ location: String?) -> String {
    guard let location = location?.trimmingCharacters(in: .whitespacesAndNewlines),
          !location.isEmpty else {
        return ""
    }
    return " | \(location)"
}

func studyAssistantFormattedTaskRange(start: String?, end: String?) -> String {
    let values = [start, end]
        .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
        .filter { !$0.isEmpty }
    guard !values.isEmpty else {
        return ""
    }
    return " | \(values.joined(separator: " -> "))"
}

func studyAssistantFormattedDeadlineCourse(_ courseName: String?) -> String {
    guard let courseName = courseName?.trimmingCharacters(in: .whitespacesAndNewlines),
          !courseName.isEmpty else {
        return ""
    }
    return " | \(courseName)"
}

func studyAssistantFormattedDeadlineTime(_ deadline: MoodleDeadline) -> String {
    if let formattedTime = deadline.formattedTime?.trimmingCharacters(in: .whitespacesAndNewlines),
       !formattedTime.isEmpty {
        return " | \(formattedTime)"
    }
    if let dueAt = deadline.dueAt?.trimmingCharacters(in: .whitespacesAndNewlines),
       !dueAt.isEmpty {
        return " | \(dueAt)"
    }
    return ""
}

func studyAssistantFormattedExamMeta(_ exam: AlmaExamRecord) -> String {
    var parts: [String] = []
    if let number = exam.number?.trimmingCharacters(in: .whitespacesAndNewlines), !number.isEmpty {
        parts.append(number)
    }
    if let grade = exam.grade?.trimmingCharacters(in: .whitespacesAndNewlines), !grade.isEmpty {
        parts.append("grade \(grade)")
    }
    if let cp = exam.cp?.trimmingCharacters(in: .whitespacesAndNewlines), !cp.isEmpty {
        parts.append("\(cp) CP")
    }
    if let status = exam.status?.trimmingCharacters(in: .whitespacesAndNewlines), !status.isEmpty {
        parts.append("status \(status)")
    }
    guard !parts.isEmpty else {
        return ""
    }
    return " | \(parts.joined(separator: " | "))"
}

func studyAssistantFormattedMoodleGrade(_ grade: MoodleGradeItem) -> String {
    var parts: [String] = []
    if let value = grade.grade?.trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty {
        parts.append("grade \(value)")
    }
    if let percentage = grade.percentage?.trimmingCharacters(in: .whitespacesAndNewlines), !percentage.isEmpty {
        parts.append(percentage)
    }
    guard !parts.isEmpty else {
        return ""
    }
    return " | \(parts.joined(separator: " | "))"
}

func studyAssistantFormattedCredits(_ value: Double) -> String {
    value.rounded() == value ? String(Int(value)) : String(format: "%.1f", value)
}

func studyAssistantFormattedTotalResults(_ total: Int?) -> String {
    guard let total else {
        return ""
    }
    return " of \(total)"
}

func studyAssistantFormattedCourseMeta(_ result: ModuleSearchResult) -> String {
    var parts: [String] = []
    if let number = result.number?.trimmingCharacters(in: .whitespacesAndNewlines), !number.isEmpty {
        parts.append(number)
    }
    if let type = result.elementType?.trimmingCharacters(in: .whitespacesAndNewlines), !type.isEmpty {
        parts.append(type)
    }
    guard !parts.isEmpty else {
        return ""
    }
    return " | \(parts.joined(separator: " | "))"
}

func studyAssistantFormattedTalkMeta(_ talk: Talk) -> String {
    var parts: [String] = []
    if let startDate = talk.startDate {
        parts.append(TalksDateParser.formattedDate(startDate))
    }
    if let speakerName = talk.speakerName?.trimmingCharacters(in: .whitespacesAndNewlines), !speakerName.isEmpty {
        parts.append(speakerName)
    }
    if let location = talk.location?.trimmingCharacters(in: .whitespacesAndNewlines), !location.isEmpty {
        parts.append(location)
    }
    guard !parts.isEmpty else {
        return ""
    }
    return " | \(parts.joined(separator: " | "))"
}

func studyAssistantIsExplicitlyGraded(_ exam: AlmaExamRecord) -> Bool {
    guard let grade = exam.grade?.trimmingCharacters(in: .whitespacesAndNewlines),
          !grade.isEmpty,
          grade != "-" else {
        return false
    }
    return true
}

func studyAssistantIsPassed(_ exam: AlmaExamRecord) -> Bool {
    let normalizedStatus = exam.status?.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
    if ["BE", "PASSED", "BESTANDEN"].contains(normalizedStatus) {
        return true
    }

    guard let grade = exam.grade?.trimmingCharacters(in: .whitespacesAndNewlines),
          !grade.isEmpty,
          grade != "-",
          grade != "5,0" else {
        return false
    }
    return true
}

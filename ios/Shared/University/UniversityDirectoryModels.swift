import Foundation

struct UniversityDirectorySearchResponse {
    var query: String
    var title: String
    var outcome: UniversityDirectoryOutcome
}

enum UniversityDirectoryOutcome {
    case people(UniversityDirectoryPeoplePage)
    case person(UniversityDirectoryPerson)
    case organizations(UniversityDirectoryOrganizationResultsPage)
    case organization(UniversityDirectoryOrganization)
    case empty(message: String)
    case tooManyResults(message: String)
}

struct UniversityDirectorySearchForm {
    var form: UniversityHTMLForm
    var queryFieldName: String
    var searchButtonName: String
    var searchButtonValue: String

    func request(for query: String) -> UniversityHTMLForm {
        form
            .setting(query, for: queryFieldName)
            .setting(searchButtonValue, for: searchButtonName)
    }
}

enum UniversityDirectoryPageAction: Hashable {
    case eventTarget(String)
    case submit(name: String, value: String)

    var id: String {
        switch self {
        case .eventTarget(let target):
            "event:\(target)"
        case .submit(let name, let value):
            "submit:\(name):\(value)"
        }
    }
}

struct UniversityDirectoryPeoplePage {
    var title: String
    var form: UniversityHTMLForm
    var sections: [UniversityDirectoryPersonSection]
}

struct UniversityDirectoryPersonSection: Identifiable {
    var title: String
    var items: [UniversityDirectoryPersonSummary]

    var id: String { title }
}

struct UniversityDirectoryPersonSummary: Identifiable, Hashable {
    var name: String
    var subtitle: String?
    var action: UniversityDirectoryPageAction

    var id: String { action.id }
}

struct UniversityDirectoryOrganizationResultsPage {
    var title: String
    var form: UniversityHTMLForm
    var items: [UniversityDirectoryOrganizationSummary]
}

struct UniversityDirectoryOrganizationSummary: Identifiable, Hashable {
    var name: String
    var action: UniversityDirectoryPageAction

    var id: String { action.id }
}

struct UniversityDirectoryPerson {
    var name: String
    var summary: String?
    var attributes: [UniversityDirectoryField]
    var contactSections: [UniversityDirectoryContactSection]
}

struct UniversityDirectoryOrganization {
    var name: String
    var form: UniversityHTMLForm
    var fields: [UniversityDirectoryField]
    var personListAction: UniversityDirectoryPageAction?
}

struct UniversityDirectoryContactSection: Identifiable {
    var title: String
    var fields: [UniversityDirectoryField]

    var id: String { title }
}

struct UniversityDirectoryField: Identifiable, Hashable {
    var label: String
    var value: String

    var id: String { "\(label):\(value)" }

    var linkURL: URL? {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        switch label.lowercased() {
        case "e-mail":
            guard trimmed.contains("@") else { return nil }
            return URL(string: "mailto:\(trimmed)")
        case "web":
            return URL(string: trimmed)
        default:
            return nil
        }
    }
}

extension UniversityHTMLForm {
    func setting(_ value: String, for name: String) -> UniversityHTMLForm {
        var didReplace = false
        let nextPayload = payload.map { fieldName, fieldValue in
            guard fieldName == name else {
                return (fieldName, fieldValue)
            }
            didReplace = true
            return (fieldName, value)
        }

        if didReplace {
            return UniversityHTMLForm(actionURL: actionURL, payload: nextPayload)
        }

        return UniversityHTMLForm(actionURL: actionURL, payload: nextPayload + [(name, value)])
    }

    func applying(_ action: UniversityDirectoryPageAction) -> UniversityHTMLForm {
        switch action {
        case .eventTarget(let target):
            return setting(target, for: "__EVENTTARGET")
                .setting("", for: "__EVENTARGUMENT")
        case .submit(let name, let value):
            return setting(value, for: name)
        }
    }
}

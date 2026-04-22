import Foundation

struct StudyAssistantMessage: Identifiable, Equatable {
    enum Role: Equatable {
        case assistant
        case user
    }

    let id: UUID
    let role: Role
    var text: String
    var toolNames: [String]
    var isPending: Bool

    init(
        id: UUID = UUID(),
        role: Role,
        text: String,
        toolNames: [String] = [],
        isPending: Bool = false
    ) {
        self.id = id
        self.role = role
        self.text = text
        self.toolNames = toolNames
        self.isPending = isPending
    }
}

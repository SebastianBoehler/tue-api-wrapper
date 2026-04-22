import Foundation

struct AlmaCourseRegistrationOption: Equatable {
    var planelementID: String
    var label: String
    var actionName: String
}

struct AlmaCourseRegistrationSupport: Equatable {
    var detailURL: URL
    var supported: Bool
    var action: String?
    var status: String?
    var messages: [String]
    var message: String?
}

struct AlmaCourseRegistrationOptions: Equatable {
    var detailURL: URL
    var action: String
    var options: [AlmaCourseRegistrationOption]
    var messages: [String]
}

struct AlmaCourseRegistrationResult: Equatable {
    var detailURL: URL
    var finalURL: URL
    var action: String
    var selectedOption: AlmaCourseRegistrationOption
    var messages: [String]
    var status: String?
}


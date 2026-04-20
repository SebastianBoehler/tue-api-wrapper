import Foundation

enum CourseViewMode: String, CaseIterable, Identifiable {
    case day
    case catalog

    var id: Self { self }

    var title: String {
        switch self {
        case .day:
            "Day"
        case .catalog:
            "Catalog"
        }
    }
}

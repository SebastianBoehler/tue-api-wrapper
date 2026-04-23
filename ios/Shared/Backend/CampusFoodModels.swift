import Foundation

struct CampusFoodPlanCanteen: Decodable, Identifiable {
    var canteenID: String
    var canteen: String
    var pageURL: String?
    var address: String?
    var mapURL: String?
    var menus: [CampusFoodMenu]

    var id: String { canteenID }

    enum CodingKeys: String, CodingKey {
        case canteenID = "canteen_id"
        case canteen
        case pageURL = "page_url"
        case address
        case mapURL = "map_url"
        case menus
    }
}

struct CampusFoodMenu: Decodable, Identifiable {
    var id: String
    var menuLine: String?
    var menuDate: String?
    var items: [String]
    var meats: [String]
    var studentPrice: String?
    var guestPrice: String?
    var pupilPrice: String?
    var icons: [String]
    var filtersInclude: [String]
    var allergens: [String]
    var additives: [String]
    var co2: String?
    var photo: CampusFoodMenuPhoto?

    enum CodingKeys: String, CodingKey {
        case id
        case menuLine = "menu_line"
        case menuDate = "menu_date"
        case items
        case meats
        case studentPrice = "student_price"
        case guestPrice = "guest_price"
        case pupilPrice = "pupil_price"
        case icons
        case filtersInclude = "filters_include"
        case allergens
        case additives
        case co2
        case photo
    }
}

struct CampusFoodMenuPhoto: Decodable {
    var thumbnail: String?
    var medium: String?
    var large: String?
    var full: String?
}

enum CampusFoodLoadPhase: Equatable {
    case idle
    case loading
    case loaded(Date, Int)
    case unavailable
    case failed(String)

    var isLoading: Bool {
        if case .loading = self {
            true
        } else {
            false
        }
    }
}

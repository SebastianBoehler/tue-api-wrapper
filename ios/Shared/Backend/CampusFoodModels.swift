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

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        canteenID = try container.decode(String.self, forKey: .canteenID)
        canteen = try container.decode(String.self, forKey: .canteen)
        pageURL = try container.decodeIfPresent(String.self, forKey: .pageURL)
        address = try container.decodeIfPresent(String.self, forKey: .address)
        mapURL = try container.decodeIfPresent(String.self, forKey: .mapURL)
        menus = try container.decodeIfPresent([CampusFoodMenu].self, forKey: .menus) ?? []
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

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        menuLine = try container.decodeIfPresent(String.self, forKey: .menuLine)
        menuDate = try container.decodeIfPresent(String.self, forKey: .menuDate)
        items = try container.decodeIfPresent([String].self, forKey: .items) ?? []
        meats = try container.decodeIfPresent([String].self, forKey: .meats) ?? []
        studentPrice = try container.decodeIfPresent(String.self, forKey: .studentPrice)
        guestPrice = try container.decodeIfPresent(String.self, forKey: .guestPrice)
        pupilPrice = try container.decodeIfPresent(String.self, forKey: .pupilPrice)
        icons = try container.decodeIfPresent([String].self, forKey: .icons) ?? []
        filtersInclude = try container.decodeIfPresent([String].self, forKey: .filtersInclude) ?? []
        allergens = try container.decodeIfPresent([String].self, forKey: .allergens) ?? []
        additives = try container.decodeIfPresent([String].self, forKey: .additives) ?? []
        co2 = try container.decodeIfPresent(String.self, forKey: .co2)
        photo = try container.decodeIfPresent(CampusFoodMenuPhoto.self, forKey: .photo)
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

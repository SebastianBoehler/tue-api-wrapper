import Foundation

extension BackendClient {
    func fetchCampusFoodPlan(on date: Date) async throws -> [CampusFoodPlanCanteen] {
        let targetDate = CampusFoodDateEncoding.string(from: date)
        let url = try makeURL(
            path: "api/campus/canteens",
            queryItems: [URLQueryItem(name: "date", value: targetDate)]
        )
        let data = try await get(url)
        return try JSONDecoder()
            .decode([CampusFoodPlanCanteen].self, from: data)
            .map { canteen in
                var canteen = canteen
                canteen.menus = canteen.menus.filter { $0.menuDate == targetDate }
                return canteen
            }
    }
}

private enum CampusFoodDateEncoding {
    static let formatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "Europe/Berlin")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    static func string(from date: Date) -> String {
        formatter.string(from: date)
    }
}

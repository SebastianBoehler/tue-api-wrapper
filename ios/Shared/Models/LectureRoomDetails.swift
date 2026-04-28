import Foundation

struct LectureRoomDetails: Codable, Hashable {
    var roomDefault: String?
    var roomShort: String?
    var roomLong: String?
    var floorDefault: String?
    var floorShort: String?
    var floorLong: String?
    var buildingDefault: String?
    var buildingShort: String?
    var buildingLong: String?
    var campusDefault: String?
    var campusShort: String?
    var campusLong: String?
    var detailURL: URL?
    var displayText: String?
}

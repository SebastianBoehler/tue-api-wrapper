import Foundation

struct KufTrainingOccupancy: Decodable, Hashable {
    var facilityId: String
    var facilityName: String
    var count: Int
    var sourceURL: URL
    var imageURL: URL
    var retrievedAt: String
    var refreshAfterSeconds: Int

    enum CodingKeys: String, CodingKey {
        case count
        case facilityId = "facility_id"
        case facilityName = "facility_name"
        case sourceURL = "source_url"
        case imageURL = "image_url"
        case retrievedAt = "retrieved_at"
        case refreshAfterSeconds = "refresh_after_seconds"
    }
}

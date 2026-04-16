import Foundation

extension Data {
    subscript(safe index: Data.Index) -> UInt8? {
        indices.contains(index) ? self[index] : nil
    }
}

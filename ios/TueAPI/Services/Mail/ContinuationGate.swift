import Foundation

final class ContinuationGate {
    private let lock = NSLock()
    private var didResume = false

    func resume(_ action: () -> Void) {
        let shouldResume: Bool
        lock.lock()
        if didResume {
            shouldResume = false
        } else {
            didResume = true
            shouldResume = true
        }
        lock.unlock()

        if shouldResume {
            action()
        }
    }
}

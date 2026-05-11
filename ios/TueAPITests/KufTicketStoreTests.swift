import XCTest
@testable import TueAPI

final class KufTicketStoreTests: XCTestCase {
    func testSaveLoadAndDeleteTicket() throws {
        let (store, suiteName) = try makeStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }

        let ticket = KufTicket(
            barcodeValue: "70054028",
            symbology: "org.iso.Code128",
            displayName: "Test Student",
            scannedAt: Date(timeIntervalSince1970: 1_777_777_777)
        )

        try store.save(ticket)
        XCTAssertEqual(store.loadTicket(), ticket)

        store.deleteTicket()
        XCTAssertNil(store.loadTicket())
    }

    func testFormattedCodeGroupsBarcodePayload() {
        let ticket = KufTicket(
            barcodeValue: "70054028",
            symbology: "org.iso.Code128",
            displayName: nil,
            scannedAt: .now
        )

        XCTAssertEqual(ticket.formattedCode, "7005 4028")
    }

    func testFormattedCodeKeepsPunctuation() {
        let ticket = KufTicket(
            barcodeValue: "70054-028",
            symbology: "org.iso.Code128",
            displayName: nil,
            scannedAt: .now
        )

        XCTAssertEqual(ticket.formattedCode, "70054-028")
    }

    private func makeStore() throws -> (KufTicketStore, String) {
        let suiteName = "KufTicketStoreTests.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suiteName))
        return (KufTicketStore(defaults: defaults), suiteName)
    }
}

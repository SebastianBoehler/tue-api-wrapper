import Foundation
import Security

enum KeychainCredentialsError: LocalizedError {
    case encodingFailed
    case unexpectedStatus(OSStatus)

    var errorDescription: String? {
        switch self {
        case .encodingFailed:
            "Could not encode credentials for Keychain storage."
        case .unexpectedStatus(let status):
            "Keychain request failed with status \(status)."
        }
    }
}

struct KeychainCredentialsStore {
    private let service = "dev.sebastianboehler.tueapi.credentials"
    private let account = "university"

    func load() throws -> AlmaCredentials? {
        var query = baseQuery()
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound {
            return nil
        }
        guard status == errSecSuccess else {
            throw KeychainCredentialsError.unexpectedStatus(status)
        }
        guard let data = result as? Data else {
            return nil
        }
        return try JSONDecoder().decode(AlmaCredentials.self, from: data)
    }

    func save(_ credentials: AlmaCredentials) throws {
        guard let data = try? JSONEncoder().encode(credentials) else {
            throw KeychainCredentialsError.encodingFailed
        }

        let status = SecItemUpdate(baseQuery() as CFDictionary, [
            kSecValueData as String: data
        ] as CFDictionary)

        if status == errSecSuccess {
            return
        }
        if status != errSecItemNotFound {
            throw KeychainCredentialsError.unexpectedStatus(status)
        }

        var item = baseQuery()
        item[kSecValueData as String] = data
        let addStatus = SecItemAdd(item as CFDictionary, nil)
        guard addStatus == errSecSuccess else {
            throw KeychainCredentialsError.unexpectedStatus(addStatus)
        }
    }

    func delete() throws {
        let status = SecItemDelete(baseQuery() as CFDictionary)
        if status == errSecSuccess || status == errSecItemNotFound {
            return
        }
        throw KeychainCredentialsError.unexpectedStatus(status)
    }

    private func baseQuery() -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]
    }
}

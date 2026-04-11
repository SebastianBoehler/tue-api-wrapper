import SwiftUI

struct SettingsView: View {
    @Bindable var model: AppModel
    @State private var username = ""
    @State private var password = ""

    var body: some View {
        Form {
            Section("University login") {
                TextField("Username", text: $username)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                SecureField("Password", text: $password)
            }

            Section {
                Button("Save in Keychain") {
                    model.saveCredentials(username: username, password: password)
                    password = ""
                }
                .disabled(username.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || password.isEmpty)

                if model.hasCredentials {
                    Button("Delete credentials", role: .destructive) {
                        model.deleteCredentials()
                        password = ""
                    }
                }
            }

            Section {
                StatusBanner(
                    title: model.hasCredentials ? "Credentials stored" : "Nothing stored",
                    message: model.hasCredentials ? "The app can refresh Alma directly. Widgets only read cached lecture data." : "Credentials stay in this app's Keychain item.",
                    systemImage: model.hasCredentials ? "lock.shield" : "lock"
                )
            }

            Section {
                TextField("Base URL", text: $model.baseURLString)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .keyboardType(.URL)
            } header: {
                Text("Alma endpoint")
            } footer: {
                Text("Default: https://alma.uni-tuebingen.de. The app calls Alma directly and does not use the web dashboard or FastAPI backend.")
            }

            Section("Widget cache") {
                Text("Upcoming lectures are cached in the app group after each refresh.")
                Text(AppGroup.identifier)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Settings")
    }
}

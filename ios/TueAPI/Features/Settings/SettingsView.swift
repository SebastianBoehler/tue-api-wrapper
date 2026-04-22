import SwiftUI

struct SettingsView: View {
    @Bindable var model: AppModel
    @State private var username = ""
    @State private var password = ""

    var body: some View {
        Form {
            Section("University login") {
                UniversityCredentialsFields(
                    username: $username,
                    password: $password
                )
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
                    message: model.hasCredentials ? "The app can refresh Alma and read mail directly. Widgets only read cached lecture data." : "Credentials stay in this app's Keychain item.",
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
                Text("Default: https://alma.uni-tuebingen.de. Timetable refreshes still call Alma directly.")
            }

            Section("Widget cache") {
                Text("Upcoming lectures are cached in the app group after each refresh.")
                Text(AppGroup.identifier)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            Section {
                Toggle("Notify before lectures", isOn: reminderToggle)

                Picker("Reminder time", selection: reminderLeadTimeSelection) {
                    ForEach(AppModel.reminderLeadTimeOptions, id: \.self) { minutes in
                        Text("\(minutes) minutes before")
                            .tag(minutes)
                    }
                }
                .disabled(!model.remindersEnabled)

                if let message = model.reminderMessage {
                    Text(message)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            } header: {
                Text("Lecture reminders")
            } footer: {
                Text("The app schedules local notifications from cached Alma timetable entries. No backend, remote push token, or push notification server is used.")
            }
        }
        .navigationTitle("Settings")
    }

    private var reminderToggle: Binding<Bool> {
        Binding {
            model.remindersEnabled
        } set: { isEnabled in
            Task {
                if isEnabled {
                    await model.enableLectureReminders()
                } else {
                    await model.disableLectureReminders()
                }
            }
        }
    }

    private var reminderLeadTimeSelection: Binding<Int> {
        Binding {
            model.reminderLeadTimeMinutes
        } set: { minutes in
            Task {
                await model.setReminderLeadTime(minutes: minutes)
            }
        }
    }
}

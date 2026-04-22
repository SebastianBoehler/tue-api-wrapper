import SwiftUI

struct OnboardingView: View {
    @Bindable var model: AppModel
    @State private var username = ""
    @State private var password = ""

    private var canContinue: Bool {
        username.trimmedOrNil != nil && !password.isEmpty
    }

    private var statusMessage: String? {
        if case .failed(let message) = model.phase {
            return message
        }
        return nil
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                header

                AppSurfaceCard {
                    VStack(alignment: .leading, spacing: 16) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Connect your account")
                                .font(.title3.weight(.semibold))

                            Text("Use the credentials you already use for Alma. TueAPI stores them in the device Keychain.")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }

                        UniversityCredentialsFields(
                            username: $username,
                            password: $password
                        )

                        if let statusMessage {
                            StatusBanner(
                                title: "Could not save credentials",
                                message: statusMessage,
                                systemImage: "exclamationmark.triangle"
                            )
                        } else {
                            AppInlineStatusLine(
                                text: "You can update or remove credentials later in Settings.",
                                systemImage: "lock.shield",
                                tint: .accentColor
                            )
                        }

                        Button(action: saveCredentials) {
                            Text("Save and Continue")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 15)
                                .foregroundStyle(.white)
                                .background(Color.accentColor, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                        }
                        .buttonStyle(.plain)
                        .disabled(!canContinue)
                        .opacity(canContinue ? 1 : 0.55)
                    }
                }

                AppSurfaceCard {
                    Text("What this unlocks")
                        .font(.headline)

                    OnboardingCapabilityRow(
                        title: "Personal timetable",
                        subtitle: "Upcoming Alma lectures, rooms, and your current study term.",
                        systemImage: "calendar.badge.clock",
                        tint: .accentColor
                    )

                    OnboardingCapabilityRow(
                        title: "Study overview",
                        subtitle: "Tasks, deadlines, and grades from Moodle and ILIAS.",
                        systemImage: "checklist.checked",
                        tint: .orange
                    )

                    OnboardingCapabilityRow(
                        title: "University inbox",
                        subtitle: "Direct access to your Uni Tuebingen mailboxes inside the app.",
                        systemImage: "envelope.badge",
                        tint: .teal
                    )
                }
            }
            .padding(20)
            .padding(.top, 8)
            .padding(.bottom, 32)
        }
        .background(background.ignoresSafeArea())
        .scrollIndicators(.hidden)
        .toolbar(.hidden, for: .navigationBar)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(Color.accentColor.opacity(0.12))
                Image(systemName: "graduationcap.fill")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(Color.accentColor)
            }
            .frame(width: 52, height: 52)

            Text("Set up TueAPI")
                .font(.system(.largeTitle, design: .rounded, weight: .bold))

            Text("Add your university credentials before you start. The app only opens the main experience after your account is connected.")
                .font(.body)
                .foregroundStyle(.secondary)

            Text("ALMA  MOODLE  ILIAS  MAIL")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(Color.accentColor)
                .tracking(1.2)
                .textCase(.uppercase)
        }
    }

    private var background: some View {
        LinearGradient(
            colors: [
                Color.accentColor.opacity(0.14),
                Color(uiColor: .systemGroupedBackground),
                Color(uiColor: .systemGroupedBackground)
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    private func saveCredentials() {
        model.saveCredentials(username: username, password: password)
        if model.hasCredentials {
            password = ""
        }
    }
}

private struct OnboardingCapabilityRow: View {
    let title: String
    let subtitle: String
    let systemImage: String
    let tint: Color

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(tint.opacity(0.12))
                Image(systemName: systemImage)
                    .font(.headline)
                    .foregroundStyle(tint)
            }
            .frame(width: 44, height: 44)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)

                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 0)
        }
    }
}

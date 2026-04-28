import SwiftUI

struct TodayIdentityHeader: View {
    let profileName: String?
    let termLabel: String?
    let hasCredentials: Bool
    let unreadMailText: String?

    private var displayName: String {
        profileName ?? "Today"
    }

    private var subtitle: String {
        if let termLabel, !termLabel.isEmpty {
            return termLabel
        }
        return hasCredentials
            ? "Your university overview"
            : "Connect your university account in Settings."
    }

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                if profileName != nil {
                    Text(greetingLine)
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.secondary)
                        .textCase(.uppercase)
                }

                Text(displayName)
                    .font(.system(.largeTitle, design: .rounded, weight: .bold))

                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                if let unreadMailText {
                    Label(unreadMailText, systemImage: "envelope.badge.fill")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(Color.accentColor)
                        .lineLimit(1)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.accentColor.opacity(0.1), in: Capsule())
                        .padding(.top, 4)
                }
            }

            Spacer(minLength: 0)

            if let initials = profileInitials {
                ZStack {
                    Circle()
                        .fill(Color.accentColor.opacity(0.12))
                    Text(initials)
                        .font(.headline.weight(.semibold))
                        .foregroundStyle(Color.accentColor)
                }
                .frame(width: 48, height: 48)
            }
        }
    }

    private var greetingLine: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12:
            return "Good morning"
        case 12..<18:
            return "Good afternoon"
        default:
            return "Good evening"
        }
    }

    private var profileInitials: String? {
        guard let profileName else { return nil }
        let initials = profileName
            .split(separator: " ")
            .prefix(2)
            .compactMap(\.first)
            .map(String.init)
            .joined()
        return initials.isEmpty ? nil : initials
    }
}

struct TodayNextLectureCard: View {
    let event: LectureEvent?
    let isLoading: Bool
    let hasCredentials: Bool

    var body: some View {
        Group {
            if let event {
                NavigationLink(value: event) {
                    lectureCard(for: event)
                }
                .buttonStyle(.plain)
            } else {
                emptyCard
            }
        }
    }

    private func lectureCard(for event: LectureEvent) -> some View {
        AppSurfaceCard {
            HStack(alignment: .top, spacing: 16) {
                Capsule()
                    .fill(Color.accentColor)
                    .frame(width: 6, height: 96)

                VStack(alignment: .leading, spacing: 12) {
                    HStack(alignment: .top, spacing: 12) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Next Lecture")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(Color.accentColor)
                                .textCase(.uppercase)
                            Text(event.title)
                                .font(.title3.weight(.semibold))
                                .foregroundStyle(.primary)
                                .multilineTextAlignment(.leading)
                        }

                        Spacer(minLength: 0)

                        if let relativeText = relativeStartText(for: event.startDate) {
                            Text(relativeText)
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(Color.accentColor)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 7)
                                .background(Color.accentColor.opacity(0.1), in: Capsule())
                        }
                    }

                    HStack(spacing: 16) {
                        Label(dayTimeText(for: event), systemImage: "clock")
                        if let location = event.location, !location.isEmpty {
                            Label(location, systemImage: "mappin.and.ellipse")
                                .lineLimit(1)
                        }
                    }
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                }
            }
        }
    }

    private var emptyCard: some View {
        AppSurfaceCard {
            Text("Next Lecture")
                .font(.caption.weight(.semibold))
                .foregroundStyle(Color.accentColor)
                .textCase(.uppercase)

            if isLoading {
                AppInlineStatusLine(
                    text: "Looking up your next class.",
                    tint: .accentColor,
                    isLoading: true
                )
            } else {
                ContentUnavailableView(
                    "No upcoming lecture",
                    systemImage: "calendar.badge.exclamationmark",
                    description: Text(
                        hasCredentials
                            ? "Refresh Alma to load your upcoming timetable."
                            : "Connect your university account in Settings, then refresh Alma."
                    )
                )
            }
        }
    }

    private func dayTimeText(for event: LectureEvent) -> String {
        if Calendar.current.isDateInToday(event.startDate) {
            return event.timeRangeText
        }
        return event.startDate.formatted(.dateTime.weekday(.wide).hour().minute())
    }

    private func relativeStartText(for date: Date) -> String? {
        guard date > Date() else { return nil }
        return RelativeDateTimeFormatter().localizedString(for: date, relativeTo: Date())
    }
}

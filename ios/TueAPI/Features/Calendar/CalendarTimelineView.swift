import SwiftUI

struct CalendarTimelineView: View {
    var day: Date
    var events: [LectureEvent]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            AppSurfaceCard {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(CalendarSchedule.dayTitle(day))
                            .font(.title3.weight(.semibold))
                        Text(daySummary)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    Spacer(minLength: 0)
                    if let firstEvent = events.first {
                        Text(firstEvent.startDate.formatted(.dateTime.hour().minute()))
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(Color.accentColor)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 7)
                            .background(Color.accentColor.opacity(0.08), in: Capsule())
                    }
                }
            }

            if events.isEmpty {
                AppSurfaceCard {
                    ContentUnavailableView(
                        "No lectures this day",
                        systemImage: "calendar",
                        description: Text("Pick another day from the calendar strip.")
                    )
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 32)
                }
            } else {
                VStack(spacing: 12) {
                    ForEach(Array(events.enumerated()), id: \.element.id) { index, event in
                        NavigationLink(value: event) {
                            CalendarAgendaCard(
                                event: event,
                                isFirst: index == 0,
                                isHappeningNow: isHappeningNow(event)
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private var daySummary: String {
        switch events.count {
        case 0:
            "No lectures scheduled"
        case 1:
            "1 lecture"
        default:
            "\(events.count) lectures"
        }
    }

    private func isHappeningNow(_ event: LectureEvent) -> Bool {
        let now = Date()
        let end = event.endDate ?? event.startDate.addingTimeInterval(50 * 60)
        return event.startDate <= now && now <= end
    }
}

private struct CalendarAgendaCard: View {
    let event: LectureEvent
    let isFirst: Bool
    let isHappeningNow: Bool

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            VStack(alignment: .leading, spacing: 6) {
                Text(event.compactTimeRangeText)
                    .font(.headline.weight(.semibold))
                if let relativeStartText {
                    Text(relativeStartText)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(event.calendarAccentColor)
                }
            }
            .frame(width: 88, alignment: .leading)

            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .top) {
                    Text(event.title)
                        .font(.headline)
                        .multilineTextAlignment(.leading)
                    Spacer(minLength: 8)
                    if isHappeningNow {
                        CalendarStatusBadge(text: "Now", tint: event.calendarAccentColor)
                    } else if isFirst {
                        CalendarStatusBadge(text: "Next", tint: event.calendarAccentColor)
                    }
                }

                HStack(spacing: 10) {
                    Label(event.timeRangeText, systemImage: "clock")
                    if let location = event.location?.trimmedOrNil {
                        Label(location, systemImage: "mappin.and.ellipse")
                    }
                }
                .font(.subheadline)
                .foregroundStyle(.secondary)

                if let detail = event.detailPreview {
                    Text(detail)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(event.calendarAccentColor.opacity(0.08), in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay(alignment: .leading) {
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(event.calendarAccentColor)
                .frame(width: 6)
                .padding(.vertical, 14)
                .padding(.leading, 10)
        }
    }

    private var relativeStartText: String? {
        if isHappeningNow {
            return nil
        }
        guard event.startDate > Date() else {
            return nil
        }
        return RelativeDateTimeFormatter().localizedString(for: event.startDate, relativeTo: Date())
    }
}

private struct CalendarStatusBadge: View {
    let text: String
    let tint: Color

    var body: some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .foregroundStyle(tint)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(tint.opacity(0.12), in: Capsule())
    }
}

private enum CalendarEventPalette {
    static let colors: [Color] = [
        .red,
        .orange,
        .blue,
        .teal,
        .green,
        .pink,
        .indigo,
        .brown
    ]

    static func color(for title: String) -> Color {
        let seed = title.unicodeScalars.reduce(0) { partial, scalar in
            partial + Int(scalar.value)
        }
        return colors[seed % colors.count]
    }
}

extension LectureEvent {
    var calendarAccentColor: Color {
        CalendarEventPalette.color(for: title)
    }

    var compactTimeRangeText: String {
        let formatter = DateFormatter()
        formatter.timeZone = CalendarSchedule.calendar.timeZone
        formatter.dateFormat = "HH:mm"

        guard let endDate else {
            return formatter.string(from: startDate)
        }
        return "\(formatter.string(from: startDate)) – \(formatter.string(from: endDate))"
    }

    var detailPreview: String? {
        guard let detail = detail?.trimmedOrNil else {
            return nil
        }
        let collapsed = detail.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
        return collapsed.isEmpty ? nil : collapsed
    }
}

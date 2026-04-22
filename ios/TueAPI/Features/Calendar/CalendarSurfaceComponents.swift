import SwiftUI

struct CalendarHeader: View {
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Calendar")
                .font(.system(.largeTitle, design: .rounded, weight: .bold))
            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
}

struct CalendarDayStrip: View {
    var days: [Date]
    var selectedDay: Date
    var eventsForDay: (Date) -> [LectureEvent]
    var selectDay: (Date) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(days, id: \.self) { day in
                    let dayEvents = eventsForDay(day)
                    Button {
                        selectDay(day)
                    } label: {
                        CalendarDayChip(
                            day: day,
                            isSelected: CalendarSchedule.isSameDay(day, selectedDay),
                            eventCount: dayEvents.count,
                            previewColors: Array(dayEvents.prefix(3).map(\.calendarAccentColor))
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 2)
        }
    }
}

struct CalendarDayChip: View {
    var day: Date
    var isSelected: Bool
    var eventCount: Int
    var previewColors: [Color]

    private var isToday: Bool {
        CalendarSchedule.calendar.isDateInToday(day)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(day.formatted(.dateTime.weekday(.narrow)))
                .font(.caption.weight(.semibold))
                .textCase(.uppercase)

            Text(day.formatted(.dateTime.day()))
                .font(.title3.weight(.bold))

            HStack(spacing: 4) {
                ForEach(Array(previewColors.enumerated()), id: \.offset) { _, color in
                    Circle()
                        .fill(isSelected ? Color.white.opacity(0.92) : color)
                        .frame(width: 6, height: 6)
                }

                if eventCount > previewColors.count {
                    Text("+\(eventCount - previewColors.count)")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(isSelected ? Color.white.opacity(0.92) : .secondary)
                }
            }

            Text(day.formatted(.dateTime.month(.abbreviated)))
                .font(.caption2)
                .foregroundStyle(textColor.opacity(0.72))
        }
        .frame(width: 64, alignment: .leading)
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(backgroundStyle, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(borderColor, lineWidth: isToday && !isSelected ? 1.5 : 1)
        }
        .foregroundStyle(textColor)
    }

    private var textColor: Color {
        if isSelected { return .white }
        return isToday ? .accentColor : .primary
    }

    private var backgroundStyle: Color {
        isSelected ? .accentColor : Color(uiColor: .secondarySystemBackground)
    }

    private var borderColor: Color {
        if isSelected { return .accentColor }
        if isToday { return .accentColor.opacity(0.45) }
        return Color.primary.opacity(0.06)
    }
}

struct CalendarStatusLine {
    var text: String
    var systemImage: String?
    var tint: Color
    var isLoading = false
}

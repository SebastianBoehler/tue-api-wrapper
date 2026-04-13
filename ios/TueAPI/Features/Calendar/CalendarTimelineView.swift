import SwiftUI

struct CalendarTimelineView: View {
    var day: Date
    var events: [LectureEvent]

    private var window: CalendarTimelineWindow {
        CalendarTimelineWindow(day: day, events: events)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(CalendarSchedule.dayTitle(day))
                        .font(.title2.weight(.semibold))
                    Text(daySummary)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer(minLength: 0)
            }

            if events.isEmpty {
                ContentUnavailableView(
                    "No lectures this day",
                    systemImage: "calendar",
                    description: Text("Pick another day from the calendar strip.")
                )
                .frame(maxWidth: .infinity)
                .padding(.vertical, 36)
            } else {
                GeometryReader { proxy in
                    HStack(alignment: .top, spacing: 12) {
                        TimelineHourLabels(window: window)
                            .frame(width: 48)

                        ZStack(alignment: .topLeading) {
                            TimelineHourGrid(window: window)

                            ForEach(events) { event in
                                NavigationLink(value: event) {
                                    TimelineEventBlock(event: event)
                                }
                                .buttonStyle(.plain)
                                .frame(height: blockHeight(for: event))
                                .offset(y: blockOffset(for: event))
                            }
                        }
                        .frame(width: max(0, proxy.size.width - 60), height: window.height)
                    }
                }
                .frame(height: window.height)
            }
        }
    }

    private var daySummary: String {
        switch events.count {
        case 1:
            "1 lecture"
        default:
            "\(events.count) lectures"
        }
    }

    private func blockOffset(for event: LectureEvent) -> CGFloat {
        let startMinute = max(window.startMinute, window.minuteOfDay(event.startDate))
        return CGFloat(startMinute - window.startMinute) / 60 * CalendarTimelineWindow.hourHeight
    }

    private func blockHeight(for event: LectureEvent) -> CGFloat {
        let startMinute = max(window.startMinute, window.minuteOfDay(event.startDate))
        let endDate = event.endDate ?? event.startDate.addingTimeInterval(50 * 60)
        let endMinute = min(window.endMinute, max(startMinute, window.minuteOfDay(endDate)))
        let durationHeight = CGFloat(endMinute - startMinute) / 60 * CalendarTimelineWindow.hourHeight
        return durationHeight > 0 ? durationHeight : 56
    }
}

private struct TimelineHourLabels: View {
    var window: CalendarTimelineWindow

    var body: some View {
        VStack(spacing: 0) {
            ForEach(window.hours, id: \.self) { hour in
                Text(String(format: "%02d:00", hour))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .topTrailing)
                    .frame(height: CalendarTimelineWindow.hourHeight, alignment: .top)
            }
        }
    }
}

private struct TimelineHourGrid: View {
    var window: CalendarTimelineWindow

    var body: some View {
        VStack(spacing: 0) {
            ForEach(window.hours, id: \.self) { _ in
                VStack(spacing: 0) {
                    Divider()
                    Spacer(minLength: 0)
                }
                .frame(height: CalendarTimelineWindow.hourHeight)
            }
        }
        .background(Color.secondary.opacity(0.06), in: RoundedRectangle(cornerRadius: 8))
    }
}

private struct TimelineEventBlock: View {
    var event: LectureEvent

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(event.title)
                .font(.subheadline.weight(.semibold))
                .lineLimit(2)

            Text(event.calendarTimeRangeText)
                .font(.caption)
                .foregroundStyle(.secondary)

            if let location = event.location, !location.isEmpty {
                Label(location, systemImage: "mappin.and.ellipse")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.accentColor.opacity(0.14), in: RoundedRectangle(cornerRadius: 8))
        .overlay {
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color.accentColor.opacity(0.35))
        }
        .padding(.trailing, 2)
    }
}

struct CalendarTimelineWindow {
    static let hourHeight: CGFloat = 72

    var day: Date
    var startHour: Int
    var endHour: Int

    var startMinute: Int {
        startHour * 60
    }

    var endMinute: Int {
        endHour * 60
    }

    var height: CGFloat {
        CGFloat(endHour - startHour) * Self.hourHeight
    }

    var hours: [Int] {
        Array(startHour..<endHour)
    }

    init(day: Date, events: [LectureEvent]) {
        self.day = day
        let starts = events.map { Self.minuteOfDay($0.startDate, day: day) }
        let ends = events.map { event in
            Self.minuteOfDay(event.endDate ?? event.startDate.addingTimeInterval(50 * 60), day: day)
        }
        let firstHour = (starts.min() ?? 8 * 60) / 60
        let lastHour = Int(ceil(Double(ends.max() ?? 18 * 60) / 60))
        self.startHour = max(6, firstHour - 1)
        self.endHour = min(24, max(lastHour, self.startHour + 2))
    }

    func minuteOfDay(_ date: Date) -> Int {
        Self.minuteOfDay(date, day: day)
    }

    private static func minuteOfDay(_ date: Date, day: Date) -> Int {
        let dayStart = CalendarSchedule.calendar.startOfDay(for: day)
        let minutes = CalendarSchedule.calendar.dateComponents([.minute], from: dayStart, to: date).minute ?? 0
        return min(max(minutes, 0), 24 * 60)
    }
}

private extension LectureEvent {
    var calendarTimeRangeText: String {
        let formatter = DateFormatter()
        formatter.timeZone = CalendarSchedule.calendar.timeZone
        formatter.dateFormat = "HH:mm"

        guard let endDate else {
            return formatter.string(from: startDate)
        }

        return "\(formatter.string(from: startDate)) - \(formatter.string(from: endDate))"
    }
}

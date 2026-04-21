import SwiftUI

struct CalendarScheduleView: View {
    var model: AppModel
    @State private var selectedDay: Date?

    private var days: [Date] {
        CalendarSchedule.days(from: model.events)
    }

    private var visibleDay: Date? {
        guard let selectedDay else { return days.first }
        return days.first { CalendarSchedule.isSameDay($0, selectedDay) } ?? days.first
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                calendarError

                if days.isEmpty {
                    if model.phase == .loading {
                        loadingState
                    } else {
                        emptyState
                    }
                } else {
                    CalendarDayStrip(
                        days: days,
                        selectedDay: visibleDay ?? days[0],
                        selectDay: { selectedDay = $0 }
                    )

                    if let visibleDay {
                        CalendarTimelineView(
                            day: visibleDay,
                            events: CalendarSchedule.events(on: visibleDay, from: model.events)
                        )
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Calendar")
        .navigationDestination(for: LectureEvent.self) { event in
            CourseDetailView(event: event, model: model)
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    Task { await model.refreshUpcomingLectures() }
                } label: {
                    refreshButtonLabel
                }
                .disabled(model.phase == .loading)
            }
        }
        .refreshable {
            await model.refreshUpcomingLectures()
        }
        .onAppear(perform: syncSelectedDay)
        .onChange(of: model.events) { _, _ in
            syncSelectedDay()
        }
    }

    @ViewBuilder
    private var refreshButtonLabel: some View {
        if model.phase == .loading {
            ProgressView()
                .controlSize(.small)
                .accessibilityLabel("Refreshing Alma timetable")
        } else {
            Label("Refresh", systemImage: "arrow.clockwise")
        }
    }

    @ViewBuilder
    private var calendarError: some View {
        if case .failed(let message) = model.phase {
            StatusBanner(title: "Calendar refresh failed", message: message, systemImage: "exclamationmark.triangle")
        }
    }

    private var loadingState: some View {
        ProgressView("Refreshing Alma timetable")
            .frame(maxWidth: .infinity)
            .padding(.vertical, 48)
    }

    private var emptyState: some View {
        ContentUnavailableView(
            "No calendar entries",
            systemImage: "calendar.badge.exclamationmark",
            description: Text(emptyMessage)
        )
        .frame(maxWidth: .infinity)
        .padding(.vertical, 48)
    }

    private var emptyMessage: String {
        if model.hasCredentials {
            "Refresh Alma to load upcoming timetable entries into the calendar."
        } else {
            "Save university credentials in Settings, then refresh Alma."
        }
    }

    private func syncSelectedDay() {
        if let selectedDay, days.contains(where: { CalendarSchedule.isSameDay($0, selectedDay) }) {
            return
        }
        selectedDay = CalendarSchedule.defaultDay(from: days)
    }
}

private struct CalendarDayStrip: View {
    var days: [Date]
    var selectedDay: Date
    var selectDay: (Date) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(days, id: \.self) { day in
                    Button {
                        selectDay(day)
                    } label: {
                        CalendarDayChip(
                            day: day,
                            isSelected: CalendarSchedule.isSameDay(day, selectedDay)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 2)
        }
    }
}

private struct CalendarDayChip: View {
    var day: Date
    var isSelected: Bool

    private var isToday: Bool {
        CalendarSchedule.calendar.isDateInToday(day)
    }

    var body: some View {
        VStack(spacing: 4) {
            Text(day.formatted(.dateTime.weekday(.abbreviated)))
                .font(.caption)

            ZStack(alignment: .bottom) {
                Text(day.formatted(.dateTime.day()))
                    .font(.headline)
                    .padding(.bottom, isToday ? 6 : 0)

                if isToday {
                    Circle()
                        .fill(isSelected ? Color.white : Color.accentColor)
                        .frame(width: 5, height: 5)
                }
            }
            .frame(height: 28)

            Text(day.formatted(.dateTime.month(.abbreviated)))
                .font(.caption2)
        }
        .frame(width: 68, height: 74)
        .foregroundStyle(isSelected ? Color.white : (isToday ? Color.accentColor : Color.primary))
        .background(isSelected ? Color.accentColor : Color.secondary.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
        .overlay {
            RoundedRectangle(cornerRadius: 8)
                .stroke(
                    isSelected ? Color.accentColor : (isToday ? Color.accentColor.opacity(0.6) : Color.secondary.opacity(0.18)),
                    lineWidth: isToday && !isSelected ? 1.5 : 1
                )
        }
    }
}

enum CalendarSchedule {
    static let calendar: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.locale = Locale(identifier: "de_DE")
        calendar.timeZone = TimeZone(identifier: "Europe/Berlin") ?? .current
        return calendar
    }()

    static func days(from events: [LectureEvent]) -> [Date] {
        let starts = events.map { calendar.startOfDay(for: $0.startDate) }
        return Array(Set(starts)).sorted()
    }

    static func events(on day: Date, from events: [LectureEvent]) -> [LectureEvent] {
        events
            .filter { calendar.isDate($0.startDate, inSameDayAs: day) }
            .sorted { $0.startDate < $1.startDate }
    }

    static func defaultDay(from days: [Date]) -> Date? {
        let today = calendar.startOfDay(for: Date())
        return days.first { $0 >= today } ?? days.first
    }

    static func isSameDay(_ lhs: Date, _ rhs: Date) -> Bool {
        calendar.isDate(lhs, inSameDayAs: rhs)
    }

    static func dayTitle(_ day: Date) -> String {
        day.formatted(.dateTime.weekday(.wide).day().month(.wide))
    }
}

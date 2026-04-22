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

    private var topStatusLine: CalendarStatusLine? {
        if !model.hasCredentials {
            return CalendarStatusLine(
                text: "Save Alma credentials in Settings to load your timetable.",
                systemImage: "lock",
                tint: .secondary
            )
        }
        if model.phase == .loading && days.isEmpty {
            return CalendarStatusLine(
                text: "Refreshing your timetable.",
                tint: .accentColor,
                isLoading: true
            )
        }
        if case .failed(let message) = model.phase {
            return CalendarStatusLine(
                text: message,
                systemImage: "exclamationmark.triangle",
                tint: .orange
            )
        }
        return nil
    }

    private var footerTimestamp: String? {
        guard topStatusLine == nil, let refreshedAt = model.timetableRefreshedAt else {
            return nil
        }
        return "Last updated \(refreshedAt.formatted(date: .abbreviated, time: .shortened))"
    }

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 18) {
                CalendarHeader(subtitle: headerSubtitle)

                if let topStatusLine {
                    AppInlineStatusLine(
                        text: topStatusLine.text,
                        systemImage: topStatusLine.systemImage,
                        tint: topStatusLine.tint,
                        isLoading: topStatusLine.isLoading
                    )
                }

                if days.isEmpty {
                    emptyState
                } else {
                    CalendarDayStrip(
                        days: days,
                        selectedDay: visibleDay ?? days[0],
                        eventsForDay: { CalendarSchedule.events(on: $0, from: model.events) },
                        selectDay: { selectedDay = $0 }
                    )

                    if let visibleDay {
                        CalendarTimelineView(
                            day: visibleDay,
                            events: CalendarSchedule.events(on: visibleDay, from: model.events)
                        )
                    }
                }

                if let footerTimestamp {
                    Text(footerTimestamp)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 4)
                }
            }
            .padding(16)
            .padding(.bottom, 124)
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: LectureEvent.self) { event in
            CourseDetailView(event: event, model: model)
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    Task { await model.refreshUpcomingLectures() }
                } label: {
                    if model.phase == .loading {
                        ProgressView()
                            .controlSize(.small)
                            .accessibilityLabel("Refreshing Alma timetable")
                    } else {
                        Label("Refresh", systemImage: "arrow.clockwise")
                    }
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

    private var headerSubtitle: String {
        let details = [model.currentTermLabel, days.isEmpty ? nil : "\(days.count) calendar days"]
            .compactMap { $0 }
        if !details.isEmpty {
            return details.joined(separator: " · ")
        }
        return model.hasCredentials ? "Upcoming lectures" : "Save Alma credentials in Settings."
    }

    @ViewBuilder
    private var emptyState: some View {
        if model.phase == .loading {
            AppInlineStatusLine(
                text: "Refreshing your timetable.",
                tint: .accentColor,
                isLoading: true
            )
        } else {
            ContentUnavailableView(
                "No calendar entries",
                systemImage: "calendar.badge.exclamationmark",
                description: Text(emptyMessage)
            )
            .frame(maxWidth: .infinity)
            .padding(.vertical, 56)
        }
    }

    private var emptyMessage: String {
        if model.hasCredentials {
            "Refresh Alma to load upcoming timetable entries."
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

    static func contextualDays(from days: [Date]) -> [Date] {
        guard let firstDay = days.first, let lastDay = days.last else {
            return []
        }

        let span = calendar.dateComponents([.day], from: firstDay, to: lastDay).day ?? 0

        if span <= 21 {
            return stride(from: 0, through: span, by: 1).compactMap { offset in
                calendar.date(byAdding: .day, value: offset, to: firstDay)
            }
        }

        var previousDay = firstDay
        var contextualDays = [firstDay]

        for day in days.dropFirst() {
            let gap = calendar.dateComponents([.day], from: previousDay, to: day).day ?? 0

            if gap > 1 && gap <= 4 {
                for offset in 1..<gap {
                    if let fillerDay = calendar.date(byAdding: .day, value: offset, to: previousDay) {
                        contextualDays.append(fillerDay)
                    }
                }
            }

            contextualDays.append(day)
            previousDay = day
        }

        return contextualDays
    }

    static func isSameDay(_ lhs: Date, _ rhs: Date) -> Bool {
        calendar.isDate(lhs, inSameDayAs: rhs)
    }

    static func dayTitle(_ day: Date) -> String {
        day.formatted(.dateTime.weekday(.wide).day().month(.wide))
    }
}

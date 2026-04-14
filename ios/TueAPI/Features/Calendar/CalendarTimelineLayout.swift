import SwiftUI

struct TimelineEventLayout {
    private static let minimumBlockHeight: CGFloat = 56
    private static let minimumVisualMinutes = Int(ceil(Double(minimumBlockHeight / CalendarTimelineWindow.hourHeight * 60)))

    var events: [LectureEvent]
    var window: CalendarTimelineWindow

    var placements: [TimelineEventPlacement] {
        var output: [TimelineEventPlacement] = []
        var activeGroup: [TimelineEventRange] = []
        var activeGroupEnd = 0

        for range in ranges {
            if activeGroup.isEmpty || range.startMinute < activeGroupEnd {
                activeGroup.append(range)
                activeGroupEnd = max(activeGroupEnd, range.visualEndMinute)
            } else {
                output.append(contentsOf: placements(for: activeGroup))
                activeGroup = [range]
                activeGroupEnd = range.visualEndMinute
            }
        }

        output.append(contentsOf: placements(for: activeGroup))
        return output
    }

    private var ranges: [TimelineEventRange] {
        events.map(range(for:)).sorted {
            if $0.startMinute != $1.startMinute {
                return $0.startMinute < $1.startMinute
            }
            if $0.endMinute != $1.endMinute {
                return $0.endMinute < $1.endMinute
            }
            return $0.event.title < $1.event.title
        }
    }

    private func range(for event: LectureEvent) -> TimelineEventRange {
        let startMinute = max(window.startMinute, window.minuteOfDay(event.startDate))
        let endDate = event.endDate ?? event.startDate.addingTimeInterval(50 * 60)
        let endMinute = min(window.endMinute, max(startMinute + 1, window.minuteOfDay(endDate)))
        let visualEndMinute = min(window.endMinute, max(endMinute, startMinute + Self.minimumVisualMinutes))
        return TimelineEventRange(
            event: event,
            startMinute: startMinute,
            endMinute: endMinute,
            visualEndMinute: visualEndMinute
        )
    }

    private func placements(for group: [TimelineEventRange]) -> [TimelineEventPlacement] {
        guard !group.isEmpty else { return [] }

        var columnEndMinutes: [Int] = []
        var placements: [TimelineEventPlacement] = []

        for range in group {
            let column = columnEndMinutes.firstIndex { $0 <= range.startMinute } ?? columnEndMinutes.endIndex
            if column == columnEndMinutes.endIndex {
                columnEndMinutes.append(range.visualEndMinute)
            } else {
                columnEndMinutes[column] = range.visualEndMinute
            }

            placements.append(
                TimelineEventPlacement(
                    event: range.event,
                    column: column,
                    columnCount: 1,
                    y: offset(for: range),
                    height: height(for: range)
                )
            )
        }

        let columnCount = max(1, columnEndMinutes.count)
        return placements.map { placement in
            TimelineEventPlacement(
                event: placement.event,
                column: placement.column,
                columnCount: columnCount,
                y: placement.y,
                height: placement.height
            )
        }
    }

    private func offset(for range: TimelineEventRange) -> CGFloat {
        CGFloat(range.startMinute - window.startMinute) / 60 * CalendarTimelineWindow.hourHeight
    }

    private func height(for range: TimelineEventRange) -> CGFloat {
        let durationHeight = CGFloat(range.endMinute - range.startMinute) / 60 * CalendarTimelineWindow.hourHeight
        return max(durationHeight, Self.minimumBlockHeight)
    }
}

private struct TimelineEventRange {
    var event: LectureEvent
    var startMinute: Int
    var endMinute: Int
    var visualEndMinute: Int
}

struct TimelineEventPlacement: Identifiable {
    private static let columnSpacing: CGFloat = 6

    var event: LectureEvent
    var column: Int
    var columnCount: Int
    var y: CGFloat
    var height: CGFloat

    var id: LectureEvent.ID {
        event.id
    }

    func width(in totalWidth: CGFloat) -> CGFloat {
        let spacing = Self.columnSpacing * CGFloat(max(0, columnCount - 1))
        return max(0, (totalWidth - spacing) / CGFloat(max(1, columnCount)))
    }

    func x(in totalWidth: CGFloat) -> CGFloat {
        CGFloat(column) * (width(in: totalWidth) + Self.columnSpacing)
    }
}

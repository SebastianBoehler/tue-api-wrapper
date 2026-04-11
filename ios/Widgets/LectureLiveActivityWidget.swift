import ActivityKit
import WidgetKit
import SwiftUI

struct LectureLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: LectureActivityAttributes.self) { context in
            LectureLiveActivityView(state: context.state)
                .activitySystemActionForegroundColor(.primary)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.state.startDate, style: .time)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if let endDate = context.state.endDate {
                        Text(endDate, style: .time)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.state.title)
                        .lineLimit(2)
                }
            } compactLeading: {
                Image(systemName: "calendar")
            } compactTrailing: {
                Text(context.state.startDate, style: .time)
            } minimal: {
                Image(systemName: "calendar")
            }
        }
    }
}

struct LectureLiveActivityView: View {
    let state: LectureActivityAttributes.ContentState

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(state.title)
                .font(.headline)
                .lineLimit(2)
            Text(timeText)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            if let location = state.location, !location.isEmpty {
                Label(location, systemImage: "mappin.and.ellipse")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
    }

    private var timeText: String {
        let start = state.startDate.formatted(date: .abbreviated, time: .shortened)
        guard let endDate = state.endDate else {
            return start
        }
        return "\(start) - \(endDate.formatted(date: .omitted, time: .shortened))"
    }
}

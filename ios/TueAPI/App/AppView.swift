import SwiftUI

struct AppView: View {
    var model: AppModel

    var body: some View {
        TabView {
            NavigationStack {
                TodayView(model: model)
                    .settingsToolbar(model: model)
            }
            .tabItem {
                Label("Today", systemImage: "sun.max")
            }

            NavigationStack {
                CalendarScheduleView(model: model)
                    .settingsToolbar(model: model)
            }
            .tabItem {
                Label("Schedule", systemImage: "calendar.day.timeline.left")
            }

            NavigationStack {
                StudyView(model: model)
                    .settingsToolbar(model: model)
            }
            .tabItem {
                Label("Study", systemImage: "graduationcap")
            }

            NavigationStack {
                MailView(model: model)
                    .settingsToolbar(model: model)
            }
            .tabItem {
                Label("Inbox", systemImage: "envelope")
            }

            NavigationStack {
                DiscoverView(model: model)
                    .settingsToolbar(model: model)
            }
            .tabItem {
                Label("Discover", systemImage: "sparkle.magnifyingglass")
            }
        }
        .task {
            await model.refreshReminderStatus()
        }
    }
}

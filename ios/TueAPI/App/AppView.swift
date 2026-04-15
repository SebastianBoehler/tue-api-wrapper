import SwiftUI

struct AppView: View {
    var model: AppModel

    var body: some View {
        TabView {
            NavigationStack {
                UpcomingLecturesView(model: model)
            }
            .tabItem {
                Label("Upcoming", systemImage: "calendar")
            }

            NavigationStack {
                CalendarScheduleView(model: model)
            }
            .tabItem {
                Label("Calendar", systemImage: "calendar.day.timeline.left")
            }

            NavigationStack {
                BrowseLecturesView(model: model)
            }
            .tabItem {
                Label("Browse", systemImage: "list.bullet.rectangle")
            }

            NavigationStack {
                ModuleSearchView(model: model)
            }
            .tabItem {
                Label("Modules", systemImage: "books.vertical")
            }

            NavigationStack {
                MailView(model: model)
            }
            .tabItem {
                Label("Mail", systemImage: "envelope")
            }

            NavigationStack {
                CampusMapView()
            }
            .tabItem {
                Label("Campus", systemImage: "map")
            }

            NavigationStack {
                TalksView()
            }
            .tabItem {
                Label("Talks", systemImage: "mic")
            }

            NavigationStack {
                SettingsView(model: model)
            }
            .tabItem {
                Label("Settings", systemImage: "gear")
            }
        }
        .task {
            await model.refreshReminderStatus()
        }
    }
}

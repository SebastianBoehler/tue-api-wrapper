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
                CoursesView(model: model)
            }
            .tabItem {
                Label("Courses", systemImage: "books.vertical")
            }

            NavigationStack {
                MailView(model: model)
            }
            .tabItem {
                Label("Mail", systemImage: "envelope")
            }

            NavigationStack {
                GradeOverviewView(model: model)
            }
            .tabItem {
                Label("Grades", systemImage: "graduationcap")
            }

            NavigationStack {
                CareerView(model: model)
            }
            .tabItem {
                Label("Career", systemImage: "briefcase")
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

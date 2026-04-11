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
                BrowseLecturesView(model: model)
            }
            .tabItem {
                Label("Browse", systemImage: "list.bullet.rectangle")
            }

            NavigationStack {
                SettingsView(model: model)
            }
            .tabItem {
                Label("Settings", systemImage: "gear")
            }
        }
    }
}

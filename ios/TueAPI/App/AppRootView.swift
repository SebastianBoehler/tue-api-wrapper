import SwiftUI

struct AppRootView: View {
    var model: AppModel

    var body: some View {
        Group {
            if model.hasCredentials {
                AppView(model: model)
            } else {
                NavigationStack {
                    OnboardingView(model: model)
                }
            }
        }
        .animation(.snappy(duration: 0.28), value: model.hasCredentials)
    }
}

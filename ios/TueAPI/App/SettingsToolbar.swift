import SwiftUI

private struct SettingsToolbarModifier: ViewModifier {
    var model: AppModel

    func body(content: Content) -> some View {
        content
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink {
                        SettingsView(model: model)
                    } label: {
                        Label("Settings", systemImage: "gearshape")
                    }
                }
            }
    }
}

extension View {
    func settingsToolbar(model: AppModel) -> some View {
        modifier(SettingsToolbarModifier(model: model))
    }
}

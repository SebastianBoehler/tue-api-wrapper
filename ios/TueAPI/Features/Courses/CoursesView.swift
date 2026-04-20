import SwiftUI

struct CoursesView: View {
    var model: AppModel

    @State private var selectedMode: CourseViewMode = .day

    var body: some View {
        VStack(spacing: 0) {
            CourseModePicker(selectedMode: $selectedMode)
                .padding(.horizontal)
                .padding(.vertical, 10)

            Divider()

            Group {
                switch selectedMode {
                case .day:
                    BrowseLecturesView(model: model, navigationTitle: "Courses")
                case .catalog:
                    ModuleSearchView(model: model, navigationTitle: "Courses")
                }
            }
        }
        .navigationTitle("Courses")
    }
}

private struct CourseModePicker: View {
    @Binding var selectedMode: CourseViewMode

    var body: some View {
        Picker("Course view", selection: $selectedMode) {
            ForEach(CourseViewMode.allCases) { mode in
                Text(mode.title).tag(mode)
            }
        }
        .pickerStyle(.segmented)
    }
}

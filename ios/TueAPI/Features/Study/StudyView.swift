import SwiftUI

struct StudyView: View {
    var model: AppModel

    @State private var selectedScope: StudyScope = .tasks

    var body: some View {
        VStack(spacing: 0) {
            VStack(spacing: 0) {
                Picker("Study area", selection: $selectedScope) {
                    ForEach(StudyScope.allCases) { scope in
                        Text(scope.title).tag(scope)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 16)
                .padding(.top, 12)
                .padding(.bottom, 10)
            }
            .background(Color(uiColor: .systemGroupedBackground))

            switch selectedScope {
            case .tasks:
                StudyTasksView(model: model)
            case .grades:
                GradeOverviewView(model: model)
            case .courses:
                CoursesView(model: model)
            }
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle(selectedScope.title)
        .navigationBarTitleDisplayMode(.inline)
    }
}

private enum StudyScope: String, CaseIterable, Identifiable {
    case tasks
    case grades
    case courses

    var id: Self { self }

    var title: String {
        switch self {
        case .tasks:
            "Tasks"
        case .grades:
            "Grades"
        case .courses:
            "Courses"
        }
    }
}

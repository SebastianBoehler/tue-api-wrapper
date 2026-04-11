import Foundation
import Observation
import WidgetKit

@MainActor
@Observable
final class AppModel {
    var events: [LectureEvent]
    var browseLectures: [AlmaCurrentLecture] = []
    var browseSelectedDate: String?
    var phase: LoadPhase = .idle
    var browsePhase: BrowsePhase = .idle
    var hasCredentials = false
    var liveActivityMessage: String?
    var baseURLString: String {
        didSet {
            UserDefaults.standard.set(baseURLString, forKey: Self.baseURLKey)
        }
    }

    private let keychain = KeychainCredentialsStore()
    private static let baseURLKey = "almaBaseURL"

    init() {
        self.baseURLString = UserDefaults.standard.string(forKey: Self.baseURLKey) ?? "https://alma.uni-tuebingen.de"
        self.events = Self.upcomingOnly(UpcomingLectureCache.load()?.events ?? [])
        self.hasCredentials = ((try? keychain.load()) ?? nil) != nil
    }

    func saveCredentials(username: String, password: String) {
        let trimmedUsername = username.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedUsername.isEmpty, !password.isEmpty else {
            phase = .failed("Enter both username and password.")
            return
        }

        do {
            try keychain.save(AlmaCredentials(username: trimmedUsername, password: password))
            hasCredentials = true
            phase = .idle
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    func browseCurrentLectures(on date: Date) async {
        browsePhase = .loading

        do {
            guard let baseURL = URL(string: baseURLString), baseURL.scheme?.hasPrefix("http") == true else {
                throw AlmaClientError.invalidURL
            }

            let dateString = Self.almaDateString(from: date)
            let page = try await AlmaClient(baseURL: baseURL).fetchCurrentLectures(date: dateString, limit: 200)
            browseLectures = page.results
            browseSelectedDate = page.selectedDate ?? dateString
            browsePhase = .loaded(browseSelectedDate, page.results.count)
        } catch {
            browsePhase = .failed(error.localizedDescription)
        }
    }

    func deleteCredentials() {
        do {
            try keychain.delete()
            hasCredentials = false
            phase = .idle
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    func refreshUpcomingLectures() async {
        phase = .loading

        do {
            guard let baseURL = URL(string: baseURLString), baseURL.scheme?.hasPrefix("http") == true else {
                throw AlmaClientError.invalidURL
            }
            guard let credentials = try keychain.load() else {
                throw AlmaClientError.loginFailed("Save university credentials before refreshing Alma.")
            }

            let snapshot = try await AlmaClient(baseURL: baseURL).fetchUpcomingLectures(credentials: credentials)
            try UpcomingLectureCache.save(snapshot)
            events = Self.upcomingOnly(snapshot.events)
            phase = .loaded(snapshot.refreshedAt, snapshot.sourceTerm)
            WidgetCenter.shared.reloadAllTimelines()
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    func startLiveActivity(for event: LectureEvent) {
        do {
            try LiveActivityController.start(for: event)
            liveActivityMessage = "Live Activity started for \(event.title)."
        } catch {
            liveActivityMessage = error.localizedDescription
        }
    }

    func endLiveActivities() async {
        await LiveActivityController.endAll()
        liveActivityMessage = "Live Activities ended."
    }

    private static func upcomingOnly(_ events: [LectureEvent]) -> [LectureEvent] {
        let now = Date()
        return events.filter { ($0.endDate ?? $0.startDate) >= now }
    }

    private static func almaDateString(from date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "de_DE")
        formatter.dateFormat = "dd.MM.yyyy"
        return formatter.string(from: date)
    }
}

enum LoadPhase: Equatable {
    case idle
    case loading
    case loaded(Date, String)
    case failed(String)
}

enum BrowsePhase: Equatable {
    case idle
    case loading
    case loaded(String?, Int)
    case failed(String)
}

# iOS App

Native SwiftUI client for TUE API wrapper data.

This target does not call the Next.js or FastAPI surfaces for native credentialed data flows. It logs in to Alma and Moodle directly for grades, reads Uni Tuebingen mail directly over TLS IMAP, stores university credentials in Keychain from Settings, parses the Alma timetable iCalendar feed in Swift, browses public current lectures, caches upcoming lectures in an app group container, and exposes that cache through WidgetKit plus Live Activities.

## Requirements

- Xcode 16 or newer
- XcodeGen
- iOS 17 simulator or device

## Development

Generate the Xcode project:

```bash
npm run generate:ios
```

Build for the default simulator:

```bash
npm run build:ios
```

Open the generated project:

```bash
xcodegen generate --spec ios/project.yml
open ios/TueAPI.xcodeproj
```

## App Groups

The app and widget extension share cached upcoming events through:

```text
group.dev.sebastianboehler.tueapi
```

For device builds, register that App Group in the Apple Developer portal or change the identifier in `Shared/Config/AppGroup.swift` plus both entitlement files.

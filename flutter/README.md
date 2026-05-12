# tue-api-wrapper Flutter

Native Flutter app and Dart clients for University of Tuebingen study systems.

The Flutter code calls upstream university systems directly from the device. It does not call the Python API server, hosted Cloud Run deployments, or any other wrapper backend. Credentials stay in the app process and can be stored with `flutter_secure_storage`.

## Install as a Monorepo Dependency

Use a path dependency when this repository is checked out next to another Flutter app:

```yaml
dependencies:
  tue_api_flutter:
    path: ../tue-api-wrapper/flutter
```

Use a Git dependency when the app should pull the module directly:

```yaml
dependencies:
  tue_api_flutter:
    git:
      url: https://github.com/SebastianBoehler/tue-api-wrapper.git
      path: flutter
```

Then install packages:

```bash
flutter pub get
```

Android apps need internet access in `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

## Run the Included App

The repository stores the source module without generated platform folders. Generate them once in a local checkout:

```bash
cd flutter
flutter create --platforms=android,ios .
flutter pub get
flutter run
```

Use `flutter run -d <device-id>` for a specific Android phone, iPhone, or simulator.

## Usage

Public calls do not require a university login:

```dart
import 'package:tue_api_flutter/tue_api_flutter.dart';

final client = TuebingenFlutterClient();

final lectures = await client.alma.currentLectures(date: '02.05.2026', limit: 20);
final canteens = await client.campus.canteens();
final events = await client.campus.events(query: 'KI', limit: 10);
final timms = await client.timms.search('machine learning', limit: 5);

client.close();
```

Private calls use ZDV credentials and authenticate against Alma, ILIAS, or Moodle from Dart:

```dart
import 'package:tue_api_flutter/tue_api_flutter.dart';

final client = TuebingenFlutterClient(
  credentials: const UniversityCredentials(
    username: 'your-zdv-id',
    password: 'your-password',
  ),
);

final exams = await client.alma.exams(limit: 50);
final iliasTasks = await client.ilias.tasks(limit: 20);
final moodleDashboard = await client.moodle.dashboard();

client.close();
```

## Common Methods

Alma:

```dart
client.alma.currentLectures(date: '02.05.2026', limit: 20);
client.alma.moduleSearch(query: 'machine learning');
client.alma.exams(limit: 50);
client.alma.timetablePage();
client.alma.enrollmentsPage();
client.alma.studyservicePage();
```

ILIAS:

```dart
client.ilias.rootLinks();
client.ilias.memberships(limit: 40);
client.ilias.tasks(limit: 40);
client.ilias.content('root/1');
client.ilias.forumTopics(targetUrl);
client.ilias.exerciseAssignments(targetUrl);
client.ilias.search('algorithms', page: 1);
client.ilias.info(targetUrl);
```

Moodle:

```dart
client.moodle.dashboard(eventLimit: 6, courseLimit: 12, recentLimit: 9);
client.moodle.deadlines(days: 30, limit: 50);
client.moodle.courses(classification: 'all', limit: 24, offset: 0);
client.moodle.categoriesPage();
client.moodle.coursePage(12345);
client.moodle.gradesPage();
client.moodle.messagesPage();
client.moodle.notificationsPage();
```

Campus and TIMMS:

```dart
client.campus.canteens();
client.campus.canteen(611);
client.campus.events(query: 'lecture', limit: 24);
client.campus.buildingsPage();
client.campus.kufOccupancyPage();
client.campus.seatAvailability();

client.timms.suggest('analysis');
client.timms.search('theoretische informatik', offset: 0, limit: 20);
client.timms.item('item-id');
client.timms.streams('item-id');
client.timms.tree();
```

## Checks

```bash
cd flutter
flutter pub get
flutter analyze
flutter test
```

Flutter web is not a supported target for authenticated university SSO in this module because browser CORS and cookie policy can block direct IdP flows. Android and iOS are the intended targets.

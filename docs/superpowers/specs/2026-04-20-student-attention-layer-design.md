# Student Attention Layer Design

Date: 2026-04-20

## Goal

Build an iOS attention layer that helps students notice important university changes without turning every feed into noise. The feature set should combine unread mail counts, university-approved circular badges, important mail detection, calendar invite extraction, Alma room/time change detection, grade overview signals, a Today command center, and a daily study briefing.

The system must stay honest about freshness. Mail and Alma data are only current after a successful refresh or background refresh opportunity; the UI must show last refreshed timestamps and explicit error states instead of pretending to be real time.

## Out Of Scope

- Apple Watch complication for next lecture and unread important count.
- Desktop or menu bar companion.
- RSVP accept/decline for event invites.
- Remote push infrastructure.
- Mock data or fallback content when live data fails.

## User Experience

The main app should expose attention signals in three places:

- The Mail tab shows an unread badge, with the count based on the latest successful mail refresh.
- The Home Screen app icon can optionally show a badge count for unread mail.
- A Grades tab shows Alma exam records, Moodle grades, selected Alma term, passed exams, and tracked credits.
- A Today command center summarizes the next lecture, current room, important unread mail, detected room/time changes, event invites, grade changes, and Moodle/ILIAS deadlines.

Settings should include a small "Attention" section:

- App icon badge: off, inbox unread, all mailbox unread, important unread.
- Important mail notifications: off or on.
- Daily briefing: off or on.
- Briefing time: default to morning.

The app must show when attention data was refreshed. If background refresh is disabled, notification permission is denied, or a source fails, the UI should explain the failed source and keep stale data clearly marked.

## Approved Circular Badge

Some university circular mails begin with this banner:

```text
***********************************************************************
* Die Hochschulleitung hat dem Versand dieser Rundmail zugestimmt.    *
* Die inhaltliche Verantwortung liegt bei der Absenderin/dem Absender *
***********************************************************************
```

When present near the start of a plain text or HTML-derived body, the mail parser should:

- Remove the banner from `preview` and `bodyText`.
- Expose structured metadata on summaries and details.
- Render a compact badge in mail rows and details.

The badge must not say only "Verified". The banner approves distribution, not content truth. Preferred labels:

- English: "Approved circular"
- German: "Freigegebene Rundmail"

The visual treatment should use a checkmark/seal icon, but the accessible label must explain the meaning: "University leadership approved distribution of this circular."

## Mail Attention Model

Introduce focused metadata rather than view-only string cleanup:

- `MailMessageApproval`: none, university circular.
- `MailImportanceSignal`: none, important.
- `MailAttentionSnapshot`: unread counts, important unread count, latest refresh date, source errors.

`MailBodyExtractor` should normalize and sanitize body text before previews are generated. The circular banner detector should run after line ending normalization and before preview truncation so every mail surface uses the shorter text.

Important mail detection should start rule-based:

- Sender rules: university domains and known administrative senders.
- Subject/body keywords: exam, Prüfung, Prüfungsamt, registration, Anmeldung, deadline, Frist, room change, Raumänderung, cancelled, entfällt.
- Course-related matches where a mail subject/body mentions an upcoming lecture title or course name.

Rules should produce explainable reasons. The UI can show "Important: exam registration" or "Important: room change" rather than a black-box score.

## Event Invite Detection

The mail parser should detect calendar invitations from:

- MIME parts with `text/calendar`.
- Attachments with `.ics` names.

The first version should parse invite metadata and present it safely:

- Title
- Organizer
- Start/end date
- Location
- Description preview
- Conflict status against cached Alma lectures

Supported actions:

- Add to Apple Calendar.
- Open related mail.

Unsupported in the first version:

- Accept, decline, or tentative RSVP.
- Sending response mail.

If an invite cannot be parsed, show the attachment normally and avoid inventing invite data.

## Room And Time Change Detection

On each successful Alma refresh, compare the new upcoming lecture snapshot with the previous cached snapshot before replacing it.

Detect these changes:

- Room changed.
- Start or end time changed.
- Lecture disappeared from the upcoming list.
- New lecture appeared.

Matching should prefer stable event IDs. If IDs are unstable, fall back to a conservative composite of title, course context, and date. Ambiguous matches should be skipped instead of creating false alerts.

The app should store recent changes in a small shared cache so the Today command center and widgets can read them. Old changes should expire automatically after the affected event has passed or after a short retention window.

## Notifications And Badges

Local notifications should be used for:

- Important newly unread mail.
- Room/time changes.
- Daily study briefing.
- Existing lecture reminders.

The app icon badge should be optional. It should update after:

- Manual mail refresh.
- App launch refresh.
- Successful background refresh.
- Opening or marking mail state changes when available.

iOS background refresh is opportunistic. The implementation must not assume fixed polling intervals, and notification copy should avoid promising immediate delivery.

## Today Command Center

The Today surface should be the main destination for attention data. It should include:

- Next lecture with time and room.
- Recent room/time changes.
- Important unread mail.
- Event invites and conflicts.
- Grade overview signals.
- Moodle/ILIAS deadlines.
- Last refresh status for each source.

The view should be composed from small feature sections, each with a narrow model and no duplicated fetching logic. Each section should be useful when other sources fail.

## Data Flow

Mail:

1. `OnDeviceMailService` fetches mailbox and message data.
2. `MailMessageParser` extracts summaries/details.
3. `MailBodyExtractor` strips approved circular banners and returns clean text plus metadata.
4. A mail attention store computes unread and important counts.
5. UI, tab badges, notifications, and icon badge consume the attention snapshot.

Alma:

1. `AppModel.refreshUpcomingLectures()` fetches the new snapshot.
2. A lecture change detector compares old and new snapshots.
3. The app saves the new lecture cache and recent change cache.
4. Widgets reload and notifications are scheduled if enabled.

Today:

1. Reads cached lecture, mail attention, invite, deadline, and change snapshots.
2. Shows partial data with source-specific freshness/error state.
3. Offers direct navigation to the relevant feature detail.

Grades:

1. Reads Alma exam records from `/api/alma/exams`.
2. Reads Alma enrollment status from `/api/alma/enrollments`.
3. Reads Moodle grade rows from `/api/moodle/grades`.
4. Computes passed exams, graded records, pending records, and tracked credits in the iOS app.
5. Feeds the Today command center with compact grade status once a grade snapshot has loaded.

## Error Handling

No source should silently fall back to mock or stale-looking data. The UI should distinguish:

- Fresh data.
- Stale cached data.
- Source unavailable.
- Permission disabled.
- Credentials missing.

If badge updates fail because permission is missing, the app should clear or leave the previous badge only according to system behavior and show a settings hint. If parsing fails for mail banners or invites, the original message should remain readable.

## Testing

Unit tests should cover:

- Exact approved circular banner detection.
- Banner detection with extra whitespace and CRLF line endings.
- No false positive when similar text appears in the middle of a message.
- Preview generation after banner removal.
- Important mail rule reasons.
- ICS invite extraction from `text/calendar` and `.ics` attachment parts.
- Lecture change detection for room, time, removed, and added events.
- Ambiguous lecture matching skipped safely.

UI-level checks should cover:

- Mail row approved circular badge.
- Mail detail approved circular badge and cleaned body.
- Mail tab unread badge.
- Today command center partial-source states.
- Settings toggles for badge and briefing behavior.

## Rollout Plan

Phase 1: Approved circular cleanup and mail metadata.

Phase 2: Mail attention snapshot, Mail tab badge, and optional app icon badge.

Phase 3: Lecture change detector and room/time change notifications.

Phase 4: Important mail classifier and notification rules.

Phase 5: Event invite parsing and conflict display.

Phase 6: Today command center and daily briefing.

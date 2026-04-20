# iOS On-Device University Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move iOS tasks and deadlines off the env-authenticated backend and onto Keychain-backed on-device ILIAS/Moodle clients.

**Architecture:** Add a small `ios/Shared/University` access layer with shared SAML form parsing, portal HTTP helpers, tested ILIAS task parsing, tested Moodle calendar normalization, and a facade used by `AppModel.refreshTasks()`. Keep backend routes intact but mark their private-auth usage as legacy/dev in docs and comments.

**Tech Stack:** Swift 5.9, XCTest, URLSession with ephemeral cookie stores, existing SwiftUI app model, existing Python/ChatGPT docs.

---

## File Structure

- Create `ios/Shared/University/UniversityCredentialsLoading.swift`: credential-loading protocol plus Keychain conformance.
- Create `ios/Shared/University/UniversityPortalError.swift`: localized user-facing errors.
- Create `ios/Shared/University/PortalHTTPSession.swift`: small URLSession wrapper for text, form POST, and JSON POST.
- Create `ios/Shared/University/UniversityHTMLFormParser.swift`: Shibboleth and SAML form helpers.
- Create `ios/Shared/University/UniversitySAMLHandoff.swift`: shared SAML handoff loop.
- Create `ios/Shared/University/IliasTaskHTMLParser.swift`: parse ILIAS derived tasks HTML into existing `IliasTask`.
- Create `ios/Shared/University/IliasOnDeviceClient.swift`: login to ILIAS and fetch task overview.
- Create `ios/Shared/University/MoodleCalendarNormalizer.swift`: normalize Moodle AJAX calendar payloads into existing `MoodleDeadline`.
- Create `ios/Shared/University/MoodleOnDeviceClient.swift`: login to Moodle and fetch deadlines.
- Create `ios/Shared/University/UniversityPortalClient.swift`: facade used by the app model.
- Modify `ios/TueAPI/App/AppModel+Tasks.swift`: use `UniversityPortalClient`.
- Modify `ios/TueAPI/App/AppModel.swift`: update task/deadline comment.
- Modify `ios/Shared/Backend/BackendClient.swift`: mark private env-backed task/deadline methods legacy/dev.
- Modify `chatgpt/README.md` and `package/README.md`: clarify env-backed private data is legacy/dev only.
- Create `ios/TueAPITests/UniversityPortalParsingTests.swift`: parser tests.
- Create `ios/TueAPITests/UniversityPortalClientTests.swift`: missing-credentials facade test.

## Task 1: Tests First

- [ ] Add `UniversityPortalParsingTests` with one ILIAS task HTML case and two Moodle AJAX payload cases.
- [ ] Add `UniversityPortalClientTests` with a nil credential loader.
- [ ] Run targeted tests and verify they fail because the new parser/client symbols do not exist.

Expected command:

```bash
xcodebuild test -project ios/TueAPI.xcodeproj -scheme TueAPI -destination 'platform=iOS Simulator,id=372EB9C8-F9F2-4CCD-9508-DCE367A9CC83' -only-testing:TUEAPITests/UniversityPortalParsingTests -only-testing:TUEAPITests/UniversityPortalClientTests
```

## Task 2: Shared Portal Infrastructure

- [ ] Add credential-loading protocol, errors, HTTP wrapper, HTML form parser, and SAML handoff helper.
- [ ] Run targeted tests again and keep failures focused on missing ILIAS/Moodle parser/client implementation.

## Task 3: ILIAS Tasks

- [ ] Implement `IliasTaskHTMLParser`.
- [ ] Implement `IliasOnDeviceClient` using the shared Shibboleth/SAML helpers.
- [ ] Run `UniversityPortalParsingTests` and verify the ILIAS parser test passes.

## Task 4: Moodle Deadlines

- [ ] Implement `MoodleCalendarNormalizer`.
- [ ] Implement `MoodleOnDeviceClient` using the shared Shibboleth/SAML helpers and Moodle AJAX endpoint.
- [ ] Run `UniversityPortalParsingTests` and verify Moodle tests pass.

## Task 5: App Integration

- [ ] Implement `UniversityPortalClient`.
- [ ] Switch `AppModel.refreshTasks()` to `UniversityPortalClient`.
- [ ] Update comments/docs that still describe iOS tasks/deadlines as backend-backed.
- [ ] Run `UniversityPortalClientTests`.

## Task 6: Legacy/Dev Docs

- [ ] Mark backend task/deadline methods as legacy/dev in comments.
- [ ] Update `chatgpt/README.md` and `package/README.md` to say env-backed private data is not production multi-user auth.

## Task 7: Verification

- [ ] Run targeted iOS tests.
- [ ] Run full iOS tests.
- [ ] Run `npm run build:ios`.
- [ ] Run `git diff --check`.
- [ ] Commit logical implementation and docs checkpoints, then push.

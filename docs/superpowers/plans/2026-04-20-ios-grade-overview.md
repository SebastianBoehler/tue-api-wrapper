# iOS Grade Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an iOS grade overview that mirrors the web app's Alma exam progress and Moodle grade overview.

**Architecture:** Use the existing backend API client pattern. Add decodable grade models and backend fetch methods, compute summary metrics in a small pure Swift helper, then render a SwiftUI Grades tab with explicit loading and error states.

**Tech Stack:** Swift 5.9, SwiftUI, async/await, XcodeGen, XCTest.

---

## File Structure

- Create `ios/Shared/Backend/GradeModels.swift` for Alma enrollment, Alma exam, Moodle grade, and load-phase models.
- Create `ios/Shared/Backend/BackendClient+Grades.swift` for `/api/alma/enrollments`, `/api/alma/exams`, and `/api/moodle/grades`.
- Create `ios/TueAPI/Features/Grades/GradeOverviewStats.swift` for passed exam, graded exam, pending exam, and credit calculations.
- Create `ios/TueAPI/Features/Grades/GradeOverviewView.swift` for loading, refresh, summary cards, and sections.
- Create `ios/TueAPI/Features/Grades/GradeRecordRow.swift` for Alma exam rows.
- Create `ios/TueAPI/Features/Grades/MoodleGradeRow.swift` for Moodle grade rows.
- Modify `ios/TueAPI/App/AppView.swift` to add a Grades tab.
- Modify `ios/project.yml` to add a unit-test target.
- Create `ios/TueAPITests/GradeOverviewStatsTests.swift` for summary logic tests.

## Task 1: Add Grade Summary Logic With Tests

**Files:**
- Create: `ios/TueAPITests/GradeOverviewStatsTests.swift`
- Create: `ios/TueAPI/Features/Grades/GradeOverviewStats.swift`
- Modify: `ios/project.yml`

- [ ] **Step 1: Add the unit test target to `ios/project.yml`**

Add a `TueAPITests` target that depends on `TueAPI` and reads sources from `TueAPITests`.

- [ ] **Step 2: Write failing tests for grade summary behavior**

Test these behaviors:

- `1,0`, `BE`, and `BESTANDEN` count as passed.
- `5,0` does not count as passed.
- Missing or `-` grades are pending.
- Credit values like `6,0` and `3.5` are summed as `9.5`.

- [ ] **Step 3: Run tests and verify they fail**

Run:

```bash
npm run generate:ios
xcodebuild -project ios/TueAPI.xcodeproj -scheme TueAPI -destination 'platform=iOS Simulator,name=iPhone 16' test
```

Expected: tests fail because `GradeOverviewStats` is not implemented.

- [ ] **Step 4: Implement `GradeOverviewStats`**

Add a pure Swift helper that accepts `[AlmaExamRecord]` and exposes `actionable`, `graded`, `pending`, `passedExamCount`, and `trackedCredits`.

- [ ] **Step 5: Re-run tests**

Run:

```bash
npm run generate:ios
xcodebuild -project ios/TueAPI.xcodeproj -scheme TueAPI -destination 'platform=iOS Simulator,name=iPhone 16' test
```

Expected: grade summary tests pass.

## Task 2: Add Backend Grade Contracts

**Files:**
- Create: `ios/Shared/Backend/GradeModels.swift`
- Create: `ios/Shared/Backend/BackendClient+Grades.swift`

- [ ] **Step 1: Add decodable models**

Define `AlmaEnrollmentState`, `AlmaExamRecord`, `MoodleGradeItem`, `MoodleGradesResponse`, `GradeOverviewPayload`, and `GradeLoadPhase`.

- [ ] **Step 2: Add backend methods**

Add:

```swift
func fetchAlmaEnrollment() async throws -> AlmaEnrollmentState
func fetchAlmaExams(limit: Int = 50) async throws -> [AlmaExamRecord]
func fetchMoodleGrades(limit: Int = 50) async throws -> MoodleGradesResponse
```

- [ ] **Step 3: Build**

Run:

```bash
npm run build:ios
```

Expected: the app target builds.

## Task 3: Add The SwiftUI Grades Tab

**Files:**
- Create: `ios/TueAPI/Features/Grades/GradeOverviewView.swift`
- Create: `ios/TueAPI/Features/Grades/GradeRecordRow.swift`
- Create: `ios/TueAPI/Features/Grades/MoodleGradeRow.swift`
- Modify: `ios/TueAPI/App/AppView.swift`

- [ ] **Step 1: Add `GradeOverviewView`**

Use a `List` with:

- status banner
- summary metrics
- Alma exam sections for graded and pending records
- Moodle grade section
- enrollment section

- [ ] **Step 2: Add row components**

Create focused row views for Alma and Moodle records. Keep each row file under 300 lines.

- [ ] **Step 3: Add a Grades tab**

Add a `NavigationStack` tab with label `Grades` and SF Symbol `graduationcap`.

- [ ] **Step 4: Build**

Run:

```bash
npm run build:ios
```

Expected: the app target builds.

## Task 4: Update The Attention-Layer Spec

**Files:**
- Modify: `docs/superpowers/specs/2026-04-20-student-attention-layer-design.md`

- [ ] **Step 1: Add grades to the approved scope**

Mention grade overview as a Today command center signal and as a separate iOS tab.

- [ ] **Step 2: Re-check the spec**

Run:

```bash
wc -l docs/superpowers/specs/2026-04-20-student-attention-layer-design.md
rg -n "TBD|TODO|placeholder" docs/superpowers/specs/2026-04-20-student-attention-layer-design.md
```

Expected: file remains below 300 lines and no placeholder hits appear.

## Self-Review

- Spec coverage: The user asked for web-grade parity in iOS. This plan covers Alma exam records, Alma enrollment, Moodle grades, and a visible iOS tab.
- Placeholder scan: No `TBD`, `TODO`, or vague "add appropriate" steps are present.
- Type consistency: The plan consistently uses `AlmaExamRecord`, `MoodleGradeItem`, `MoodleGradesResponse`, `GradeOverviewPayload`, and `GradeOverviewStats`.

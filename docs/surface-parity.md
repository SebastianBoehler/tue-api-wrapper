# Surface Parity

This matrix tracks which backend capabilities are exposed across the main repo surfaces and where the next parity work should land.

Status legend:

- `full`: dedicated surface support for the core workflow
- `partial`: summary-only, read-only, or narrower workflow support
- `none`: not currently exposed
- `proposed`: recommended next implementation target

## Matrix

| Capability | Backend API | Next.js web | ChatGPT MCP app | Desktop | iOS | Python CLI | Go CLI |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard overview | full | full | full | partial | partial | none | partial |
| Unified Alma/ILIAS search + fetch | full | none | full | none | proposed | none | full |
| Alma timetable snapshot | full | partial | full | partial | full | full | full |
| Alma timetable controls / grid / PDF / feed refresh | full | full | partial | none | partial | none | full |
| Alma exams / progress | full | full | full | partial | proposed | partial | full |
| Alma study-service documents summary | full | full | full | partial | proposed | partial | full |
| Alma report PDF generation | full | partial | proposed | none | proposed | partial | full |
| Alma study planner | full | full | full | none | proposed | none | full |
| Alma authenticated course search | full | full | full | none | proposed | none | full |
| Alma public module catalog search | full | full | full | none | full | partial | full |
| Alma module detail | full | full | full | none | partial | none | full |
| Alma course registration | full | partial | proposed | none | proposed | none | full |
| Combined Alma course detail + portal statuses | full | full | full | none | partial | none | full |
| ILIAS memberships / tasks | full | full | full | partial | partial | none | full |
| ILIAS search | full | full | full | none | proposed | none | full |
| ILIAS learning-space detail | full | full | full | none | proposed | partial | full |
| ILIAS info screen | full | none | proposed | none | proposed | none | full |
| ILIAS favorites / waitlist actions | full | partial | proposed | none | proposed | none | partial |
| Mail inbox / message detail | full | full | full | partial | full | none | full |
| Moodle dashboard and detail routes | full | full | proposed | partial | partial | none | full |
| Moodle enrolment action | full | partial | proposed | none | proposed | none | none |
| Campus buildings / canteens | full | full | proposed | none | partial | none | full |
| Career / Praxisportal | full | full | proposed | none | full | none | full |
| TIMMS archive | full | full | proposed | none | proposed | none | full |
| Talks calendar | full | full | partial | partial | full | none | partial |
| Native reminders / widgets / live activities | none | proposed | none | proposed | full | none | none |

## Surface Notes

- The FastAPI backend is the canonical cross-surface contract. It already exposes read workflows plus several mutation/action endpoints.
- The Next.js app is currently the broadest human-facing surface. It has the deepest web UI for agenda, courses, Moodle, mail, documents, ILIAS spaces, TIMMS, Praxisportal, campus, and talks.
- The ChatGPT app is strong for read workflows: study snapshots, schedule, tasks, grades, documents, mail, study planner, course lookup, unified search, and ILIAS search/inspection. Critical actions should be added as human-in-the-loop confirmation widgets, not direct mutating tool calls.
- The desktop app currently reads `/api/dashboard`, manages local credentials, and opens backend or portal URLs. It inherits summary slices but not the deeper web flows.
- The iOS app is a native Alma-first client. It logs in to Alma directly, caches timetable entries for widgets and Live Activities, supports local lecture reminders, browses current lectures, exposes native calendar/course detail views, and can optionally call the backend for module search, portal statuses, ILIAS tasks, and Moodle deadlines.
- The Go CLI now exposes most backend route groups through JSON-first commands. Native Go implementations still only exist for selected stable flows.
- The Python CLI remains useful for legacy/local flows but should not be the primary target for new product parity unless a workflow is automation-heavy.

## StudyOS Platform Direction

- This repo should stay the university systems layer for downstream StudyOS products: connectors, normalized contracts, change detection, and preview-first actions.
- Tutoring, explainers, flashcards, quizzes, podcasts, and adaptive study coaching belong in downstream learning products, not here.
- The current StudyOS-aligned backlog is tracked in [`docs/superpowers/plans/2026-04-23-studyos-data-layer-backlog.md`](./superpowers/plans/2026-04-23-studyos-data-layer-backlog.md).

## Recommended Parity Work

1. Bring study-service documents to iOS next. These are high-value mobile use cases and can start read-only: study-service summary, current PDF, and report list.
2. Bring full Moodle to iOS and ChatGPT. iOS currently only consumes Moodle deadlines, while web already has dashboard, calendar, courses, grades, messages, notifications, and course detail.
3. Bring TIMMS archive and richer campus data to iOS, ChatGPT, and desktop. These are mostly public/product-style flows and already have backend contracts.
4. Bring iOS-native utility back to web and desktop: lecture reminders, map navigation, and schedule notification workflows.
5. Add a global command/search surface to web and desktop that reuses the existing unified Alma/ILIAS search/fetch backend.
6. Add critical action flows with explicit confirmation UI before mutation. Continue expanding from Alma registration to Moodle enrolment and ILIAS waitlist/favorites.

## Critical Action Flow Policy

Critical actions include Alma course registration, Moodle enrolment, ILIAS waitlist join, ILIAS favorite changes, report generation, and any future workflow that changes upstream state or produces official documents.

Requirements for every surface:

- The first interaction must only prepare an action intent. It must not mutate upstream state.
- The confirmation view must show the portal, target title, target URL or identifier, account/context if available, exact action, expected side effects, required inputs, and backend endpoint that will be called.
- The user must explicitly choose `Proceed` or `Cancel`.
- `Proceed` must execute exactly the displayed action. If required inputs change, the intent must be rebuilt and reconfirmed.
- `Cancel` must discard the intent without calling the action endpoint.
- Errors must be shown directly. Do not use mock success states or fallback data.

## ChatGPT Action Pattern

For ChatGPT, mutating tools should be split into a preview tool and a confirmed execution path:

1. A tool call such as `prepare_course_registration` returns a ChatGPT app UI resource, not a mutation result.
2. The UI renders the action intent as an HTML confirmation component with clear `Proceed` and `Cancel` buttons.
3. The component stores only the validated action payload needed for the displayed operation.
4. `Proceed` calls the backend action endpoint, or a dedicated confirmed-action tool, with the same payload shown in the UI.
5. The model should not be able to execute the critical action by simply deciding to call a mutating tool in text-only mode.

This gives ChatGPT a human-in-the-loop action model while still letting the assistant help discover the right action and prefill the confirmation screen.

## iOS Action Pattern

For iOS, critical actions should use a native confirmation sheet:

1. The initiating view prepares a typed action intent.
2. A sheet presents the portal, course/item/document name, destination URL, action summary, side effects, and any required input such as enrolment key or agreement checkbox.
3. The sheet has explicit `Proceed` and `Cancel` buttons. Destructive or state-changing operations should use clear visual emphasis and plain wording.
4. `Proceed` performs the backend request and then shows the result state in the same flow.
5. `Cancel` dismisses the sheet and leaves upstream state untouched.

The iOS implementation should keep this as reusable infrastructure, for example a small `CriticalActionIntent` model plus a shared `CriticalActionConfirmationSheet`, so Alma, ILIAS, and Moodle actions do not each invent their own confirmation behavior.

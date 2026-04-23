# StudyOS Data Layer Backlog

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development when implementing this backlog. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Position `tue-api-wrapper` as the canonical University of Tübingen connector, contract, and action layer for downstream StudyOS products such as `learning-app`.

**Architecture:** Keep this repo focused on university systems access, normalized JSON contracts, public campus feeds, change detection, and preview-first critical actions. Do not turn this repo into a tutoring or artifact-generation product.

**Tech Stack:** Python clients and FastAPI backend, Go CLI, Next.js dashboard, ChatGPT MCP app, Electron desktop, native iOS.

## Repo Boundary

This repo should own:

- authenticated Alma, ILIAS, Moodle, mail, and future TIMMS connectors
- public campus, directory, talks, and logistics data
- normalized student snapshot contracts
- source-material manifests for downstream course import
- change detection primitives for student-facing deltas
- action preview plus confirmed execution contracts for official portal workflows

This repo should not own:

- tutoring flows
- flashcard, quiz, explainer, podcast, or study-pack generation
- learner memory or spaced-repetition logic
- recommendation-heavy planner logic beyond exposing planning inputs

## Target Contracts

- `CourseMaterialManifest`: normalized files, links, metadata, provenance, and freshness for official course materials
- `StudySnapshot`: timetable, deadlines, tasks, grades, documents, important mail signals, campus context, and source freshness
- `StudyDelta`: meaningful diffs such as room changes, new assignments, new grade rows, important new mails, and document availability changes
- `ActionIntent`: preview-first portal action contract with target metadata, side effects, required inputs, and confirmed execution path
- `PlanningInputBundle`: official schedule, exam windows, deadlines, and campus constraints without planner decisions
- `LectureMaterialBundle`: lecture/session identity plus linked official files and pages
- `AssessmentContext`: exam records, registration windows, module relations, and related academic status

## Workstreams

### Task 1: Course material connectors

- [ ] Define `CourseMaterialManifest` in repo docs and types before adding more course-ingest endpoints.
- [ ] Add read-only connectors that can emit official course files, links, and source metadata from Alma, ILIAS, Moodle, and later TIMMS.
- [ ] Preserve source provenance, upstream URLs, and freshness timestamps instead of flattening everything into plain text too early.

### Task 2: Unified student snapshot

- [ ] Expand the current dashboard-style contracts into an explicit `StudySnapshot` that downstream apps can consume without reverse-engineering UI payloads.
- [ ] Standardize freshness markers, source errors, and partial-data semantics across Alma, ILIAS, Moodle, mail, and campus sources.
- [ ] Keep the snapshot honest about stale or failed sources. Do not invent fallback states.

### Task 3: Change detection and attention signals

- [ ] Add a typed `StudyDelta` model for room changes, time changes, new deadlines, new grades, important mail, and document status changes.
- [ ] Reuse existing attention-layer and reminder work where possible instead of inventing separate diff logic per surface.
- [ ] Expose deltas as reusable backend contracts so web, ChatGPT, desktop, iOS, and downstream apps can share the same event semantics.

### Task 4: Critical action contract layer

- [ ] Standardize a repo-wide `ActionIntent` shape for preview, confirmation, and execution.
- [ ] Apply that contract consistently to Alma registration, ILIAS waitlist or favorites, Moodle enrollment, and official document-generation flows.
- [ ] Keep the first step non-mutating on every surface.

### Task 5: Planning inputs, not planner logic

- [ ] Expose a `PlanningInputBundle` that collects lectures, deadlines, exams, planner modules, and optional campus/navigation constraints.
- [ ] Keep recommendation and study-session scheduling logic outside this repo.
- [ ] Make the raw inputs stable enough that `learning-app` or other clients can build adaptive planning on top.

### Task 6: Surface adoption

- [ ] Feed `StudySnapshot`, `StudyDelta`, and `ActionIntent` into the Next.js app, ChatGPT app, desktop shell, and iOS app as the canonical shared contracts.
- [ ] Continue using surface-specific UX, but reduce surface-specific payload drift.
- [ ] Prefer backend contract reuse over per-surface reassembly of the same university state.

## Acceptance Direction

- Downstream apps can import official course materials without re-implementing portal parsing.
- A single normalized snapshot exists for "what is my current university state?"
- Meaningful changes are represented as typed deltas rather than inferred separately by each client.
- Official mutations use preview-first action intents with explicit confirmation.
- Learning products can build planning and tutoring on top without needing direct portal scraping.

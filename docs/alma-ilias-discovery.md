# Alma + ILIAS Endpoint Discovery
Discovery date: 2026-03-15

This note summarizes additional Alma and ILIAS request contracts discovered from:
- the current wrapper and API surface in this repo
- local HAR fixtures under `package/fixtures/`
- an authenticated live crawl with `python -m tue_api_wrapper.route_discovery_cli`

The discovery CLI now also supports offline HAR imports, which is useful when a full authenticated session is already captured locally:

```bash
package/.venv/bin/python -m tue_api_wrapper.route_discovery_cli alma \
  --har alma_full_session.directory.uni-tuebingen.de.har \
  --format json
```

No credentials, cookies, raw documents, or full private HTML dumps are stored here. Live observations are reduced to route shapes, query keys, page titles, and selected form/button names.

## Existing Implemented Surface
Already covered by the current repo:

| System | Implemented today |
| --- | --- |
| Alma | timetable, enrollments, exams, course catalog, module-description search, study-service documents, current lectures |
| ILIAS | root, memberships, tasks, content parsing, forums, exercises, basic search, info-screen lookup |

The ranking below therefore focuses on contracts that are new or materially richer than the current implementation.

## Discovery Method
Authenticated crawl commands used:

```bash
UNI_USERNAME=... UNI_PASSWORD=... \
package/.venv/bin/python -m tue_api_wrapper.route_discovery_cli alma \
  --auth --depth 1 --max-pages 20 --format json

UNI_USERNAME=... UNI_PASSWORD=... \
package/.venv/bin/python -m tue_api_wrapper.route_discovery_cli ilias \
  --auth --depth 1 --max-pages 20 --format json
```

Value ranking rubric:

| Dimension | Meaning |
| --- | --- |
| Frequency | how often a typical student needs it during the semester |
| Actionability | whether it helps students decide or do something immediately |
| Uniqueness | whether Alma or ILIAS is the only realistic source for the workflow |
| Incremental value | how much it adds beyond the current app surface |

Labels used below:
- `very high`: frequent and immediately useful
- `high`: clearly useful but narrower or more seasonal
- `medium`: useful for a subset of students or weeks
- `low`: technically available but weak product fit

## Newly Observed Alma Contracts

| Route or flow | Observed contract | Inferred student-facing capability | Student value |
| --- | --- | --- | --- |
| `/alma/pages/startFlow.xhtml?_flowId=studyPlanner-flow&_flowExecutionKey=...` | `GET` and `POST`; form `enrollTree_SUBMIT`; controls `switchAlternativeFachsemester`, `nextStudysemester`, `switchMeineModule`, `switchMusterplan`, `switchView`, `explodeModule`, `showModuleDetails:button` | semester switching, own-modules vs sample-plan toggle, inline module expansion, module detail drilldown | `very high` |
| `/alma/pages/startFlow.xhtml?_flowId=searchCourseNonStaff-flow&_flowExecutionKey=...` | `GET` and `POST`; `genericSearchMask:` form; title-like text field; term selector; buttons `search`, `toggleSearchShowAllCriteria`, `saveSearchCriteriaSetQuery` | broad event and course search for students, with likely advanced filters behind the toggle | `very high` |
| `/alma/pages/cm/exa/nominalactualcomparison/sollistvergleichBaum.xhtml?_flowId=searchExaminationsStudents-flow&_flowExecutionKey=...` | `GET` and `POST`; `genericSearchMask:` form; exam-title fields; term-segment fields; buttons `search`, `reset`, `saveSearchCriteriaSetQuery` | searchable elective-exam discovery rather than just a passive exam listing | `high` |
| `/alma/pages/cm/exa/curricula/genericRailsSearchUnitsSimple.xhtml?_flowId=searchCourseOfStudyForModuleDescription-flow&navigationPosition=...` | `GET`; linked from module-description pages | degree-program narrowing before module-description browsing | `high` |
| `/alma/pages/cs/psv/orgunit/searchOrgunits.xhtml?_flowId=searchOrgunitDependingOnPersonFunction-flow&navigationPosition=...` | `GET` | public organization search | `medium` |
| `/alma/pages/cs/psv/orgunit/structureOrgunits.xhtml?_flowId=showPublicOrgunitHierarchy-flow&navigationPosition=...` | `GET` | public organization hierarchy browsing | `medium` |

Observed page titles that confirm the first three flows:

| Flow | Title |
| --- | --- |
| `studyPlanner-flow` | `Studienplaner mit Modulplan Master Informatik / Computer Science (H-2021-7)` |
| `searchCourseNonStaff-flow` | `Veranstaltungen suchen` |
| `searchExaminationsStudents-flow` | `Wahlfächer anmelden` |

Notes:
- The `studyPlanner-flow` controls strongly imply a read-only planner parser is feasible without browser automation.
- The `searchCourseNonStaff-flow` contract looks like the best Alma candidate for a real student-facing course search.
- The `searchExaminationsStudents-flow` contract appears seasonal but highly actionable around registration.

## Newly Observed ILIAS Contracts

| Route or flow | Observed contract | Inferred student-facing capability | Student value |
| --- | --- | --- | --- |
| `/ilias.php?baseClass=ilSearchControllerGUI` plus `POST ...fallbackCmd=performSearch...` | fields `term`, `type`, `area`, `search_term_combination`, `filter_type[crs]`, `filter_type[file]`, `filter_type[frm]`, `filter_type[tst]`, `filter_type[wiki]`, `screation`, `screation_date`, `screation_ontype` | richer filtered ILIAS search than the current term-only wrapper endpoint | `very high` |
| `POST /ilias.php?baseClass=ilsearchcontrollergui&cmd=post&fallbackCmd=remoteSearch&rtoken=...` | fields `queryString`, `root_id` | repository-scoped quick search inside a course or subtree | `high` |
| `GET /ilias.php?baseClass=ilsearchcontrollergui&cmdNode=...&cmdClass=ilSearchGUI&cmd=showSavedResults&ilSearchResultsTable_table_nav=...` | sortable and pageable search-results table | stable pagination and sorting on top of ILIAS search | `medium` |
| `GET /ilias.php?baseClass=ilsearchcontrollergui&cmdNode=...&cmdClass=ilSearchGUI&cmd=addToDesk&type=cat&item_ref_id=...` | state-changing action from search results | pinning categories or courses to the user's Desk or favorites | `medium` |
| `goto.php/cat/...`, `goto.php/crs/...`, `goto.php/frm/...` and more | multiple linked object types beyond the currently specialized parsers | broader generic object-target resolution | `medium` |
| profile/settings/contact/private-notes pages under dashboard GUI | standard account-management pages | profile and account-management coverage | `low` |

Observed search page title:

| Flow | Title |
| --- | --- |
| `ilSearchControllerGUI` | `Suche: Suche: ILIAS Universität Tübingen` |

Notes:
- The repo already supports a basic ILIAS search, but the live contract is meaningfully richer than what is exposed today.
- `remoteSearch` is a distinct and useful local-search contract, not just a duplicate of the main search page.
- `showSavedResults` matters mainly after filtered search is implemented properly.

## Combined Ranking By Student Value
This ranking is cross-system and prioritizes student value, not implementation novelty.

| Rank | Endpoint or contract | System | Student value | Why it ranks here |
| --- | --- | --- | --- | --- |
| 1 | `studyPlanner-flow` | Alma | `very high` | strongest missing academic-planning surface; directly helps semester and module decisions |
| 2 | `searchCourseNonStaff-flow` | Alma | `very high` | broad course discovery is one of the most common student workflows |
| 3 | richer `performSearch` filters on `ilSearchControllerGUI` | ILIAS | `very high` | turns ILIAS into a real study-material index instead of a generic text search |
| 4 | `searchExaminationsStudents-flow` | Alma | `high` | highly actionable during elective and registration periods |
| 5 | repository-scoped `remoteSearch` | ILIAS | `high` | excellent for finding slides, sheets, and forum posts inside a known course context |
| 6 | `searchCourseOfStudyForModuleDescription-flow` | Alma | `high` | reduces noise in module-description discovery by anchoring search to a degree program |
| 7 | `showSavedResults` and sortable search tables | ILIAS | `medium` | valuable once search itself is filter-aware and widely used |
| 8 | `addToDesk` | ILIAS | `medium` | useful quality-of-life action after discovery flows are solid |
| 9 | org-unit search and hierarchy | Alma | `medium` | useful directory feature, but not core to course work or planning |
| 10 | generic goto-object expansion | ILIAS | `medium` | broadens coverage and reduces unsupported object types, but mostly infrastructural at first |
| 11 | profile/settings/contact/private-notes pages | ILIAS | `low` | weak fit for the current student dashboard direction |

## Why The Top 5 Rank Highest

### 1. Alma study planner
- Highest planning value in the whole discovery pass.
- Likely the best single Alma view for "what should I take next?"
- Distinct from existing enrollments and exams because it connects structure, semester position, and module choices.

### 2. Alma event search
- Solves a frequent problem: finding the right course or event without browsing Alma manually.
- More general-purpose than current lectures and likely the best foundation for a proper Alma search UI.

### 3. ILIAS filtered search
- Search is the highest-leverage way to reduce ILIAS friction.
- Type filters matter because students usually want files, forums, tests, or courses, not generic matches.

### 4. Alma elective-exam discovery
- Seasonal but very actionable.
- Gives students a better answer to "which elective exams are actually available to me?" than the current overview.

### 5. ILIAS repository-scoped quick search
- Especially strong during the semester when students already know the course but not the exact resource name.
- Likely lower friction than global search for day-to-day study work.

## Recommended Build Order
If the goal is maximum student value per increment, the best sequence is:

1. Alma study planner read-only parsing.
2. Alma event search with title and term filters.
3. ILIAS search filter expansion on the existing search endpoint.
4. Alma elective-exam search.
5. ILIAS repository-scoped quick search.
6. Alma degree-program narrowing for module descriptions.
7. ILIAS search pagination and sorting.
8. Lower-priority quality-of-life actions like `addToDesk`.

## Product Interpretation
The pattern across both systems is consistent:

- Alma's highest-value missing surface is academic planning and course discovery.
- ILIAS's highest-value missing surface is search quality and search precision.

That suggests the next roadmap should emphasize:
- deciding what to take
- finding where course material lives
- reducing click depth across Alma and ILIAS

It should not yet emphasize:
- profile and account-management pages
- low-visibility administrative surfaces
- directory features ahead of planning and search

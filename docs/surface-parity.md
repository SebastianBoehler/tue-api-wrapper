# Surface Parity

This matrix tracks which backend capabilities are exposed across the main repo surfaces.

Status legend:

- `full`: dedicated surface support
- `partial`: summary-only or narrower workflow support
- `none`: not currently exposed

## Matrix

| Capability | Backend API | Next.js web | ChatGPT MCP app | Desktop | Python CLI | Go CLI |
| --- | --- | --- | --- | --- | --- | --- |
| Dashboard overview | full | full | full | partial | none | none |
| Unified Alma/ILIAS search + fetch | full | none | full | none | none | none |
| Alma timetable snapshot | full | partial | full | partial | full | none |
| Alma timetable controls / view / PDF refresh | full | full | none | none | none | none |
| Alma exams / progress | full | full | full | partial | partial | none |
| Alma study-service documents summary | full | full | full | partial | partial | none |
| Alma study planner | full | full | full | none | none | none |
| Alma authenticated course search | full | full | full | none | none | none |
| Alma public module catalog search | full | full | full | none | partial | none |
| Alma module detail | full | full | full | none | none | none |
| ILIAS memberships / tasks | full | full | full | partial | none | none |
| ILIAS search | full | full | full | none | none | full |
| ILIAS learning-space detail | full | full | full | none | partial | none |
| ILIAS info screen | full | none | none | none | none | full |
| Mail inbox / message detail | full | full | full | partial | none | none |
| Moodle dashboard and detail routes | full | full | none | partial | none | none |
| Campus / career / archive public products | full | full | none | none | none | none |

## Notes

- The desktop app currently reads only `/api/dashboard`, so it inherits overview slices but not the deeper web flows.
- The Go CLI remains intentionally narrow and stable, centered on `alma current-lectures`, `ilias search`, and `ilias info`.
- The Python CLI exposes ILIAS root, content, forum, and exercise readers, but it does not expose the memberships list, derived task overview, or authenticated ILIAS search.
- The ChatGPT app is now focused on management flows inside ChatGPT: dashboard, schedule, tasks, grades, documents, mail, study planner, course lookup, and learning-space search/inspection.
- Apps SDK auth is not implemented yet. For private deployment, keep the ChatGPT app and backend deployed behind your own infrastructure and read university credentials from environment variables on the backend.

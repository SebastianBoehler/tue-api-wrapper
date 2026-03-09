# CLI

This folder keeps repo-local command wrappers separate from the reusable Python package in `../package`.

Each script adds `../package/src` to `PYTHONPATH` and then calls the original module entry point.

Examples:

```bash
./cli/alma-timetable --term "Sommer 2026"
./cli/alma-academics exams --limit 10
./cli/ilias-root
./cli/tue-api-server
```

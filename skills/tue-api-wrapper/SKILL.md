---
name: tue-api-wrapper
description: Use when working in the tue-api-wrapper repository: adding university system endpoints, improving iOS/Electron/Next.js/ChatGPT surfaces, validating endpoint coverage, or helping agents onboard to the project.
---

# TUE API Wrapper

Use this skill for repository-local work in `tue-api-wrapper`.

## Architecture

- `package/`: Python clients, parsers, shared contracts, FastAPI routes, tests.
- `ios/`: SwiftUI app. Prefer Swift-native clients for app features when practical, using Python as the reference for request shape and parsing.
- `desktop/`: Electron shell with a managed local Python sidecar. Authenticated desktop flows should use the local sidecar, not hosted Cloud Run.
- `nextjs/`, `chatgpt/`, `go/`: secondary surfaces consuming shared contracts.

## Working Rules

- No mock/fallback data unless explicitly requested. Surface errors clearly.
- Keep files under 300 LOC; split views, models, clients, and helpers.
- Do not route student credentials through hosted services.
- Preserve unrelated dirty work from other agents.
- Prefer typed models and parsers over string scraping in UI code.

## Endpoint Workflow

1. Find existing routes with `rg -n "@.*api|/api/" package/src/tue_api_wrapper`.
2. Locate client/parser code near the target system, for example `alma_*`, `ilias_*`, `moodle_*`, `mail_*`, `campus_*`.
3. Add or update dataclass contracts and serialization through `portal_service.serialize`.
4. Add focused tests in `package/tests/`, using fixtures only when live credentials are not required.
5. Expose a shared FastAPI contract, then port the same request/parsing behavior natively in iOS when needed.

## Validation Commands

- Python: `cd package && pytest`
- Desktop: `npm --prefix desktop run build`
- iOS: `npm run build:ios`
- Next.js: `npm --prefix nextjs run build`

## Release Notes

Desktop releases are triggered by pushing tags matching `desktop-v*`; the workflow builds macOS DMG, Windows NSIS EXE, and Linux AppImage.

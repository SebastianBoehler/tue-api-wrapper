# Agent Instructions

This repository wraps University of Tuebingen study systems across Python, iOS, Electron, Next.js, ChatGPT, and CLI surfaces.

## Principles

- Prefer real live integrations over mocks or fallback data.
- Keep credentialed flows local to the client or local sidecar runtime; do not route student credentials through hosted services.
- Keep files below 300 LOC. Split views, models, API clients, and helpers early.
- Preserve unrelated work from other agents. If committing, group changes into logical commits.
- Use typed parsers and shared contracts instead of ad hoc string handling.

## Common Commands

- Python tests: `cd package && pytest`
- Desktop build: `npm --prefix desktop run build`
- Desktop dev: `npm run dev:desktop`
- iOS project: `npm run generate:ios`
- iOS simulator build: `npm run build:ios`
- Next.js build: `npm --prefix nextjs run build`

## Endpoint Work

- Start from `package/src/tue_api_wrapper/api_server.py` and `package/src/tue_api_wrapper/api_routes_*.py`.
- Reuse existing clients/parsers under `package/src/tue_api_wrapper/`.
- Add or update focused tests in `package/tests/`.
- For new app surfaces, expose shared JSON contracts from Python first, then port natively where appropriate.

## Native Client Direction

iOS should implement as much as practical in Swift-native clients, using the Python wrapper as the request and parsing reference. Electron can use its managed local Python sidecar for the same behavior without depending on hosted Cloud Run for authenticated flows.

[![CI](https://github.com/SebastianBoehler/tue-api-wrapper/actions/workflows/ci.yml/badge.svg)](https://github.com/SebastianBoehler/tue-api-wrapper/actions/workflows/ci.yml)
![Python](https://img.shields.io/badge/python-3.11%2B-3776AB?logo=python&logoColor=white)
![Next.js](https://img.shields.io/badge/next.js-15-000000?logo=nextdotjs&logoColor=white)
![MCP Apps](https://img.shields.io/badge/MCP-Apps%20SDK-1f6feb)
![Cloud Run](https://img.shields.io/badge/deploy-cloud%20run-4285F4?logo=googlecloud&logoColor=white)

# tue-api-wrapper

Unified Alma + ILIAS access for the University of Tuebingen, packaged as:

- a reusable Python client and API backend
- a Unix-native Go CLI for constrained environments
- thin local CLI commands
- a Next.js student dashboard
- a ChatGPT Apps SDK MCP server and widget

The goal is straightforward: keep Alma and ILIAS as the source of truth, but build better navigation, search, and summarization layers on top.

## Monorepo layout

- `package/`: Python package, request-based Alma/ILIAS clients, FastAPI backend
- `go/`: JSON-first Go CLI for authenticated Alma and ILIAS flows
- `cli/`: repo-local shell wrappers around the Python entry points
- `nextjs/`: student-facing web app
- `chatgpt/`: ChatGPT app with MCP tools and widget UI

## Features

- Read Alma timetable exports without browser automation
- Read Alma academic views and study-service document options
- Read ILIAS repository roots, content pages, forum topics, and exercises
- Read Alma day-specific lecture listings from the authenticated current-lectures flow
- Search authenticated ILIAS repository objects and resolve object info screens
- Run the stable authenticated flows as a single Go binary without Python or Node
- Expose a unified backend API for web and ChatGPT surfaces
- Provide standard `search` and `fetch` MCP tools for ChatGPT compatibility
- Package both backend and ChatGPT server for Google Cloud Run

## Quick start

### 1. Start the backend

```bash
cd package
python3 -m venv .venv
source .venv/bin/activate
pip install -e .

export ALMA_USERNAME="your-uni-login"
export ALMA_PASSWORD="your-password"
export ILIAS_USERNAME="your-uni-login"
export ILIAS_PASSWORD="your-password"

tue-api-server
```

The backend runs on `http://127.0.0.1:8000` by default.

### 2. Start the web app

```bash
cd nextjs
npm ci --workspaces=false
PORTAL_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

### 3. Build the Go CLI

```bash
cd go
go build ./cmd/tue
./tue --help
```

For constrained Linux targets, cross-compile a single binary:

```bash
cd go
GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -o tue-linux-arm64 ./cmd/tue
```

### 4. Start the ChatGPT app

```bash
cd chatgpt
npm ci --workspaces=false
PORTAL_API_BASE_URL=http://127.0.0.1:8000 npm run build
PORTAL_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

The MCP endpoint will be available at `http://127.0.0.1:8080/mcp`.

## CI

GitHub Actions runs:

- Python install, source compilation, and unit tests in `package/`
- Type checks and production builds in `nextjs/`
- Type checks and production builds in `chatgpt/`

Workflow file: [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)

## Security and local fixtures

Captured HAR/network exports and downloaded PDFs can contain session material and signed URLs.

- They are ignored by git.
- Local debugging fixtures belong under `package/fixtures/`.
- CI does not require those files; HAR-dependent tests are skipped when the fixtures are absent.

## Deployment

- [`package/Dockerfile`](./package/Dockerfile): backend API container
- [`chatgpt/Dockerfile`](./chatgpt/Dockerfile): ChatGPT MCP server container
- [`chatgpt/cloudbuild.yaml`](./chatgpt/cloudbuild.yaml): Cloud Build config

The ChatGPT app expects `PORTAL_API_BASE_URL` to point at a reachable backend deployment for live data.

## Related docs

- [`package/README.md`](./package/README.md)
- [`go/README.md`](./go/README.md)
- [`chatgpt/README.md`](./chatgpt/README.md)
- [`CONTRIBUTING.md`](./CONTRIBUTING.md)

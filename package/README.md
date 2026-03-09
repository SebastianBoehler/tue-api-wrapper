# tue-api-wrapper package

Core Python package for the unified Alma + ILIAS study hub.

This subproject now owns:

- the request-based Alma client
- the request-based ILIAS client
- the original Python CLI entry points
- the FastAPI backend used by `nextjs/` and `chatgpt/`

## Install

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

## Run the backend API

```bash
tue-api-server
```

The API starts on `http://127.0.0.1:8000` and exposes:

- `GET /api/dashboard`
- `GET /api/search`
- `GET /api/items/{id}`
- `GET /api/alma/*`
- `GET /api/ilias/*`

The existing CLI entry points are still available after installation:

- `alma-timetable`
- `alma-academics`
- `alma-document`
- `ilias-root`
- `ilias-content`
- `ilias-learning`

## Credentials

```bash
export ALMA_USERNAME='your-uni-login'
export ALMA_PASSWORD='your-password'
export ILIAS_USERNAME='your-uni-login'
export ILIAS_PASSWORD='your-password'
```

ILIAS also falls back to `UNI_USERNAME` / `UNI_PASSWORD`, then to the Alma credentials.

## Tests

```bash
python3 -m unittest discover -s tests -v
```

Tests that rely on local HAR captures are skipped automatically when `package/fixtures/` is absent. Those exports are intentionally ignored by git because they may contain session material.

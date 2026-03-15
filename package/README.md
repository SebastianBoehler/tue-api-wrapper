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
- `GET /api/mail/mailboxes`
- `GET /api/mail/inbox`
- `GET /api/mail/messages/{uid}`
- `GET /api/search`
- `GET /api/items/{id}`
- `GET /api/alma/*`
- `GET /api/ilias/*`

New discovery-backed additions:

- `GET /api/alma/current-lectures`
- `GET /api/ilias/search`
- `GET /api/ilias/info`

The existing CLI entry points are still available after installation:

- `alma-timetable`
- `alma-academics`
- `alma-document`
- `ilias-root`
- `ilias-content`
- `ilias-learning`

## Credentials

```bash
export UNI_USERNAME='your-uni-login'
export UNI_PASSWORD='your-password'
```

`UNI_USERNAME` / `UNI_PASSWORD` is the canonical credential pair. Legacy `ALMA_*` and `ILIAS_*` vars are still accepted as fallbacks for compatibility.

Mail uses the same `UNI_USERNAME` / `UNI_PASSWORD` pair by default. `MAIL_USERNAME` / `MAIL_PASSWORD` remains available only as an optional override if a mailbox ever needs separate values.

## Tests

```bash
python3 -m unittest discover -s tests -v
```

Tests that rely on local HAR captures are skipped automatically when `package/fixtures/` is absent. Those exports are intentionally ignored by git because they may contain session material.

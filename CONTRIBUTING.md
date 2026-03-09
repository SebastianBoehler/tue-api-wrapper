# Contributing

## Development setup

1. Start the Python backend from `package/`.
2. Run the web app from `nextjs/`.
3. Run the ChatGPT app from `chatgpt/`.

## Validation

Run the same checks as CI before opening a PR:

```bash
cd package && python3 -m venv .venv && source .venv/bin/activate && pip install -e . && python -m unittest discover -s tests -v
cd nextjs && npm ci --workspaces=false && npm run check && npm run build
cd chatgpt && npm ci --workspaces=false && npm run check && npm run build
```

## Sensitive data

- Do not commit HAR exports, PDFs, or session captures.
- Keep local network fixtures under `package/fixtures/` only for private debugging.
- The repository intentionally ignores those files.

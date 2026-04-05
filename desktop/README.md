# Desktop App

Electron desktop shell for the TUE Study Hub.

It wraps the existing Python backend as a managed local sidecar, stores credentials locally with Electron `safeStorage`, and renders a dedicated desktop UI for onboarding and dashboard access.

## Development

Install dependencies:

```bash
cd desktop
npm install
```

For local development, the desktop app expects the Python backend dependencies to be available. The simplest setup is:

```bash
cd ../package
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

Then start the desktop shell:

```bash
cd ../desktop
npm run dev
```

The Electron main process will prefer `package/.venv` automatically when it exists.

## Packaging

Build the renderer and Electron main process:

```bash
npm run build
```

Build the Python sidecar binary with PyInstaller:

```bash
python -m pip install -e ../package pyinstaller
npm run build:backend
```

Package the desktop installers:

```bash
npm run package
```

Or run the full pipeline in one step:

```bash
npm run dist
```

## Releases

Two GitHub workflows are included:

- `desktop-build.yml` builds installer artifacts for macOS, Windows, and Linux on pushes to `main` and pull requests that touch `desktop/` or `package/`
- `desktop-release.yml` publishes a GitHub Release when you push a tag matching `desktop-v*`

Current release artifacts are unsigned. If you want notarization or code signing later, extend the workflows with the appropriate platform secrets.

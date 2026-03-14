# Go CLI

This subtree contains a Unix-native Go CLI for the stable authenticated Alma and ILIAS flows already implemented in the Python package.

Current commands:

```bash
tue alma current-lectures --date 14.03.2026 --json
tue ilias search --term graphics --page 1 --json
tue ilias info --target 5289871 --json
```

The CLI automatically loads `.env.local` and `.env` from the current directory or any parent directory. Supported credentials:

- `ALMA_USERNAME`
- `ALMA_PASSWORD`
- `ILIAS_USERNAME`
- `ILIAS_PASSWORD`
- `UNI_USERNAME`
- `UNI_PASSWORD`

## Build

Standard build:

```bash
cd go
go build ./cmd/tue
```

Linux ARM64 cross-compile for boards:

```bash
cd go
GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -o tue-linux-arm64 ./cmd/tue
```

## macOS note

On this repo's current local setup (`go1.21.1` on macOS 26), plain `go build` can produce binaries that fail at launch with a missing `LC_UUID`. This is a local toolchain/runtime issue, not a contract issue in the CLI code.

The working local workaround is:

```bash
cd go
go build -ldflags='-linkmode=external' -o tue ./cmd/tue
codesign --force --sign - tue
./tue --help
```

## Verification

Contract tests are in:

- `go/internal/alma/*.go`
- `go/internal/ilias/*.go`

On the same macOS setup, `go test` test binaries need the same external-link-and-sign workaround to execute locally.

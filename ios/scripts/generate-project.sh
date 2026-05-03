#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT_DIR="$ROOT_DIR/ios/TueAPI.xcodeproj"
SOURCE_RESOLVED="$ROOT_DIR/ios/Package.resolved"
TARGET_RESOLVED="$PROJECT_DIR/project.xcworkspace/xcshareddata/swiftpm/Package.resolved"

xcodegen generate --spec "$ROOT_DIR/ios/project.yml"

mkdir -p "$(dirname "$TARGET_RESOLVED")"
install -m 0644 "$SOURCE_RESOLVED" "$TARGET_RESOLVED"

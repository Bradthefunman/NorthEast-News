#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$SCRIPT_DIR/build"
APP_DIR="$BUILD_DIR/NorthEast News Publisher.app"

mkdir -p "$BUILD_DIR"
if [ -d "$APP_DIR" ]; then rm -rf "$APP_DIR"; fi
mkdir -p "$APP_DIR/Contents/MacOS" "$APP_DIR/Contents/Resources"

SDK_PATH="$(xcrun --show-sdk-path)"
clang -O -fobjc-arc -isysroot "$SDK_PATH" -mmacosx-version-min=13.0 \
  "$SCRIPT_DIR/NorthEastNewsPublisher.m" \
  -framework Cocoa -framework WebKit -framework ImageIO -framework UniformTypeIdentifiers \
  -o "$APP_DIR/Contents/MacOS/NorthEastNewsPublisher"

cp "$SCRIPT_DIR/index.html" "$APP_DIR/Contents/Resources/index.html"
cp "$SCRIPT_DIR/Info.plist" "$APP_DIR/Contents/Info.plist"
chmod +x "$APP_DIR/Contents/MacOS/NorthEastNewsPublisher"
echo "Built $APP_DIR"

#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$SCRIPT_DIR/build"
APP_DIR="$BUILD_DIR/NorthEast News Publisher.app"
mkdir -p "$BUILD_DIR"
STAGING_ROOT="$(mktemp -d "$BUILD_DIR/.publisher-build.XXXXXX")"
STAGING_APP="$STAGING_ROOT/NorthEast News Publisher.app"
trap 'rm -rf "$STAGING_ROOT"' EXIT

node_runtime="${NEN_NEWS_NODE:-}"
if [ -z "$node_runtime" ]; then
  for candidate in /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node; do
    if [ -x "$candidate" ]; then
      node_runtime="$candidate"
      break
    fi
  done
fi
if [ -z "$node_runtime" ]; then
  node_runtime="$(command -v node || true)"
fi
if [ -z "$node_runtime" ] || [ ! -x "$node_runtime" ]; then
  echo "NorthEast News Publisher build failed: no executable Node.js runtime was found." >&2
  echo "Set NEN_NEWS_NODE to a compatible arm64 Node binary and rerun publisher/build-app.sh." >&2
  exit 1
fi
if ! node_version="$($node_runtime --version 2>&1)"; then
  echo "NorthEast News Publisher build failed: NEN_NEWS_NODE is not runnable: $node_version" >&2
  exit 1
fi
case "$(file -b "$node_runtime")" in
  *arm64*) ;;
  *) echo "NorthEast News Publisher build failed: Node.js must be an arm64 Mach-O executable: $node_runtime" >&2; exit 1 ;;
esac

mkdir -p "$STAGING_APP/Contents/MacOS" "$STAGING_APP/Contents/Resources/runtime"

SDK_PATH="$(xcrun --show-sdk-path)"
clang -O -fobjc-arc -isysroot "$SDK_PATH" -mmacosx-version-min=13.0 \
  "$SCRIPT_DIR/NorthEastNewsPublisher.m" \
  -framework Cocoa -framework WebKit -framework ImageIO -framework UniformTypeIdentifiers \
  -o "$STAGING_APP/Contents/MacOS/NorthEastNewsPublisher"

cp "$SCRIPT_DIR/index.html" "$STAGING_APP/Contents/Resources/index.html"
cp "$SCRIPT_DIR/Info.plist" "$STAGING_APP/Contents/Info.plist"
cp -L "$node_runtime" "$STAGING_APP/Contents/Resources/runtime/node"
chmod +x "$STAGING_APP/Contents/MacOS/NorthEastNewsPublisher" "$STAGING_APP/Contents/Resources/runtime/node"
codesign --force --deep --sign - "$STAGING_APP"

rm -rf "$APP_DIR"
mv "$STAGING_APP" "$APP_DIR"
echo "Built $APP_DIR with bundled Node.js $node_version"

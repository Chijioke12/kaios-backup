#!/bin/sh
set -eu

APP_DIR="${1:-open-kaistore}"
OUT_ZIP="${2:-open-kaistore-omnisd.zip}"
BASE_DIR="$(pwd)"

case "$OUT_ZIP" in
  /*) OUT_PATH="$OUT_ZIP" ;;
  *) OUT_PATH="$BASE_DIR/$OUT_ZIP" ;;
esac

if [ ! -d "$APP_DIR" ]; then
  echo "error: app dir not found: $APP_DIR" >&2
  exit 1
fi

if [ ! -f "$APP_DIR/manifest.webapp" ]; then
  echo "error: missing $APP_DIR/manifest.webapp" >&2
  exit 1
fi

tmp="/data/data/com.termux/files/usr/tmp/omnisd_pkg_$$"
rm -rf "$tmp"
mkdir -p "$tmp"

cleanup() {
  rm -rf "$tmp"
}
trap cleanup EXIT INT TERM

# Build application.zip (WebIDE-compatible packaged app).
(cd "$APP_DIR" && zip -qr "$tmp/application.zip" \
  manifest.webapp index.html style.css app.js apps.json icons >/dev/null 2>&1) || {
  echo "error: failed to build application.zip (missing files?)" >&2
  exit 1
}

# OmniSD wrapper files.
: > "$tmp/update.webapp"

manifest_url="$(APP_DIR="$APP_DIR" python3 - <<'PY'
import json
import os
app_dir=os.environ["APP_DIR"]
with open(os.path.join(app_dir,"manifest.webapp"),"r",encoding="utf-8") as f:
    m=json.load(f)
origin=m.get("origin","")
if origin.startswith("app://"):
    origin=origin[len("app://"):]
print(f"app://{origin}/manifest.webapp")
PY
)"

printf '{"version": 1, "manifestURL": "%s"}\n' "$manifest_url" > "$tmp/metadata.json"

rm -f "$OUT_PATH"
(cd "$tmp" && zip -q "$OUT_PATH" application.zip update.webapp metadata.json)

echo "ok: wrote $OUT_PATH"

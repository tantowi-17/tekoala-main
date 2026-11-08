#!/usr/bin/env bash
# Screenshot halaman hasil build untuk cek visual.
# Pemakaian: shot.sh <halaman.html> [output.png] [lebar] [tinggi]
# Contoh:    shot.sh portofolio.html /tmp/shots/porto.png 1440 2000
set -euo pipefail
PAGE="${1:-index.html}"
OUT="${2:-/tmp/shots/$(basename "$PAGE" .html).png}"
W="${3:-1440}"; H="${4:-1800}"
ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
PORT=8799
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

mkdir -p "$(dirname "$OUT")"
( cd "$ROOT/build" && python3 -m http.server "$PORT" >/dev/null 2>&1 ) &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
sleep 1
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size="$W,$H" \
  --virtual-time-budget=10000 --screenshot="$OUT" "http://localhost:$PORT/$PAGE" >/dev/null 2>&1
echo "$OUT"


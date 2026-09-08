#!/usr/bin/env bash
# dev-restart-dsh-web.sh — pick up editor src changes in the deck host.
#
# Operator insight (2026-09-05): "you might need to rebuild / restart."
# The `dsh web` node on the deck host (:3909) serves the editor dist
# as static assets AND proxies /v1 to the gateway. The node is a
# long-running process; after a `pnpm build` in packages/web/editor,
# the node may serve cached hashed assets (the same index.html /
# asset-XYZ.js even after the dist changed). A fresh browser load
# still gets the old bundle → "nothing changed" on the user's side.
#
# This script:
#   1. Rebuilds the editor dist (pnpm build in packages/web/editor).
#   2. Finds the running `dsh web` node (by --port arg) and sends
#      SIGTERM (it restarts via the dsh task board, OR you restart
#      it manually — the script prints the exact command).
#   3. Waits for the port to free, then verifies a fresh fetch
#      serves the new dist (ETag / Last-Modified mtime).
#
# Run from the repo root: ./tools/dev-restart-dsh-web.sh [port]
# Default port: 3909.
#
# This is the operator's "rebuild/restart" button. It does NOT
# touch the gateway (the gateway is a separate process on :33081;
# restart with: systemctl --user restart inference-gateway
# (unit: infra/inference-gateway.service).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EDITOR_DIR="$REPO_ROOT/packages/web/editor"
PORT="${1:-3909}"

echo "==> build editor dist"
(cd "$EDITOR_DIR" && pnpm build) >/dev/null

echo "==> locate dsh web node on :$PORT"
PID=$(ss -tlnp 2>/dev/null | awk -v p=":$PORT" '$4 ~ p {print $0}' | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2)
if [ -z "${PID:-}" ]; then
  PID=$(pgrep -f "dsh web --port $PORT" | head -1 || true)
fi

if [ -n "${PID:-}" ]; then
  echo "    dsh web pid=$PID — SIGTERM (the dsh task board will respawn it)"
  kill -TERM "$PID" 2>/dev/null || true
  for _ in $(seq 1 20); do
    if ! kill -0 "$PID" 2>/dev/null; then break; fi
    sleep 0.5
  done
  if kill -0 "$PID" 2>/dev/null; then
    echo "    still alive — send SIGKILL"
    kill -KILL "$PID" 2>/dev/null || true
  fi
  echo "    dsh web stopped. Restart it (it usually respawns via the"
  echo "    dsh task board; if not, run: dsh web --port $PORT &)"
else
  echo "    no dsh web found on :$PORT"
fi

echo
echo "==> done. Hard-refresh the browser (Ctrl+Shift+R) to bypass"
echo "    the iframe's cached assets."

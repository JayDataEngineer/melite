#!/usr/bin/env bash
# e2e-studio-lane.sh — THE BROWSER-WALL CI SEAT (roadmap §9).
#
# The cookbook audit (ledger #49) proved the browser-plane wall
# unrunnable from a fresh checkout: the lane recipe (throwaway home,
# workspace seed, MELITE_STATE_ROOT pin) lived only in
# packages/web/melite-card-view/e2e/README.md. THIS script owns the
# recipe verbatim — one source of truth; the README points here.
#
# Law (the spec's own keyless gate): self-skips when it cannot own
# the lane — port busy or E2E_STUDIO_URL already exported (a host
# is up; the caller reuses it) — exit 0, never a fake red.
set -euo pipefail

PORT=3907
HOME_DIR=data/runtime/e2e-studio-home
RUNS_ROOT=/tmp/e2e-studio-runs
COOKIES=/tmp/e2e-studio-cookies.txt
LOG=/tmp/e2e-studio-lane.log
PROFILE_SRC=data/runtime/dsh-harness-home/profiles/melite-test
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
DSH_BIN="${DSH_BIN:-dsh}"
CARD_VIEW_FILTER="${CARD_VIEW_FILTER:-@melite-plugin/dsh-card-view}"

# ── the skip laws (never a fake red) ─────────────────────────────
if [ -n "${E2E_STUDIO_URL:-}" ]; then
  echo "[e2e-studio-lane] E2E_STUDIO_URL set — reusing the standing host"
  exec pnpm --filter "$CARD_VIEW_FILTER" exec playwright test "$@"
fi
if curl -s -m 2 -o /dev/null "http://127.0.0.1:$PORT/"; then
  echo "[e2e-studio-lane] port $PORT busy — another host owns the lane; SKIP (exit 0)"
  exit 0
fi
command -v "$DSH_BIN" >/dev/null 2>&1 || {
  echo "[e2e-studio-lane] no dsh binary on PATH (set DSH_BIN); SKIP (exit 0)"
  exit 0
}
[ -d "$PROFILE_SRC" ] || {
  echo "[e2e-studio-lane] no $PROFILE_SRC to copy (see e2e/README.md — the lane home seed); SKIP (exit 0)"
  exit 0
}

# ── teardown: host kill (process group) + home removal, ALWAYS ───
HOST_PGID=""
cleanup() {
  if [ -n "$HOST_PGID" ]; then
    kill -- "-$HOST_PGID" 2>/dev/null || true
    for _ in $(seq 1 20); do
      curl -s -m 1 -o /dev/null "http://127.0.0.1:$PORT/" || break
      sleep 1
    done
  fi
  rm -rf "$HOME_DIR" "$RUNS_ROOT" "$COOKIES"
}
trap cleanup EXIT

# ── the throwaway home (README recipe verbatim) ──────────────────
# Depth-anchored beside the real one: the profile's node_modules
# symlinks are RELATIVE to the repo layout.
rm -rf "$HOME_DIR" "$RUNS_ROOT"
mkdir -p "$HOME_DIR/profiles" "$HOME_DIR/storages"
cp -a "$PROFILE_SRC" "$HOME_DIR/profiles/e2e-studio"
cp data/runtime/dsh-harness-home/settings.yaml "$HOME_DIR/"

# THE WORKSPACE PRE-STATE (seeded BEFORE boot — a host with no
# workspace serves only the chooser hero). Schema-valid row naming
# THIS repo; ISO stamps because the domain schema refuses the rest.
python3 - <<'PY'
import json, uuid
row = str(uuid.uuid4()); ts = "2026-09-21T00:00:00.000Z"
json.dump({
  "unit": {"name": "workspace", "version": 2},
  "global": {"initialized": True, "workspaceIds": [row], "archivedSessionIds": []},
  "tables": {"workspaces": {row: {
    "path": "/home/user/Documents/programs/active/inference.cpp",
    "title": "inference.cpp", "sessionIds": [],
    "createdAt": ts, "updatedAt": ts}}},
}, open("data/runtime/e2e-studio-home/storages/workspace.json", "w"))
PY

# MELITE_STATE_ROOT is not optional: QueueService refuses to boot
# without a named runs root (the cwd-guess ban, stroke 45c).
: > "$LOG"
DSH_HOME="$HOME_DIR" MELITE_STATE_ROOT="$RUNS_ROOT" \
  setsid "$DSH_BIN" --profile e2e-studio --host 127.0.0.1 --port "$PORT" --no-open \
  >> "$LOG" 2>&1 &
HOST_PID=$!
HOST_PGID="$(ps -o pgid= -p "$HOST_PID" | tr -d ' ')"

# ── wait for the token (the shell URL the spec drives) ───────────
TOKEN=""
for _ in $(seq 1 120); do
  TOKEN="$(grep -o "dsh web: http://127.0.0.1:$PORT/?token=[A-Za-z0-9_-]*" "$LOG" 2>/dev/null | tail -1 | sed "s/.*token=//" || true)"
  [ -n "$TOKEN" ] && break
  kill -0 "$HOST_PID" 2>/dev/null || { echo "[e2e-studio-lane] host died at boot:"; tail -5 "$LOG"; exit 1; }
  sleep 1
done
[ -n "$TOKEN" ] || { echo "[e2e-studio-lane] no token after 120s:"; tail -5 "$LOG"; exit 1; }
export E2E_STUDIO_URL="http://127.0.0.1:$PORT/?token=$TOKEN"
echo "[e2e-studio-lane] host up: $E2E_STUDIO_URL"

# ── seed the bench over the host's own /api wire ──────────────────
curl -sL -c "$COOKIES" "$E2E_STUDIO_URL" -o /dev/null
curl -s -b "$COOKIES" -X POST "http://127.0.0.1:$PORT/api/bench/ensure" \
  -H 'content-type: application/json' \
  -d '{"type":"client-request","rpcId":"seed","method":"bench/ensure","payload":{"args":{"doc":{"session":"main"}}}}' -o /dev/null
curl -s -b "$COOKIES" -X POST "http://127.0.0.1:$PORT/api/bench/add-stage" \
  -H 'content-type: application/json' \
  -d '{"type":"client-request","rpcId":"seed","method":"bench/add-stage","payload":{"args":{"sessionKey":"main","doc":{"card":"h3-timeline","author":"user","expect_rev":0}}}}' -o /dev/null

# ── the wall ──────────────────────────────────────────────────────
pnpm --filter "$CARD_VIEW_FILTER" exec playwright test "$@"

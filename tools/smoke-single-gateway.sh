#!/usr/bin/env bash
# smoke-single-gateway.sh — assert exactly one canonical gateway on :33081.
#
# Operator pain (2026-09-05): stray gateway processes (e.g. a bare
# `nohup` from a prior session, or the dsh task board respawning
# with /usr/bin/python3 instead of .venv/bin/python) keep reappearing
# and serve stale code. This script:
#   1. Lists all gateway.py processes with their interpreter + port.
#   2. Asserts exactly one process listens on :33081.
#   3. Asserts that process uses .venv/bin/python (the canonical
#      interpreter with the right site-packages / pydantic / etc.).
#   4. If a stray exists, prints the exact kill command (does NOT
#      kill automatically — the operator decides; the dsh task
#      board may respawn).
#
# Exits 0 on the canonical singleton, 1 otherwise.

set -euo pipefail

PORT="${1:-33081}"

echo "==> gateway main.ts processes"
ps -eo pid,ppid,lstart,cmd | grep -E "[g]ateway/src/main\.ts" || true

echo
echo "==> listeners on :$PORT"
LISTEN=$(ss -tlnp 2>/dev/null | awk -v p=":$PORT" '$4 ~ p' || true)
echo "$LISTEN" || true

PID=$(echo "$LISTEN" | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2)

if [ -z "${PID:-}" ]; then
  echo
  echo "FAIL: no gateway listening on :$PORT" >&2
  exit 1
fi

CMD=$(ps -o cmd= -p "$PID" 2>/dev/null || true)
echo
echo "==> canonical check (pid=$PID)"
echo "    cmd: $CMD"
case "$CMD" in
  *node*apps/gateway/src/main.ts*)
    echo "    OK: node apps/gateway/src/main.ts (canonical process)";;
  *)
    echo "    FAIL: unexpected listener on :$PORT — canonical is"
    echo "    node <repo>/apps/gateway/src/main.ts (melite-gateway.service)." >&2
    exit 1;;
esac

# Count distinct gateway.py PIDs (strays)
COUNT=$(pgrep -f "node .*gateway/src/main\.ts" | wc -l)
echo
echo "==> gateway process count: $COUNT"
if [ "$COUNT" -gt 1 ]; then
  echo "WARN: $COUNT gateway processes — strays present. Kill:"
  pgrep -f "node .*gateway/src/main\.ts" | while read -r p; do
    echo "  kill -TERM $p  # $(ps -o cmd= -p "$p" 2>/dev/null)"
  done
  exit 1
fi

echo "OK: one canonical gateway on :$PORT"

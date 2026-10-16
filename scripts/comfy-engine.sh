#!/usr/bin/env bash
# comfy-engine.sh — THE ENGINE LIFECYCLE DOOR (operator order
# 2026-11-06: lifecycle/queuing/markers). ComfyUI is Layer B, an
# independent service the harness never spawns implicitly (see
# supervisor.ts: the reachability supervisor owns the seat, never
# the process). This door is the EXPLICIT process owner: up, down,
# status — config-driven, never hardcoded.
#
# Config precedence mirrors comfyui-config.ts endpointConfigPath:
#   1. $COMFYUI_ENDPOINT_CONFIG (explicit path wins),
#   2. <repo>/data/comfyui_endpoint.json (untracked state home),
#   3. the package seed data/comfyui_endpoint.json.
# Reads `url` (liveness + busy) and `boot_cmd` (spawn); `<repo>`
# in boot_cmd resolves to this checkout's top level.
#
# State: <repo>/data/runtime/comfyui/engine.pid (gitignored —
# machine state, never committed). down KILLS the pidfile pid, or
# — with no pidfile (a hand-started instance, like the Oct-15
# squatter) — the main.py whose cmdline carries the configured
# port. down REFUSES a busy engine (running or pending work is
# someone's render) unless --force.
set -euo pipefail

REPO="$(git rev-parse --show-toplevel)"
SEED="$REPO/packages/engines/comfyui-cordis/data/comfyui_endpoint.json"
CFG="${COMFYUI_ENDPOINT_CONFIG:-$REPO/data/comfyui_endpoint.json}"
[ -f "$CFG" ] || CFG="$SEED"
PIDFILE="$REPO/data/runtime/comfyui/engine.pid"

cfg() {
  python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get(sys.argv[2], ''))" "$CFG" "$1"
}

URL="$(cfg url)"
[ -n "$URL" ] || { echo "comfy-engine: no url in $CFG" >&2; exit 2; }
PORT="${URL##*:}"
PORT="${PORT%%/*}"

alive() { curl -sf -m 5 "$URL/system_stats" >/dev/null 2>&1; }

queue_depth() {
  curl -sf -m 10 "$URL/queue" 2>/dev/null | jq -r '((.queue_running // []) | length) + ((.queue_pending // []) | length)' 2>/dev/null || echo 0
}

occupant_pid() {
  if [ -f "$PIDFILE" ]; then
    local pid
    pid="$(cat "$PIDFILE")"
    if kill -0 "$pid" 2>/dev/null; then echo "$pid"; return 0; fi
  fi
  # no (or stale) pidfile: the main.py carrying our port
  ps -eo pid,args | grep '[m]ain\.py' | grep -F -- "--port $PORT" | awk '{print $1}' | head -1 || true
}

cmd_status() {
  if alive; then
    local depth pid ver
    depth="$(queue_depth)"
    pid="$(occupant_pid)"
    ver="$(curl -sf -m 5 "$URL/system_stats" 2>/dev/null | jq -r '.system.comfyui_version // .comfyui_version // "?"' 2>/dev/null || echo '?')"
    echo "UP   $URL (comfyui $ver, queue depth $depth${pid:+, pid $pid})"
  else
    echo "DOWN $URL"
    return 1
  fi
}

cmd_up() {
  if alive; then
    echo "comfy-engine: already up — $(cmd_status)"
    return 0
  fi
  local boot dir cmd
  boot="$(cfg boot_cmd)"
  [ -n "$boot" ] || { echo "comfy-engine: no boot_cmd in $CFG" >&2; exit 2; }
  boot="${boot//<repo>/$REPO}"
  dir="${boot%% && *}"
  dir="${dir#cd }"
  cmd="${boot#* && }"
  [ -d "$dir" ] || { echo "comfy-engine: boot dir missing: $dir" >&2; exit 2; }
  mkdir -p "$(dirname "$PIDFILE")"
  echo "comfy-engine: spawning in $dir"
  cd "$dir"
  # setsid detaches from this shell; the pidfile owns the child.
  setsid bash -c "$cmd" >"$dir/engine.log" 2>&1 &
  echo "$!" >"$PIDFILE"
  cd "$REPO"
  echo "comfy-engine: pid $(cat "$PIDFILE") — waiting for /system_stats (up to 180s)"
  for _ in $(seq 1 36); do
    sleep 5
    if alive; then
      echo "comfy-engine: $(cmd_status)"
      return 0
    fi
  done
  echo "comfy-engine: engine did not answer in 180s — see $dir/engine.log" >&2
  exit 1
}

cmd_down() {
  local force="${1:-}"
  local depth pid
  depth="$(queue_depth)"
  if [ "$depth" != "0" ] && [ "$force" != "--force" ]; then
    echo "comfy-engine: REFUSING — queue depth $depth (someone's render). down --force to kill it." >&2
    exit 3
  fi
  pid="$(occupant_pid)"
  [ -n "$pid" ] || { echo "comfy-engine: nothing to kill (down at $URL, no occupant)"; rm -f "$PIDFILE"; return 0; }
  echo "comfy-engine: SIGTERM $pid"
  kill "$pid" 2>/dev/null || true
  for _ in $(seq 1 15); do
    kill -0 "$pid" 2>/dev/null || break
    sleep 1
  done
  if kill -0 "$pid" 2>/dev/null; then
    echo "comfy-engine: SIGKILL $pid"
    kill -9 "$pid" 2>/dev/null || true
  fi
  rm -f "$PIDFILE"
  echo "comfy-engine: down"
}

case "${1:-status}" in
  status) cmd_status ;;
  up) cmd_up ;;
  down) cmd_down "${2:-}" ;;
  *) echo "usage: comfy-engine.sh [status|up|down [--force]]" >&2; exit 2 ;;
esac

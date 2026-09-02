#!/usr/bin/env bash
# flip-to-python.sh — one-shot cutover: C gateway (:33081, build/inference_cli)
# → python orchestrator (py/gateway.py), preserving the 16GB run history.
#
# LAWS: gateway restarts are OPERATOR-ONLY (this script is the operator's
# tool). Serial GPU law holds across the flip — the C server is stopped
# BEFORE the py gateway boots, and the boot sweep manufactures zero zombies.
#
# Preconditions (enforced by the caller, not re-checked here):
#   * tests/test_py_gateway.py green
#   * tests/golden_compose/_runner.py green
#   * editor-data routes golden-compared (tests/golden_http/)
#
# Usage: bash scripts/flip-to-python.sh [--dry-run]

set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
DRY=0
[ "${1:-}" = "--dry-run" ] && DRY=1

step() { echo "[flip] $*"; }
run()  { if [ "$DRY" = 1 ]; then echo "[flip.dry] $*"; else "$@"; fi; }

cd "$REPO"

# 1. stop the supervised C server (SIGTERM → it marks its active runs
#    stopped itself; Restart=always is disabled by the unit stop)
step "stop inference-gateway (C server)"
run systemctl --user stop inference-gateway

# 2. stop the stray legacy instance if present (:18199, started before the
#    systemd unit was canonical)
for pid in $(ss -tlnp 2>/dev/null | grep ':18199' | grep -oP 'pid=\K[0-9]+' | sort -u); do
  step "stop legacy :18199 instance (pid $pid)"
  run kill -TERM "$pid"
done

# 3. inherit the run history: build/output (C cwd was build/) → output/
#    (py OUT_ROOT). rename-fast on the same fs; ledger append-merged.
step "merge build/output into output/"
if [ -d build/output ]; then
  if [ "$DRY" = 1 ]; then echo "[flip.dry] rsync -a build/output/ output/ (+ ledger merge)"
  else
    if [ -f build/output/_ledger.jsonl ]; then
      cat build/output/_ledger.jsonl >> output/_ledger.jsonl
      rm build/output/_ledger.jsonl
    fi
    find build/output -mindepth 1 -maxdepth 1 -exec mv -t output/ {} +
    rmdir build/output
  fi
else
  step "no build/output present (already merged?)"
fi

# 4. install the flipped unit and boot the py gateway on :33081
step "install systemd unit (python orchestrator)"
run cp scripts/inference-gateway.service ~/.config/systemd/user/inference-gateway.service
run systemctl --user daemon-reload
run systemctl --user start inference-gateway

# 5. verify: health, queue door, refusal band, catalog
sleep 1.5
step "verify :33081"
for probe in "/v1/health" "/v1/queue" "/v1/model-catalog"; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:33081${probe}")
  step "  GET ${probe} -> ${code}"
  [ "$code" = 200 ] || { echo "[flip] FAILED probe ${probe}"; exit 1; }
done
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:33081/v1/pipelines/start -d '{}')
step "  POST /v1/pipelines/start {} -> ${code} (expect 400: loud refusal band)"
[ "$code" = 400 ] || { echo "[flip] FAILED refusal-band probe"; exit 1; }

step "flip complete — journalctl --user -u inference-gateway -f to tail"

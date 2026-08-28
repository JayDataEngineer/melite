#!/usr/bin/env bash
# Timeline regression suite orchestrator.
#   tests/timeline/run_tests.sh            -> fast suites (no GPU, ~10s)
#   RUN_GPU=1 tests/timeline/run_tests.sh  -> + real ComfyUI e2e (~4 min)
# Fast arm needs the gateway live on :18090 (GW=... to override).
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
RC=0

echo "== draft invariants (pure JSON, no server) =="
python3 "$HERE/draft_invariants.py" || RC=1

echo "== api contract (live gateway) =="
bash "$HERE/api_contract.sh" || RC=1

echo "== comfy node contracts (fork source + torch) =="
CPY=""
for c in /opt/ComfyUI/.venv/bin/python /opt/ComfyUI/venv/bin/python; do
  [ -x "$c" ] && CPY="$c" && break
done
if [ -n "$CPY" ]; then
  "$CPY" "$HERE/comfy_nodes_test.py" || RC=1
else
  python3 "$HERE/comfy_nodes_test.py" || RC=1
fi

if [ "${RUN_GPU:-0}" = "1" ]; then
  echo "== GPU e2e (real runs; queue law enforced) =="
  bash "$HERE/seam_e2e.sh" || RC=1
  # measurement probes on the newest chained run (seam continuity + liveness)
  if [ -n "${CPY:-}" ]; then
    NEWEST=$(ls -1dt /home/user/Documents/programs/active/inference.cpp/build/output/run-* 2>/dev/null | head -1)
    if [ -n "$NEWEST" ] && [ -f "$NEWEST/stitch_video_0.mp4" ]; then
      echo "== seam_probe (audio continuity at joins) =="
      "$CPY" "$HERE/seam_probe.py" "$NEWEST" || RC=1
      echo "== freeze_detect (video liveness at joins) =="
      "$CPY" "$HERE/freeze_detect.py" "$NEWEST" || RC=1
    fi
  fi
else
  echo "== GPU e2e: SKIP (RUN_GPU=1 to enable) =="
fi

echo "TIMELINE SUITE: $([ $RC -eq 0 ] && echo ALL PASS || echo FAILURES PRESENT)"
exit $RC

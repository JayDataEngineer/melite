#!/usr/bin/env bash
# GPU e2e regression suite - RUN ONLY WITH RUN_GPU=1 (real ComfyUI runs).
# Two runs, ~4 min total:
#   1. no-audio regression: stock flow must stay byte-identical in
#      GRAPH terms - workflow files untouched, run completes, seams persist,
#      history grows by exactly 1 row, no dupes.
#   2. audio-guide lane: flow_audio.yaml variant + staged guide track.
# Law: queue must be empty before the gateway restart (FIFO ticket).
set -u
GW="${GW:-http://127.0.0.1:18090}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DRAFT="$ROOT/build/drafts/draft-timeline-h3.json"
FAILS=0
ck() { if [ "$2" = "0" ]; then echo "PASS $1"; else echo "FAIL $1"; FAILS=$((FAILS+1)); fi }
[ "${RUN_GPU:-0}" = "1" ] || { echo "SKIP (set RUN_GPU=1 for GPU e2e)"; exit 0; }

Q=$(curl -s -m 5 "$GW/v1/queue")
echo "$Q" | python3 -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if d["queued"]==0 and d["running"]==0 else 1)'
ck "gpu.queue_empty_before_start" $?

body() { # $1 = audio path suffix or ""
  cat <<EOF
{"model":"h3-timeline","seed":42,"params":{"calls":[{"beats":[{"text":"BEAT 1: two duelists circle in a rain-slick alley at night, neon reflections in puddles, thunder crack"},{"text":"BEAT 2: the clash - sparks fly as blades lock, camera pushes in slow motion, rain drops suspended"},{"text":"BEAT 3: the loser staggers, sword falls, victor turns into the fog, single bass hit and dripping water"}]},{"beats":[{"text":"BEAT 1: a diver descends past a coral wall toward a dark opening, sonar pings and regulator breath"},{"text":"BEAT 2: inside the cave a sunken ship materializes, gold coins glint in the torch beam, choir swell"},{"text":"BEAT 3: the diver lifts a jeweled mask, eyes widen behind the mask, harp arpeggio and heartbeat"}]},{"beats":[{"text":"BEAT 1: an idol in a hologram-lit studio strikes her opening pose, synthwave bass drops in"},{"text":"BEAT 2: full choreography - spins and hair whips, strobing rim lights, crowd chants the hook"},{"text":"BEAT 3: finale leap freeze-framed mid-air, confetti burst, last chord rings out"}]}}${1}}
EOF
}

run_and_wait() { # echoes run_id; $1 = audio json suffix
  local PAY DID RID S
  PAY="$(body "$1")"
  # CARD BIRTH LAW (operator order 2026-09-06): the start door 4xxes
  # a start without a doc-backed draft_id — compose THIS run's card
  # first (the exact body, preserved as the card extras), ride the
  # minted id on the start envelope.
  DID=$(curl -s -m 8 -X POST "$GW/v1/flows/drafts" -H 'content-type: application/json' \
        -d "$PAY" | python3 -c 'import json,sys; print(json.load(sys.stdin)["draftId"])')
  [ -n "$DID" ] || { echo "FAIL card compose returned no draftId"; FAILS=$((FAILS+1)); return; }
  RID=$(echo "$PAY" | DID="$DID" python3 -c 'import json,os,sys; d=json.load(sys.stdin); d["draft_id"]=os.environ["DID"]; print(json.dumps(d))' \
        | curl -s -m 8 -X POST "$GW/v1/flows/start" -H 'content-type: application/json' -d @- \
        | python3 -c 'import json,sys; print(json.load(sys.stdin)["run_id"])')
  for i in $(seq 1 150); do
    S=$(curl -s -m 5 "$GW/v1/flows/status/$RID" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("status","?"))' 2>/dev/null)
    [ "$S" = "completed" ] || [ "$S" = "failed" ] && break
    sleep 6
  done
  echo "$RID $S"
}

PRE_HIST=$(python3 -c "import json; print(len(json.load(open('$DRAFT')).get('history',[])))")

# ── 1. no-audio regression ──
OUT=$(run_and_wait "")
RID=${OUT%% *}; ST=${OUT##* }
echo "regression run: $RID -> $ST"
[ "$ST" = "completed" ]; ck "gpu.regression_run_completed" $?
D="$ROOT/build/output/$RID"
ls "$D"/window1_latent_last.h3latent "$D"/window2_latent_last.h3latent "$D"/window3_latent_last.h3latent "$D"/stitch_video_0.mp4 >/dev/null 2>&1
ck "gpu.latent_seams_and_stitch_present" $?
python3 - <<PY
import json,sys
d=json.load(open("$DRAFT")); h=d["history"]; ids=[r["runId"] for r in h]
assert len(ids)==len(set(ids)), f"dupes: {ids}"
assert "$RID" in ids, "new run missing from history"
assert len(h) == $PRE_HIST + 1, f"history grew {len(h)-$PRE_HIST} rows"
m=d["stages"][0]["result"]["metadata"]["history"]
assert [r["runId"] for r in m] == ids, "metadata.history != root history"
PY
ck "gpu.writeback_grew_history_cleanly" $?

# ── 2. audio-guide lane ──
python3 - <<'PY'   # 2s 440Hz sine wav fixture, stdlib only
import wave, math, struct
w = wave.open("/tmp/dshA_guide.wav", "w"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000)
w.writeframes(b"".join(struct.pack("<h", int(12000*math.sin(2*math.pi*440*t/24000))) for t in range(48000)))
w.close()
PY
[ -s /tmp/dshA_guide.wav ]; ck "gpu.audio_fixture_generated" $?
PRE_HIST=$(python3 -c "import json; print(len(json.load(open('$DRAFT')).get('history',[])))")
OUT=$(run_and_wait ',"audio":"/tmp/dshA_guide.wav"')
RID=${OUT%% *}; ST=${OUT##* }
echo "audio-guide run: $RID -> $ST"
[ "$ST" = "completed" ]; ck "gpu.audio_run_completed" $?
D="$ROOT/build/output/$RID"
ls "$D"/stitch_video_0.mp4 >/dev/null 2>&1; ck "gpu.audio_stitch_present" $?
ls /opt/ComfyUI/input/guide_*dshA_guide.wav >/dev/null 2>&1
ck "gpu.audio_staged_to_comfy_input" $?
python3 -c "import json; d=json.load(open('$DRAFT')); h=d['history']; ids=[r['runId'] for r in h]; assert len(ids)==len(set(ids)); assert '$RID' in ids; assert len(h)==$PRE_HIST+1"
ck "gpu.audio_writeback_clean" $?

echo "SUITE seam_e2e: $([ $FAILS -eq 0 ] && echo PASS || echo FAIL $FAILS)"
exit $([ $FAILS -eq 0 ] && echo 0 || echo 1)

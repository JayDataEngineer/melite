#!/usr/bin/env python3
"""Card reconstruction accuracy test for the h3-timeline action card.

THE FAIL THIS CATCHES (2026-08-30):
  The card.json (immutable run record) may have N calls, but the run
  directory has M window clips (M > N). The draft_writeback updates the
  draft's result (assetUrls, artifacts) but NOT params.calls. The card
  reconstruction reads params.calls from the draft and shows N calls,
  hiding M-N model calls that actually executed.

  Root cause: compile_calls_windows() in server.cpp compiles card-level
  calls into window prompts via local variables (tl_wins/tl_spans) that
  go out of scope. The sidecar (_flow.json) does not store the
  compiled windows. The write-back has no data to reconstruct params.calls.

INVARIANT: for every completed h3-timeline run, the draft's params.calls
  count must equal the number of window clips in the run directory.

Usage:
  python3 reconstruction_accuracy.py                    # auto-detect latest run
  python3 reconstruction_accuracy.py <run_dir>          # specific run dir
  RUN_ID=<id> python3 reconstruction_accuracy.py        # specific run id

Exit 0 = pass; exit 1 = fail.
"""
import json, os, sys, glob

# ── locate the run ──────────────────────────────────────────────────────────
BUILD = os.path.join(os.path.dirname(__file__), "../../build")
OUTPUT = os.path.join(BUILD, "output")
DRAFTS = os.path.join(BUILD, "drafts")

run_dir = None
if len(sys.argv) > 1:
    run_dir = sys.argv[1]
elif os.environ.get("RUN_ID"):
    run_dir = os.path.join(OUTPUT, os.environ["RUN_ID"])
else:
    # auto-detect: newest run dir
    runs = sorted(glob.glob(os.path.join(OUTPUT, "run-*")))
    runs = [r for r in runs if os.path.isdir(r)]
    if runs:
        run_dir = runs[-1]

if not run_dir or not os.path.isdir(run_dir):
    print("SKIP no run directory found")
    sys.exit(0)

run_id = os.path.basename(run_dir)
print(f"run: {run_id}")

# ── load card.json (immutable record of what was submitted) ──────────────────
card_path = os.path.join(run_dir, "card.json")
if not os.path.exists(card_path):
    print("SKIP no card.json")
    sys.exit(0)

card = json.load(open(card_path))
card_request = card.get("request", {})
card_calls = card_request.get("calls", [])
print(f"card.json calls: {len(card_calls)}")

# ── count window clips in run directory ──────────────────────────────────────
window_clips = sorted(glob.glob(os.path.join(run_dir, "window*_video_0.mp4")))
window_count = len(window_clips)
print(f"window clips:    {window_count}")

for f in window_clips:
    print(f"  {os.path.basename(f)} ({os.path.getsize(f)} bytes)")

# ── load draft doc (what the card reconstruction shows) ──────────────────────
draft_id = card.get("linked_draft", "")
draft_calls = []
if draft_id:
    draft_path = os.path.join(DRAFTS, f"{draft_id}.json")
    if not os.path.exists(draft_path):
        # try suffix variants
        for suffix in ["-1", "-2"]:
            alt = os.path.join(DRAFTS, f"{draft_id}{suffix}.json")
            if os.path.exists(alt):
                draft_path = alt
                break
    if os.path.exists(draft_path):
        draft = json.load(open(draft_path))
        stages = draft.get("stages", [])
        if stages:
            params = stages[0].get("params", {})
            draft_calls = params.get("calls", [])
            print(f"draft params.calls: {len(draft_calls)}")
            for i, c in enumerate(draft_calls):
                text = c.get("text", "")
                beats = c.get("beats", [])
                print(f"  [{i}]: {c.get('start_frame')}-{c.get('end_frame')} "
                      f"text={repr(text)[:50]} beats={len(beats)}")
    else:
        print(f"WARN draft {draft_id} not found")
else:
    print("WARN no linked_draft in card.json")

# ── THE CHECK ────────────────────────────────────────────────────────────────
fails = []

def check(name: str, cond: bool, detail: str = "") -> None:
    status = "PASS" if cond else "FAIL"
    msg = f"{status} {name}"
    if detail and not cond:
        msg += f" | {detail}"
    print(msg)
    if not cond:
        fails.append(name)

# Core invariant: draft calls count must match window clip count
check("reconstruction.calls_match_windows",
      len(draft_calls) == window_count,
      f"draft has {len(draft_calls)} call(s) but {window_count} window clip(s) exist")

# Secondary: card.json calls should also match (if the card was composed correctly)
# This may legitimately differ when the gateway expanded 1 call into N windows
if len(card_calls) != window_count:
    print(f"NOTE: card.json has {len(card_calls)} call(s) but {window_count} "
          f"windows were generated — the gateway expanded the calls")

# Each draft call should have a non-empty text (the actual prompt used)
calls_with_text = sum(1 for c in draft_calls if c.get("text", "").strip())
check("reconstruction.calls_have_prompts",
      calls_with_text == window_count,
      f"{calls_with_text}/{window_count} calls have non-empty prompt text")

# Frame ranges should be contiguous and cover the timeline
if draft_calls:
    sorted_calls = sorted(draft_calls, key=lambda c: c.get("start_frame", 0))
    for i in range(1, len(sorted_calls)):
        prev_end = sorted_calls[i-1].get("end_frame", 0)
        curr_start = sorted_calls[i].get("start_frame", 0)
        check(f"reconstruction.contiguous_frames_{i}",
              curr_start == prev_end,
              f"gap: call[{i-1}].end={prev_end} != call[{i}].start={curr_start}")

# ── assetUrls in result should have at least window_count + 1 entries ────────
if draft_calls:
    stages = json.load(open(os.path.join(DRAFTS, f"{draft_id}.json"))).get("stages", []) if draft_id else []
    if stages:
        result = stages[0].get("result", {})
        urls = result.get("assetUrls", [])
        check("reconstruction.asseturls_cover_windows",
              len(urls) >= window_count + 1,  # stitch + windows
              f"assetUrls has {len(urls)} entries, expected >= {window_count + 1}")

# ── summary ──────────────────────────────────────────────────────────────────
print()
if fails:
    print(f"SUITE reconstruction_accuracy: FAIL {fails}")
    sys.exit(1)
else:
    print("SUITE reconstruction_accuracy: PASS")
    sys.exit(0)

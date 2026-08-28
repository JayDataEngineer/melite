#!/usr/bin/env python3
"""Draft invariant tests for the h3-timeline action card.

SSOT: build/drafts/draft-timeline-h3.json (what the gateway's
draft_writeback rewrites and the card renders). Every regression this
suite guards was a REAL shipped bug:
  - "Expecting ',' delimiter"   -> brace/splice corruption in writeback
  - duplicate history rows      -> both history lookups hit metadata copy
  - metadata.history drift      -> render copy diverged from root history
Exit 0 = all pass; any assert failure prints FAIL and exits 1.
"""
import json, hashlib, sys, os

DRAFT = os.environ.get(
    "TL_DRAFT",
    os.path.join(os.path.dirname(__file__), "../../build/drafts/draft-timeline-h3.json"))

fails = []
def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + ((" | " + str(detail)) if detail and not cond else ""))
    if not cond:
        fails.append(name)

raw = open(DRAFT, "rb").read()
try:
    d = json.loads(raw)                       # strict: no trailing garbage
    check("draft.strict_json_parse", True)
except Exception as e:
    check("draft.strict_json_parse", False, e); print("FATAL: unparseable draft"); sys.exit(1)

hist = d.get("history", [])
ids = [r.get("runId", "") for r in hist]
check("draft.history_is_list", isinstance(hist, list) and len(hist) > 0, type(hist))
check("draft.history_no_dupes", len(ids) == len(set(ids)), ids)
ats = [r.get("at", 0) for r in hist]
check("draft.history_newest_first", all(ats[i] >= ats[i+1] for i in range(len(ats)-1)), ats)
check("draft.history_rows_have_shape",
      all({"runId", "status", "at", "durationSec", "video"} <= set(r) for r in hist))

stages = d.get("stages", [])
check("draft.has_stage_with_result", isinstance(stages, list) and
      isinstance(stages[0].get("result"), dict))
res = stages[0].get("result", {})
meta = res.get("metadata", {})
mhist = meta.get("history", [])
mids = [r.get("runId", "") for r in mhist]
check("draft.metadata_history_matches_root",
      isinstance(mhist, list) and mids == ids, f"meta={mids} root={ids}")
check("draft.metadata_marks_latent_seam", meta.get("seam") == "latent", meta.get("seam"))

arts = res.get("artifacts", {})
check("draft.artifacts_nonempty", len(arts) > 0, arts)
run_ids_in_arts = {a.split("/runs/")[1].split("/")[0] for a in arts.values()
                   if isinstance(a, str) and "/runs/" in a}
check("draft.artifacts_under_runs", len(run_ids_in_arts) > 0, arts)
check("draft.artifacts_reference_history_runs",
      run_ids_in_arts <= set(ids) or len(run_ids_in_arts & set(ids)) > 0,
      f"arts={run_ids_in_arts} hist={set(ids)}")
seams = [k for k in arts if k.startswith("seam_")]
check("draft.latent_seams_present", len(seams) >= 3, seams)

# Determinism pin: the card's beats/calls payload must not drift silently.
# If you DELIBERATELY change the fixture, update the pin in the same commit.
calls = d.get("spec", {}).get("calls") or d.get("calls") or stages[0].get("spec", {}).get("calls")
if calls is None:
    # fall back: hash the beats text inside stage spec/params if present
    calls = stages[0].get("params", {}).get("calls")
PINNED = os.environ.get("TL_CALLS_SHA", "")
if calls is not None:
    h = hashlib.sha256(json.dumps(calls, sort_keys=True).encode()).hexdigest()
    if PINNED:
        check("draft.calls_pinned", h == PINNED, f"got {h}")
    else:
        print(f"INFO calls sha256 (set TL_CALLS_SHA to pin): {h}")
else:
    print("INFO no calls found in draft; pin skipped")

print(("SUITE draft_invariants: " + ("PASS" if not fails else f"FAIL {fails}")))
sys.exit(1 if fails else 0)

#!/usr/bin/env python3
"""Live-backend node manifest check (CPU-only; talks to ComfyUI, no GPU).

THE FAIL THIS CATCHES (2026-08-30 incident):
  templates referencing classes from packs the operator EXTERMINATED
  (MiniMaxH3SaveLatent) produced registered runs that died at ComfyUI
  submit — zombie slots with half-dead sidecars. The gateway now
  pre-validates at the start door (4xx before registration); this test
  holds the SAME line in the suite so a template edit cannot regress
  the door contract even with the gateway down.

Checks EVERY workflow file referenced by ANY pipelines/*/pipeline*.yaml:
  - the file exists on disk
  - every class_type inside exists in the live /object_info
    (or in the committed snapshot when the backend is unreachable —
    SKIP-live, never silent-pass: the snapshot is what CI can prove)

Exit 0 = pass; 1 = fail.
"""
import json, os, re, sys, glob, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
SNAP = os.path.join(HERE, "live_nodes.snapshot.json")
COMFY = os.environ.get("COMFY_URL", "http://127.0.0.1:18465")

fails = []
def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + ((" | " + str(detail)) if detail and not cond else ""))
    if not cond: fails.append(name)

# ── collect workflow files + class_types from every lane yaml ──────────────
refs = set()
for yf in glob.glob(os.path.join(REPO, "pipelines", "*", "pipeline*.yaml")):
    y = open(yf).read()
    for m in re.finditer(r'workflow_file"?\s*:\s*"([^"]+)"', y):
        refs.add((os.path.basename(yf), m.group(1)))
check("lanes reference at least one workflow", len(refs) > 0, sorted(refs)[:3])

classes = {}   # class -> first (yaml, file) that references it
missing_files = []
for yname, rel in sorted(refs):
    # gateway CWD is build/: "../pipelines/x" resolves there. Also try
    # repo-root forms so the test runs from any CWD.
    cands = [os.path.normpath(os.path.join(REPO, "build", rel)),
             os.path.normpath(os.path.join(REPO, rel)),
             os.path.normpath(os.path.join(REPO, rel.replace("../", "", 1)))]
    p = next((c for c in cands if os.path.isfile(c)), None)
    if p:
        d = json.load(open(p))
        for k, v in d.items():
            if not (isinstance(v, dict) and "class_type" in v):
                missing_files.append(f"{rel}:{k} is not a node (pure-map law)")
            else:
                classes.setdefault(v["class_type"], (yname, rel))
    else:
        missing_files.append(rel)
check("all referenced workflows exist + are pure node maps", not missing_files,
      missing_files)

# ── live object_info (or snapshot fallback, loudly) ────────────────────────
live = None
try:
    with urllib.request.urlopen(COMFY + "/object_info", timeout=15) as r:
        live = json.load(r)
    check(f"live /object_info reachable ({len(live)} classes)", True)
except Exception as e:
    check(f"live /object_info reachable at {COMFY}", False,
          f"{type(e).__name__}: {e} (start ComfyUI or set COMFY_URL)")
    if not os.path.isfile(SNAP):
        print(f"FAIL no snapshot fallback at {SNAP} — cannot validate at all")
        sys.exit(1)
    live = json.load(open(SNAP))
    print(f"NOTE using committed snapshot ({len(live)} classes) — refresh "
          f"with: python3 {os.path.basename(__file__)} --snapshot")

if "--snapshot" in sys.argv and live:
    json.dump(live, open(SNAP, "w"), sort_keys=True)
    print(f"snapshot refreshed: {SNAP} ({len(live)} classes)")
    sys.exit(0)

# FAIL line: the production lane (h3-timeline, extensions.yaml
# required:true). Other lanes may simply not be deployed in this
# ComfyUI — the gateway pre-validates them per-run at the start door;
# here they are reported, not failed.
def is_prod(yname, rel):
    return "h3-timeline" in rel or "h3-timeline" in yname

dead = sorted(c for c in classes if c not in live and is_prod(*classes[c]))
check("h3-timeline classes are live in the backend", not dead,
      {c: classes[c] for c in dead})
other = sorted(c for c in classes if c not in live and not is_prod(*classes[c]))
if other:
    print(f"NOTE {len(other)} classes from undeployed lanes (door-guarded "
          f"per-run by the gateway): {other}")

print()
if fails:
    print(f"LIVE NODE MANIFEST: {len(fails)} FAILURES -> {fails}")
    sys.exit(1)
print("LIVE NODE MANIFEST: ALL PASS")

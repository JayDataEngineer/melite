#!/usr/bin/env python3
"""Cordis compose parity wall — the TS compose door vs the recorded
python-renderer goldens (tests/golden_cordis/*.json).

The Cordis plane (plugins/engines/comfyui/cordis — Law 0 amendment,
2026-09-07) builds the /prompt graph via node --experimental-strip-types.
This wall shells the CLI for every pinned case and deep-compares the
stdout graph against the golden. Refusals (unknown card, unboarded
model, bad params) assert loud + nonzero + empty stdout.

Run: python3 tests/walls/suites/test_cordis_compose.py
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
PKG = REPO / "plugins" / "engines" / "comfyui" / "cordis"
GOLDEN = REPO / "tests" / "golden_cordis"
FACTS = PKG / "data" / "model-facts.json"

PASS: list[str] = []
FAIL: list[str] = []

# Graph cases AUTO-DISCOVER from tests/golden_cordis/*.case.json —
# {"card","model","run_id","params"} beside the matching .json golden.
# A case lands by dropping two files; no shared-file edit (parallel
# port substrate).
GRAPH_CASES = []
for case_file in sorted(GOLDEN.glob("*.case.json")):
    c = json.loads(case_file.read_text())
    GRAPH_CASES.append((case_file.name[:-len(".case.json")],
                        c["card"], c["model"], c.get("run_id", "testrun"),
                        c.get("params", {})))
GENERIC_CASE = ("image_z-image_default", "image-gen", "z-image", "testrun",
                {"prompt": "a glowing koi pond at dusk, ripples catching violet light",
                 "seed": 42})
if not any(name.startswith("image_z-image") for name, *_ in GRAPH_CASES):
    GRAPH_CASES.append(GENERIC_CASE)

# (name, card, model, run_id, params, refusal_substring) — the door
# must refuse LOUD (exit != 0, message names the cause, no stdout).
REFUSAL_CASES = [
    ("refuse_unknown_card", "nope-card", "z-image", "t", {}, "unknown card"),
    # krea-2 boarded image-gen per py truth (families krea-2/z-image/anima;
    # image-gen boarding fix) — kimodo (a motion model) is the unboarded
    # stand-in so the not-boarded gate stays pinned.
    ("refuse_unboarded_model", "image-gen", "kimodo", "t", {}, "not boarded"),
    ("refuse_empty_prompt", "image-gen", "z-image", "t",
     {"prompt": "   "}, "prompt"),
    ("refuse_missing_facts_card", "image-gen", "z-image", "t",
     {"prompt": "x"}, None),  # sanity: facts path enforced below
]


def run_cli(card: str, model: str, run_id: str, params: dict,
            facts: Path = FACTS) -> subprocess.CompletedProcess:
    return subprocess.run(
        [shutil.which("node") or "node", "--experimental-strip-types",
         str(PKG / "src" / "cli.ts"), "compose",
         "--card", card, "--model", model, "--run-id", run_id,
         "--facts", str(facts),
         "--params", json.dumps(params)],
        capture_output=True, text=True, timeout=120,
        env={"PATH": "/usr/bin:/bin:/usr/local/bin",
             "NODE_OPTIONS": "--no-warnings"},
        cwd=str(REPO))


def main() -> int:
    node = shutil.which("node")
    if node is None:
        print("FAIL no node on PATH — the Cordis plane requires node >= 22.6")
        return 1

    for name, card, model, run_id, params in GRAPH_CASES:
        r = run_cli(card, model, run_id, params)
        if r.returncode != 0:
            FAIL.append(f"{name}: door exited {r.returncode}: {r.stderr.strip()[:200]}")
            continue
        try:
            got = json.loads(r.stdout)
        except ValueError as e:
            FAIL.append(f"{name}: stdout not JSON: {e}")
            continue
        want = json.loads((GOLDEN / f"{name}.json").read_text())
        if got == want:
            PASS.append(name)
        else:
            only_got = {k: v for k, v in got.items() if want.get(k) != v}
            only_want = {k: v for k, v in want.items() if got.get(k) != v}
            FAIL.append(f"{name}: graph drift\n    ts-only/diff: {json.dumps(only_got, sort_keys=True)[:180]}\n    golden-only/diff: {json.dumps(only_want, sort_keys=True)[:180]}")

    # refusal legs (skip the facts sanity — it has its own shape)
    for name, card, model, run_id, params, needle in REFUSAL_CASES[:-1]:
        r = run_cli(card, model, run_id, params)
        msg = r.stderr.lower()
        if r.returncode == 0:
            FAIL.append(f"{name}: door ACCEPTED a bad request (must refuse)")
        elif r.stdout.strip():
            FAIL.append(f"{name}: refusal printed a graph (stdout must be empty)")
        elif needle and needle not in msg:
            FAIL.append(f"{name}: refusal message does not name the cause ({needle!r}): {msg[:120]}")
        else:
            PASS.append(name)

    # missing facts file is a loud door failure, never a silent default
    r = run_cli("image-gen", "z-image", "t", {"prompt": "x"},
                facts=PKG / "data" / "does-not-exist.json")
    if r.returncode != 0 and not r.stdout.strip():
        PASS.append("refuse_missing_facts")
    else:
        FAIL.append("refuse_missing_facts: bad facts path must exit loud with no stdout")

    for p in PASS:
        print(f"  ok   {p}")
    for f in FAIL:
        print(f"  FAIL {f}")
    print(f"PASS {len(PASS)} / FAIL {len(FAIL)}")
    return 1 if FAIL else 0


if __name__ == "__main__":
    raise SystemExit(main())

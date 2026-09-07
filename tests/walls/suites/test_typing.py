#!/usr/bin/env python3
"""TYPING WALL (operator order, 2026-09-04: "you cannot silently skip
out on strongly typed code").

mypy --strict over the typed-contract surface. The TARGETS list is
the ratchet: a module joins when it is fully annotated; NOTHING ever
leaves. follow_imports=silent keeps not-yet-migrated dependencies
from blocking the wall while their imports still resolve.

Also pins the pyproject [tool.mypy] config (strict + pydantic plugin)
so it cannot be quietly loosened, and refuses a missing target file
(a deleted module is a LOUD wall failure, never a silent skip).
"""

import re
import subprocess
import sys
import tomllib
from pathlib import Path

from _anchor import REPO
PASS, FAIL = [], []


def check(name: str, ok: bool, detail: str = "") -> None:
    (PASS if ok else FAIL).append(name)
    print("  %s   %s%s" % ("ok" if ok else "FAIL", name,
                           "" if ok else ": %s" % detail))


# ── the ratchet: only grows ─────────────────────────────────────────
TARGETS = [
    # THE graph contract (compose arms ↔ gateway core)
    "py/flow_graph.py",
    # the lane-disclosure wire contract (frozen rows, fully annotated
    # at birth, 2026-09-05)
    "py/lane_wire.py",
    # THE root config schema (pydantic flip 2026-09-05)
    "py/estate_config.py",
    # (2026-09-07, render-plane retirement b324c480) the co_script
    # skeleton + h3 arm targets are deleted with the python render
    # plane; the TS plane is erasable-syntax (no mypy surface).
    # (2026-09-07, retirement b324c480) tools/workflow_transpile.py
    # deleted with the render plane (workflow->python extraction has
    # no python plane to extract for).
    # (2026-09-07, retirement b324c480) compose/presets.py deleted
    # with the render plane.
]

# ── config cannot be quietly loosened ───────────────────────────────
cfg = tomllib.loads((REPO / "pyproject.toml").read_text())
my = cfg.get("tool", {}).get("mypy", {})
check("mypy strict configured", my.get("strict") is True,
      repr(my))
check("pydantic plugin rides (construction is the gate)",
      "pydantic.mypy" in my.get("plugins", []), repr(my.get("plugins")))
check("unmigrated deps stay silent (ratchet, not roadblock)",
      my.get("follow_imports") == "silent", repr(my.get("follow_imports")))

# ── a target that vanished is a LOUD failure ────────────────────────
for t in TARGETS:
    check("target exists: %s" % t, (REPO / t).is_file(), "missing")

# ── the strict gate itself ──────────────────────────────────────────
r = subprocess.run(
    ["uv", "run", "mypy", "--strict", "--follow-imports=silent",
     "--no-error-summary", "--hide-error-context"]
    + [str(REPO / t) for t in TARGETS],
    capture_output=True, text=True, cwd=str(REPO))

errors = [ln for ln in r.stdout.splitlines()
          if re.search(r": error:", ln)]
check("mypy --strict over %d targets: 0 errors" % len(TARGETS),
      r.returncode == 0 and not errors,
      "\n    ".join(errors[:6] or [r.stdout[-300:], r.stderr[-200:]]))

print()
print("PASS %d / FAIL %d" % (len(PASS), len(FAIL)))
sys.exit(1 if FAIL else 0)

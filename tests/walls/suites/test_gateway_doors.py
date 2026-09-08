"""test_gateway_doors.py — the door gate wall (frontend ⊆ backend).

Born from the loras incident (2026-09-05): LoraPicker fetched
/v1/loras?model=… over 12 DECLARED krea-2 rows and the gateway's
route table had no such row — the picker rendered "No LoRAs
installed" while the python rows existed. No gate refused the gap
because nothing cross-checked the two sides.

The automation this wall pins:
  1. GENERATION — packages/web-kit/catalog/src/generated/gatewayDoors.ts is
     generated FROM gateway.ROUTES (tools/gen_gateway_doors.py).
     A stale generated file fails --check here.
  2. THE COMPILE GATE — apiFetch/apiJson accept ONLY
     FetchUrl = GatewayDoorUrl | ExternalUrl. There is NO unserved
     escape: a call site naming a door the gateway does not serve is
     a compile error (operator order 2026-09-05: "NO MORE DEBT.
     KILL KILL. NO FALLBACK. NO LEGACY SHIMS"). This wall RUNS tsc
     on the editor app, so the type error is a wall failure even if
     nobody typechecks locally. The unservedDoors.ts debt ledger and
     its unservedDoor() escape lived for one hour and died in the
     same stroke that deleted the 25 dead surfaces.

Run: pytest tests/walls/suites/test_gateway_doors.py
"""

import os
import re
import subprocess
import sys

from _anchor import REPO


def _served() -> tuple[set[str], set[str]]:
    """(literal doors, regex stems). A literal row serves ONLY itself
    (+query); a regex row serves its stem's tails."""
    sys.path.insert(0, str(REPO / "python"))
    import gateway
    literals, regex_stems = set(), set()
    for row in gateway.ROUTES:
        if row.regex:
            regex_stems.add(row.path.lstrip("^").split("(")[0].rstrip("/"))
        else:
            literals.add(row.path.rstrip("/"))
    return literals, regex_stems


def test_generated_doors_are_fresh() -> None:
    r = subprocess.run(
        [sys.executable, str(REPO / "tools" / "gen_gateway_doors.py"),
         "--check"], capture_output=True, text=True, cwd=str(REPO))
    assert r.returncode == 0, (
        "gatewayDoors.ts is stale vs the ROUTES table — run "
        "tools/gen_gateway_doors.py\n%s" % r.stdout)


def test_the_frontend_compiles_against_the_door_gate() -> None:
    """tsc IS the gate: every apiFetch/apiJson call site must satisfy
    FetchUrl. Unserved doors compile ONLY through unservedDoor(…)."""
    editor = REPO / "packages" / "web" / "editor"
    tsc = editor / "node_modules" / ".bin" / "tsc"
    if not tsc.exists():
        import pytest
        pytest.skip("editor toolchain not installed")
    r = subprocess.run(
        [str(tsc), "--noEmit", "-p", "tsconfig.app.json"],
        cwd=str(editor), capture_output=True, text=True)
    assert r.returncode == 0, (
        "the editor fails the door gate — a fetch call site names a "
        "door the gateway does not serve (build the door, register the "
        "debt in unservedDoors.ts, or delete the dead call "
        "site):\n%s" % r.stdout[-4000:])

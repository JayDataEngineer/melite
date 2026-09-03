"""THE WALLS UNDER PYTEST (operator order, 2026-09-04).

The script-style suites stay script-style — their check() discipline,
their exit codes, their stdout IS the contract (a rewrite would be a
rewrite of the walls themselves). pytest wraps each as a subprocess
and asserts the exit code: one suite, one test, one code.

Run the whole estate:
    uv run pytest                     # walls (fast, no GPU)
    uv run pytest -m gpu              # real inference (integration/)

A suite that is broken at HEAD by ANOTHER lane's drift (the object_info
pin / extension consolidation, concurrent committer) is listed in
KNOWN_DRIFT with the reason — it returns to WALLS the moment its owner
lands the fix; it can never be silently dropped.
"""

import subprocess
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
VENV_PY = REPO / ".venv" / "bin" / "python"

# every wall suite, in estate order
WALLS = [
    "tests/test_python_cards.py",
    "tests/test_card_structure.py",
    "tests/test_http_parity.py",
    "tests/test_py_gateway.py",
    "tests/test_python_models.py",
    "tests/test_provision.py",
    "tests/test_typing.py",
    "tests/test_workflow_transpile.py",
    "tests/test_doc_parity.py",
    "tests/golden_compose/_runner.py",
]

# broken at HEAD by the object_info pin / h3-motion consolidation
# drift (reproduces with the tree stashed — NOT this lane's files).
# Cited here so the debt stays visible; remove when the pin lands.
KNOWN_DRIFT = {
    "tests/test_co_script.py":
        "pin lost 'easy saveText'/'LTX_lora_loader' (object_info "
        "refresh vs declarations) — concurrent committer lane",
    "tests/test_card_requires.py":
        "video-gen declares ComfyUI-H3-Motion-Context-MultiRef / "
        "melite-video, not installed live — consolidation lane",
}


@pytest.mark.parametrize("suite", WALLS, ids=lambda s: s.split("/")[-1])
def test_wall_suite(suite):
    proc = subprocess.run(
        [str(VENV_PY), str(REPO / suite)],
        capture_output=True, text=True, timeout=1200, cwd=str(REPO))
    assert proc.returncode == 0, (
        "%s FAILED\n%s\n%s" % (suite, proc.stdout[-2000:],
                               proc.stderr[-2000:]))


@pytest.mark.parametrize("suite", sorted(KNOWN_DRIFT),
                         ids=lambda s: s.split("/")[-1])
def test_wall_suite_known_drift(suite):
    """Documented debt: the suite is expected red at HEAD for reasons
    OUTSIDE this lane. The test asserts the drift reason is still the
    live one (the suite still fails) — the day it passes, the entry
    moves to WALLS or the reason was wrong all along."""
    proc = subprocess.run(
        [str(VENV_PY), str(REPO / suite)],
        capture_output=True, text=True, timeout=1200, cwd=str(REPO))
    if proc.returncode == 0:
        pytest.fail(
            "%s passes at HEAD — move it into WALLS; KNOWN_DRIFT "
            "entry is stale" % suite)
    print("known drift (%s): %s" % (suite, KNOWN_DRIFT[suite]))

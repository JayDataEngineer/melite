"""THE WALLS UNDER PYTEST (operator order, 2026-09-04).

The script-style suites stay script-style — their check() discipline,
their exit codes, their stdout IS the contract (a rewrite would be a
rewrite of the walls themselves). pytest wraps each as a subprocess
and asserts the exit code: one suite, one test, one code.

Converted suites (test_artifact_routing, test_studio_slots, etc.)
run as native pytest tests — their check() calls became assert
statements and pytest collects them directly.

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

# Suites that are NOT yet converted to native pytest — they run as
# subprocesses. Converted suites (test_artifact_routing, test_studio_slots,
# test_plugin_freshness, test_card_structure, test_py_gateway,
# test_provision, test_form_defaults, test_web_family) are collected
# by pytest directly from suites/ and are NOT listed here.
SUBPROCESS_WALLS = [
    "tests/walls/suites/test_python_cards.py",
    "tests/walls/suites/test_python_models.py",
    "tests/walls/suites/test_typing.py",
    "tests/walls/suites/test_workflow_transpile.py",
    "tests/walls/suites/test_doc_parity.py",
    "tests/walls/suites/test_h3_renderer_parity.py",
    "tests/walls/suites/test_streaming.py",
    "tests/walls/suites/test_models_on_second_drive.py",
    "tests/golden_compose/_runner.py",
    # unittest-style suites — pytest collects them but they also work
    # as subprocess walls; listed here for the subprocess harness
    "tests/walls/suites/test_cpp_engines.py",
    "tests/walls/suites/test_browser_lanes.py",
    "tests/walls/suites/test_card_pattern_wall.py",
    "tests/walls/suites/test_gpu_cpp_cards.py",
    "tests/walls/suites/test_web_harness_pages.py",
    "tests/walls/suites/test_wire_surface.py",
]

# broken at HEAD by the object_info pin / h3-motion consolidation
# drift (reproduces with the tree stashed — NOT this lane's files).
# Cited here so the debt stays visible; remove when the pin lands.
KNOWN_DRIFT = {
    "tests/walls/suites/test_co_script.py":
        "pin lost 'easy saveText'/'LTX_lora_loader' (object_info "
        "refresh vs declarations) — concurrent committer lane",
    "tests/walls/suites/test_card_requires.py":
        "video-gen declares ComfyUI-H3-Motion-Context-MultiRef / "
        "melite-video, not installed live — consolidation lane",
    # 2026-09-04: verified pre-existing — a byte-identical copy at the
    # pre-migration path with the pre-migration anchor fails with the
    # same five drifts. The migration changed nothing here.
    "tests/walls/suites/test_http_parity.py":
        "wire drift vs the goldens from the concurrent audio-cpp "
        "consolidation + anny lanes (/v1/tools 13->10, music3 "
        "defaults.backend, anny capabilities/forms, runs contract) — "
        "the owning lane bumps the goldens deliberately (C "
        "RETIREMENT: the goldens ARE the contract)",
}


def _run_suite(suite: str) -> subprocess.CompletedProcess[str]:
    """Run a wall suite as a subprocess and return the result."""
    return subprocess.run(
        [str(VENV_PY), str(REPO / suite)],
        capture_output=True, text=True, timeout=1200, cwd=str(REPO),
    )


def _suite_id(suite: str) -> str:
    """Extract the test name from a suite path for pytest reporting."""
    return Path(suite).stem


@pytest.mark.parametrize("suite", SUBPROCESS_WALLS, ids=_suite_id)
def test_wall_suite(suite):
    proc = _run_suite(suite)
    assert proc.returncode == 0, (
        "%s FAILED\n%s\n%s" % (suite, proc.stdout[-2000:],
                               proc.stderr[-2000:]))


@pytest.mark.parametrize("suite", sorted(KNOWN_DRIFT), ids=_suite_id)
def test_wall_suite_known_drift(suite):
    """Documented debt: the suite is expected red at HEAD for reasons
    OUTSIDE this lane. The test asserts the drift reason is still the
    live one (the suite still fails) — the day it passes, the entry
    moves to WALLS or the reason was wrong all along."""
    proc = _run_suite(suite)
    if proc.returncode == 0:
        pytest.fail(
            "%s passes at HEAD — move it into WALLS; KNOWN_DRIFT "
            "entry is stale" % suite)
    print("known drift (%s): %s" % (suite, KNOWN_DRIFT[suite]))

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
VENV_PY = REPO / "infra" / "python" / ".venv" / "bin" / "python"

# Suites that are NOT yet converted to native pytest — they run as
# subprocesses. Converted suites (test_artifact_routing, test_studio_slots,
# test_plugin_freshness, test_card_structure, test_py_gateway,
# test_provision, test_form_defaults, test_web_family) are collected
# by pytest directly from suites/ and are NOT listed here.
SUBPROCESS_WALLS = [
    "tests/walls/suites/test_python_models.py",
    "tests/walls/suites/test_typing.py",
    "tests/walls/suites/test_workflow_transpile.py",
    "tests/walls/suites/test_streaming.py",
    "tests/walls/suites/test_wire_surface.py",
    "tests/walls/suites/test_models_on_second_drive.py",
    # (2026-09-07) RETIRED from this list, tombstoned with the python
    # render plane (commit b324c480): test_python_cards.py,
    # test_doc_parity.py, test_h3_renderer_parity.py,
    # test_co_script.py, tests/golden_compose/_runner.py — the
    # subject lives in the Cordis TS plane, walled by
    # tests/walls/suites/test_cordis_compose.py.
    # unittest-style suites — pytest collects them but they also work
    # as subprocess walls; listed here for the subprocess harness
    "tests/walls/suites/test_cpp_engines.py",
    "tests/walls/suites/test_card_pattern_wall.py",
    "tests/walls/suites/test_web_harness_pages.py",
    "tests/walls/suites/test_card_requires.py",
    # recovered 2026-09-05 from KNOWN_DRIFT — deliberate golden bumps
    # from the scratch gateway + runs-count invariant corrected to >=
    "tests/walls/suites/test_http_parity.py",
    # NOT here (2026-09-04 flows-rework validation):
    # - test_browser_lanes.py — boots a throwaway vite + chromium (its
    #   own live-browser infra; hangs the subprocess wall). Run it via
    #   its script form; see suites/conftest.py.
    # - test_gpu_cpp_cards.py — LIVE operator-gateway runs (GPU money).
    #   pytest-marked `gpu` (deselected in fast collection); the
    #   subprocess path would bypass the marker and burn GPU in CI.
    # wired 2026-09-05 (extraction stroke): the cpp lane's new
    # script-style suite landed WITHOUT its collect-ignore entry and
    # broke full-run collection (sys.exit at import). Green
    # standalone (20/20) so it rides the subprocess wall, not the
    # ignore void — owner converts or owns it from here.
    "tests/walls/suites/test_cpp_native_cards.py",
    # wired 2026-09-08 (purge S-facts): the hand-owned facts freeze
    # wall — script-style like its neighbors (runs the registry
    # dumper; green standalone 13/13).
    "tests/walls/suites/test_model_facts_frozen.py",
]

# Suites that are broken at HEAD by drift OUTSIDE this lane. Each
# entry maps suite → reason (the live cause, not a fossil one).
KNOWN_DRIFT: dict[str, str] = {
    # (2026-09-05) test_python_cards.py RECOVERED and moved into
    # SUBPROCESS_WALLS: its real break was a fossil spec-load of
    # engines/audio/compose.py (dead since the compose reorg) — now
    # reached through the plugins loader. 117/117 checks green at
    # HEAD.
    #
    # (2026-09-05) test_h3_renderer_parity.py RECOVERED: the hand-
    # written window templates retired FOR GOOD (dcfa4c7 — comfy-
    # script authoring supersedes them per operator); the suite was
    # REHOMED onto recorded-renderer-output parity (suites/golden_h3/
    # recordings, H3_PARITY_REGEN regen door) and moved into
    # SUBPROCESS_WALLS. 9/9 checks green at HEAD.
    #
    # (2026-09-05) test_co_script.py RECOVERED: the pin IS live truth
    # — the managed :18466 serves exactly 1310 nodes (easy-use pack
    # gone, post-consolidation estate); the suite's orphan probe
    # moved to the pin-present SaveImage node and the >3000 floor
    # became >1200. 16/16 checks green; moved into SUBPROCESS_WALLS.
    #
    # (2026-09-05) test_card_requires.py RECOVERED: T3/T6 names were
    # stale test vocabulary — the declaration set is the h3-timeline
    # card's requires (base pack comfyui-h3-motion-context, no
    # 'melite-video' card require; the video-gen card declares none).
    # 9/9 checks green; moved into SUBPROCESS_WALLS.
    #
    # (2026-09-05) test_http_parity.py RECOVERED: deliberate golden
    # bumps from the scratch gateway (C RETIREMENT: the goldens ARE
    # the contract) — anny capabilities/forms, form-spec contract
    # keys, kinds 7->8 (card-compose), tools 10->14 — plus the
    # runs-count invariant corrected to >= per
    # run_wire.RunsEnvelope's declared C contract (count = total
    # pre-limit). 24/24 checks green; moved into SUBPROCESS_WALLS.
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
def test_wall_suite(suite: str) -> None:
    proc = _run_suite(suite)
    assert proc.returncode == 0, (
        "%s FAILED\n%s\n%s" % (suite, proc.stdout[-2000:],
                               proc.stderr[-2000:]))


@pytest.mark.parametrize("suite", sorted(KNOWN_DRIFT), ids=_suite_id)
def test_wall_suite_known_drift(suite: str) -> None:
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

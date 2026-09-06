"""test_test_hygiene.py — TESTING CLEANS UP AFTER ITSELF (operator order).

The estate's live state (data/runs/drafts, data/runs/output) is the
operator's media sidebar and cards feed — not a test scratchpad.
History: the lifecycle suite minted one draft + one run per pass and
never deleted them (170 card-link drafts, 284 runs); the GPU smoke
suites left every probe run behind. The sweep deleted ~500 artifacts
by hand. This wall makes recurrence fail at ladder time:

  * no draft whose intent is a known test marker may exist
  * no run dir whose sidecar/request carries a known test prompt
    may exist

The markers are the EXACT strings the suites emit — a suite that
changes its markers updates MARKERS below in the same stroke (never
silently). Suites that create live state MUST delete exactly what
they create (try/finally, teardown_method, tearDownModule — see
test_run_lifecycle, test_gpu_smoke, test_gpu_cpp_cards,
test_skintensors_card). A leftover here names the suite that leaked.

Run: pytest tests/walls/suites/test_test_hygiene.py -v
"""
from __future__ import annotations

import json
import os
from pathlib import Path

from _anchor import REPO

DRAFTS_ROOT = REPO / "data" / "runs" / "drafts"
OUT_ROOT = REPO / "data" / "runs" / "output"

# Exact test-issued strings. A suite emitting a NEW marker registers
# it here in the same stroke that introduces it.
TEST_DRAFT_INTENTS = frozenset({
    "lifecycle test card-link",
    "smoke test card \u2014 a red cube on white",
    "gpu smoke test of the card-anchored renderer",
    "test draft for click-contract",
    "end-to-end click-contract test",
})
TEST_RUN_MARKERS = (
    "lifecycle card-link",
    "test lifecycle: a small gray cube",
)


def _draft_intent(path: Path) -> str | None:
    try:
        doc = json.loads(path.read_text(encoding="utf-8",
                                        errors="replace"))
    except (OSError, ValueError):
        return None
    return doc.get("intent") if isinstance(doc, dict) else None


def _run_has_test_marker(run_dir: Path) -> str | None:
    for probe in (run_dir / "_flow.json", run_dir / "_request.json"):
        try:
            text = probe.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for marker in TEST_RUN_MARKERS:
            if marker in text:
                return marker
    return None


def test_no_test_drafts_linger() -> None:
    """No draft with a test intent may survive a suite."""
    if not DRAFTS_ROOT.is_dir():
        return
    leaked = sorted(
        p.name for p in DRAFTS_ROOT.glob("*.json")
        if _draft_intent(p) in TEST_DRAFT_INTENTS)
    assert not leaked, (
        "test suites leaked %d draft(s) into the live drafts feed: %s. "
        "The suite that minted them must delete them "
        "(teardown_method/tearDownModule/finally) — testing cleans "
        "up after itself." % (len(leaked), leaked[:10]))


def test_no_test_runs_linger() -> None:
    """No run dir carrying a test prompt may survive a suite."""
    if not OUT_ROOT.is_dir():
        return
    leaked = []
    for entry in sorted(OUT_ROOT.iterdir()):
        if not (entry.is_dir() and entry.name.startswith("run-")):
            continue
        marker = _run_has_test_marker(entry)
        if marker is not None:
            leaked.append("%s (marker %r)" % (entry.name, marker))
    assert not leaked, (
        "test suites leaked %d run dir(s) into the live output pool: "
        "%s. The suite that started them must rmtree them "
        "(teardown_method/tearDownModule/finally) — testing cleans "
        "up after itself." % (len(leaked), leaked[:10]))


def test_hygiene_markers_cover_live_suites() -> None:
    """Every live-state-creating suite's marker is registered above.

    The fossil guard: if a suite stops emitting its marker (renamed
    prompt/intent), the wall goes blind — this test greps the suite
    sources for the registered markers so a rename fails HERE, not
    as silent litter."""
    suites = REPO / "tests" / "walls" / "suites"
    haystacks = [
        (suites / "test_run_lifecycle.py").read_text(encoding="utf-8"),
    ]
    for marker in ("lifecycle test card-link", "lifecycle card-link",
                   "test lifecycle: a small gray cube"):
        assert any(marker in hay for hay in haystacks), (
            "hygiene marker %r no longer emitted by any live suite — "
            "either the suite was deleted (delete the marker too) or "
            "it was renamed (register the new marker)." % marker)

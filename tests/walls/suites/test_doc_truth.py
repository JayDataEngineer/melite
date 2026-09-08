"""test_doc_truth.py — the R0 behavioral doc-truth wall (row 0 remainder).

Stroke 1 reconciled six docs to the code by hand
(docs/design/production-architecture-review.md: STROKE 1 PAID);
this wall pins the reconciliation so the memory cannot re-lie.
Every pin names its doc section; a failing pin means the DOC or the
CODE moved and the other must follow in the SAME stroke — never a
silent doc edit, never a silent behavior change.

ORACLE DEATH 2026-09-08 (operator order verbatim: "we do not need
parity, we need to migrate, not keep the old machinery"): the py
serving oracle died, so every leg that unit-drove it (the Run
dataclass, the Gateway registry, the in-process WS door, the
shutdown shape, the card bridge) is RETIRED WITH CAUSE below —
each names the TS surface that covers it now. The behavioral
needles that moved to the TS plane read TS source
(packages/gateway-doors/src/** + packages/gateway-core/src/** +
packages/queue/src/** + packages/engines/comfyui/src/**) instead; the doc-hygiene legs (flows.md
honesty, agent-lane teachings) never touched the oracle and stay.

Pinned (all offline, no GPU, no gateway boot):
  A. run-registry.md — RETIRED (py Run/Gateway serving shape; the
     TS run record lives in queue.ts sidecarDoc + the runs doors,
     walled by tests/walls/suites/test_gateway_e2e_tsboot.py).
  B. sidecar.md — TS needles: no boot_recover_queue anywhere in
     python/; bootSweep/bootResurrect exported from the TS queue
     core; queued_lost + never-executed settle text in queue.ts;
     atomicWriteJson round-trips tmp+rename via the node driver;
     sidecarDoc carries draft_id.
  C. ws-mcp.md — the two WS templates read from the authored
     routes.ts (string-aware, no gateway import); the live-door
     behavior legs are RETIRED (py serving; the TS WS door stays
     walled by tests/walls/suites/test_gateway_streaming_tsboot.py).
  D. shutdown.md + gpu-fifo.md — the py needle legs are RETIRED
     (py serving); the TS queue carries the run.queued /
     run.resurrected ledger rows + the 50 ms worker poll (needles
     below).
  E. flows.md — the run-wiring overlay is still not behavior
     (no syncInlineFlow symbol; the DESIGN marker stays).
  F. card-stage-typing.md — the lane file exists (the py bridge
     half is RETIRED with cause below).
  G. teachings honesty — agent-lane docs teach only live doors.

Date: 2026-09-08. Status: landed (oracle-death re-derivation).
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

from _anchor import REPO

QUEUE_TS = REPO / "packages" / "queue" / "src" / "queue" / "queue.ts"
RESURRECT_TS = (REPO / "packages" / "queue" / "src" / "queue"
                / "resurrect.ts")
ROUTES_TS = REPO / "packages" / "gateway-core" / "src" / "routes.ts"
_FLOWS_MD = REPO / "docs" / "queue" / "flows.md"


def _ts_source(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _py_tree_hits(needle: str) -> list[str]:
    """Relative python/ files whose text contains needle (no caches)."""
    hits: list[str] = []
    for p in sorted((REPO / "infra" / "python").rglob("*.py")):
        if "__pycache__" in p.parts:
            continue
        if needle in p.read_text(encoding="utf-8", errors="replace"):
            hits.append(str(p.relative_to(REPO)))
    return hits


def _node_eval(driver: str) -> object:
    r = subprocess.run(
        ["node", "--experimental-strip-types", "--no-warnings",
         "--input-type=module", "-e", driver],
        capture_output=True, text=True, timeout=120, cwd=str(REPO))
    assert r.returncode == 0, "TS driver failed:\n%s" % r.stderr[-1000:]
    return json.loads(r.stdout)


# ── A. run-registry.md: RETIRED ───────────────────────────────────
# The four legs below unit-drove the py oracle's serving shape (the
# Run dataclass, the Gateway runs/order/active registry, the 50 ms
# asyncio worker). That shape died with the oracle; the TS plane
# owns its own run record (queue.ts sidecarDoc: run_id, status,
# stages, draft_id + the runs doors), walled TS-ONLY by
# tests/walls/suites/test_gateway_e2e_tsboot.py (D-phase terminal
# golden + S-phase replay + R-phase resurrect). The worker poll
# needle that DID move to TS is pinned in section D.


# ── B. sidecar.md: sweep, atomicity, draft linkage ──────────────────

def test_no_resurrection_pass_anywhere_in_py() -> None:
    """sidecar.md: the C-era boot_recover_queue never existed — the
    resurrection is bootSweep/bootResurrect, exported from the TS
    queue core now (queue.ts + the resurrect.ts compat seam)."""
    assert _py_tree_hits("boot_recover_queue") == []
    src = _ts_source(QUEUE_TS)
    assert "export function bootSweep" in src
    assert "bootResurrect" in _ts_source(RESURRECT_TS)


def test_boot_sweep_settles_with_queued_lost() -> None:
    """sidecar.md: queued runs never executed read queued_lost, never crashed."""
    src = _ts_source(QUEUE_TS)
    assert "queued_lost" in src
    assert "never executed" in src


def test_atomic_write_round_trip(tmp_path: Path) -> None:
    """sidecar.md: one tmp+rename function — content lands, no leftovers."""
    target = tmp_path / "w.json"
    out = _node_eval(
        "import('./packages/queue/src/queue/queue.ts').then(async m => {"
        " const {writeFileSync, readdirSync, readFileSync} = await import('node:fs');"
        " m.atomicWriteJson(%s, {a: 1});"
        " console.log(JSON.stringify({"
        "  body: JSON.parse(readFileSync(%s, 'utf8')),"
        "  tmps: readdirSync(%s).filter(f => f.endsWith('.tmp'))})); })"
        % (json.dumps(str(target)), json.dumps(str(target)),
           json.dumps(str(tmp_path))))
    assert isinstance(out, dict)
    assert out["body"] == {"a": 1}, out
    assert out["tmps"] == [], out


def test_sidecar_writer_carries_draft_id() -> None:
    """sidecar.md + CARD BIRTH LAW: a sidecar without draft_id is unbornable."""
    src = _ts_source(QUEUE_TS)
    at = src.find("export function sidecarDoc")
    assert at != -1, "sidecarDoc missing from the TS queue core"
    window = src[at:at + 1500]
    assert "draft_id" in window, "sidecarDoc lost its draft_id"


# ── C. ws-mcp.md: the two WS doors, no ghosts ───────────────────────

def _routes_text() -> str:
    text = _ts_source(ROUTES_TS)
    anchor = text.index("export const ROUTES")
    return text[anchor:]


def test_ws_surface_matches_doc() -> None:
    """ws-mcp.md: two native WS routes in the authored table; the
    SSE/MCP doors never existed. String-aware read (same rigid-row
    shape the routes-mirror wall owns) — no gateway import."""
    text = _routes_text()
    assert 'template: "/v1/flows/events/{run_id}"' in text
    assert 'template: "/v1/flows/events?run_id={run_id}"' in text
    for ghost in ("/v1/events", "/mcp/sse", "/mcp/messages"):
        assert ghost not in text, ghost


# The live-door behavior legs (bare-events estate feed, unknown-run
# frame) unit-drove the py oracle's _ws_starlette in-process. That
# serving shape died with the oracle; the TS WS door (hello
# snapshot + stamped frames + unknown frame) stays walled TS-ONLY
# by tests/walls/suites/test_gateway_streaming_tsboot.py.


# ── D. shutdown.md + gpu-fifo.md: TS needles ────────────────────────

def test_durable_queue_truth() -> None:
    """gpu-fifo.md (R3): registration records run.queued; a restart
    resurrects run.resurrected rows; the sweep shields live ids."""
    run_src = (REPO / "packages" / "gateway-doors" / "src" / "doors"
               / "flowsRun.ts").read_text(encoding="utf-8")
    assert "run.queued" in run_src
    src = _ts_source(QUEUE_TS)
    assert "run.resurrected" in src
    assert "liveRunIds" in src


def test_worker_polls_fifty_ms() -> None:
    """gpu-fifo.md: order list + polling worker — the TS core polls
    every 50 ms (WORKER_POLL_MS, the py asyncio.sleep(0.05)
    transplant)."""
    src = _ts_source(QUEUE_TS)
    assert "WORKER_POLL_MS" in src
    assert "50 ms" in src


# The py shutdown-shape leg (signal handler, server.stop ledger,
# os._exit(0)) unit-read the py oracle's serving process. That
# shape died with the oracle and has no TS twin with the same
# contract (the TS plane shuts down through its own bounded
# processShutdown core); shutdown.md narrates the retired stack
# and is untouched by this lane (docs/ is out of scope).


# ── E. flows.md honesty ─────────────────────────────────────────────

def test_run_wiring_overlay_is_still_not_behavior() -> None:
    """flows.md marks run-wiring DESIGN — the overlay must not exist as code."""
    assert _py_tree_hits("syncInlineFlow") == []
    assert "NOT yet behavior" in _FLOWS_MD.read_text(encoding="utf-8")


# ── F. card-stage-typing.md ──────────────────────────────────────────

def test_first_card_lane_and_bridge() -> None:
    """card-stage-typing.md: the first production card= lane exists
    (flows/music-native/flow.py). The py _card_bridge half of this
    leg died with the oracle (no TS twin under that contract);
    the lane file is the keeper half that stays."""
    assert (REPO / "flows" / "music-native" / "flow.py").is_file()


# ── G. teachings honesty (2026-09-07 review H3/H4) ──────────────────

# The agent-facing lane docs (flows/**/SKILL.md, AGENTS.md, *.py) are
# the headless product's front door. Teaching a retired door, the
# forbidden :18090 port, or the deleted inference_cli binary as a LIVE
# ritual is drift with extra authority — an agent following it fails
# at every step. Lines naming a thing AS retired/deleted (deliberate
# dead provenance) pass; anything else fails.
_FORBIDDEN_TEACHINGS: tuple[tuple[str, str], ...] = (
    ('"yaml":', "the {yaml:} door retired 2026-09-04"),
    ("'yaml':", "the {yaml:} door retired 2026-09-04"),
    ("/v1/flows/yaml", "the /v1/flows/yaml/* door family is dead"),
    (":18090", "the retired port — nothing may serve there"),
    ("localhost:18090", "the retired port — nothing may serve there"),
    ("inference_cli", "the C binary is deleted (C retirement)"),
)
_PROVENANCE_WORDS = ("RETIRED", "retired", "deleted", "forbidden",
                     "gone with", "never the retired")


def test_agent_lane_docs_teach_only_live_doors() -> None:
    offenders: list[str] = []
    for p in sorted((REPO / "flows").rglob("*")):
        if p.suffix not in (".md", ".py") or not p.is_file():
            continue
        for i, line in enumerate(
                p.read_text(encoding="utf-8", errors="replace")
                .splitlines(), 1):
            if any(w in line for w in _PROVENANCE_WORDS):
                continue  # deliberate dead provenance
            for needle, why in _FORBIDDEN_TEACHINGS:
                if needle in line:
                    offenders.append("%s:%d %s (%s)"
                                     % (p.relative_to(REPO), i, needle, why))
    assert offenders == [], (
        "agent-facing lane docs teaching extinct rituals:\n  "
        + "\n  ".join(offenders))


def test_no_gateway_oracle_import() -> None:
    """Oracle-death hygiene: this wall survives the oracle's deletion
    — no import may reach for the retired serving module."""
    text = Path(__file__).read_text(encoding="utf-8")
    # (needles split so this file's own hygiene leg doesn't cite the
    # dead shapes it refuses — LAW TEXT HYGIENE's mirror.)
    assert "import " + "gateway" not in text, "py oracle import resurrected"
    assert "python/" + "gateway.py" not in text, "dead oracle path cited"

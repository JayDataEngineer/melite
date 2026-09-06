"""test_doc_truth.py — the R0 behavioral doc-truth wall (row 0 remainder).

Stroke 1 reconciled six docs to the code by hand
(docs/design/production-architecture-review.md: STROKE 1 PAID);
this wall pins the reconciliation so the memory cannot re-lie.
Every pin names its doc section; a failing pin means the DOC or the
CODE moved and the other must follow in the SAME stroke — never a
silent doc edit, never a silent behavior change.

Pinned (all offline, no GPU, no gateway boot):
  A. run-registry.md — Run requires draft_id, carries skipped_stages,
     has no ticket fields; Gateway owns runs/order/active; the worker
     polls 50 ms with no ticket machinery.
  B. sidecar.md — no boot_recover_queue anywhere in py/; boot_sweep
     settles with queued_lost + a never-executed note; atomic_write
     is tmp+rename (behavioral); the sidecar writer carries draft_id.
  C. ws-mcp.md — both WS routes registered, no SSE/MCP ghost routes;
     a bare /v1/flows/events connect OPENS the "*" estate feed
     (R2 fan-out, 2026-09-06: hello snapshot + stamped frames —
     behavioral); an unknown run id yields one unknown frame
     (behavioral).
  D. shutdown.md — shutdown() shape: signal handler, server.stop
     ledger, os._exit(0).
  E. flows.md — the run-wiring overlay is still not behavior
     (no syncInlineFlow symbol; the DESIGN marker stays).
  F. card-stage-typing.md — the lattice is load-bearing: the worker
     card bridge + the first production card= lane exist.
"""

from __future__ import annotations

import dataclasses
import inspect
import json
import sys
from inspect import Parameter
from pathlib import Path

import pytest
from starlette.applications import Starlette
from starlette.routing import WebSocketRoute as WSRoute
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from _anchor import REPO

sys.path.insert(0, str(REPO / "py"))

import gateway as gw_mod  # noqa: E402

_GW_SRC = REPO / "py" / "gateway.py"
_FLOWS_MD = REPO / "docs" / "queue" / "flows.md"


def _gw_source() -> str:
    return _GW_SRC.read_text(encoding="utf-8")


def _py_tree_hits(needle: str) -> list[str]:
    """Relative py/ files whose text contains needle (no caches)."""
    hits: list[str] = []
    for p in sorted((REPO / "py").rglob("*.py")):
        if "__pycache__" in p.parts:
            continue
        if needle in p.read_text(encoding="utf-8", errors="replace"):
            hits.append(str(p.relative_to(REPO)))
    return hits


# ── A. run-registry.md: the Run dataclass ─────────────────────────────

def test_run_requires_draft_id_at_construction() -> None:
    """run-registry.md: draft_id REQUIRED — a Run without one is unbuildable."""
    params = inspect.signature(gw_mod.Run).parameters
    assert params["draft_id"].default is Parameter.empty
    with pytest.raises(TypeError):
        gw_mod.Run(run_id="r", graph=None, request={})  # noqa: E501


def test_run_carries_no_ticket_fields() -> None:
    """run-registry.md: the C-era RunRecord (ticket/th_done) never existed here."""
    names = {f.name for f in dataclasses.fields(gw_mod.Run)}
    assert {"run_id", "draft_id", "skipped_stages", "status", "error",
            "stages", "artifacts", "stop_event", "created_at",
            "out_root"} <= names
    assert not (names & {"ticket", "th_done", "has_ticket"})


def test_gateway_registry_shape() -> None:
    """run-registry.md: runs dict + order list + one active, RAM-only."""
    gw = gw_mod.Gateway()
    assert gw.runs == {} and gw.order == [] and gw.active is None


def test_worker_polls_fifty_ms_with_no_ticket_machinery() -> None:
    """gpu-fifo.md: order list + polling worker — no gate, no tickets."""
    src = _gw_source()
    assert "asyncio.sleep(0.05)" in src
    for ghost in ("_Gate", "wait_turn", "g_gpu_mu"):
        assert ghost not in src, ghost


# ── B. sidecar.md: sweep, atomicity, draft linkage ─────────────────────

def test_no_resurrection_pass_anywhere_in_py() -> None:
    """sidecar.md: the C-era boot_recover_queue never existed — the
    REAL resurrection (R3, 2026-09-06) is boot_resurrect, its own
    honest name; the sweep shields resurrected ids."""
    assert _py_tree_hits("boot_recover_queue") == []
    assert callable(gw_mod.boot_sweep)
    assert callable(gw_mod.boot_resurrect)


def test_boot_sweep_settles_with_queued_lost() -> None:
    """sidecar.md: queued runs never executed read queued_lost, never crashed."""
    src = _gw_source()
    assert "queued_lost" in src
    assert "never executed" in src


def test_atomic_write_round_trip(tmp_path: Path) -> None:
    """sidecar.md: one tmp+rename function — content lands, no leftovers."""
    target = tmp_path / "w.json"
    gw_mod.atomic_write(target, {"a": 1})
    assert json.loads(target.read_text(encoding="utf-8")) == {"a": 1}
    assert list(tmp_path.glob("*.tmp")) == []


def test_sidecar_writer_carries_draft_id() -> None:
    """sidecar.md + CARD BIRTH LAW: a sidecar without draft_id is unbornable."""
    assert '"draft_id"' in inspect.getsource(gw_mod.sidecar)


# ── C. ws-mcp.md: the two WS doors, no ghosts ──────────────────────────

def test_ws_surface_matches_doc() -> None:
    """ws-mcp.md: two native WS routes; the SSE/MCP doors never existed."""
    templates = {r.template or r.path for r in gw_mod.ROUTES if r.ws}
    assert "/v1/flows/events/{run_id}" in templates
    assert "/v1/flows/events?run_id={run_id}" in templates  # query form
    paths = {r.template or r.path for r in gw_mod.ROUTES}
    assert not (paths & {"/v1/events", "/mcp/sse", "/mcp/messages"})


def _ws_client() -> TestClient:
    """The events door exactly as main() wires it, scratch gateway."""
    app = Starlette(routes=[
        WSRoute("/v1/flows/events/{run_id:path}", gw_mod._ws_starlette),
        WSRoute("/v1/flows/events", gw_mod._ws_starlette),
    ])
    app.state.gw = gw_mod.Gateway()
    return TestClient(app)


def test_bare_events_door_is_the_estate_feed() -> None:
    """ws-mcp.md (R2 fan-out): a bare connect opens the "*" channel —
    hello snapshot first, then every run's frames stamped with its
    id. (Until the 2026-09-06 stroke this door closed immediately.)"""
    c = _ws_client()
    with c:
        with c.websocket_connect("/v1/flows/events") as ws:
            hello = ws.receive_json()
            assert hello["type"] == "hello"
            assert hello["channel"] == gw_mod.ALL_RUNS
            assert hello["queue_depth"] == 0
            assert hello["active"] is None
            # live frames arrive stamped with the run id
            c.app.state.gw.publish(
                "run-doc", {"type": "run", "status": "queued"})
            frame = ws.receive_json()
            assert frame == {"type": "run", "status": "queued",
                             "run": "run-doc"}


def test_unknown_run_yields_single_unknown_frame() -> None:
    """ws-mcp.md: unknown run id hydrates one unknown frame."""
    with _ws_client().websocket_connect("/v1/flows/events/ghost") as ws:
        assert ws.receive_json() == {"type": "run", "status": "unknown"}


# ── D. shutdown.md ─────────────────────────────────────────────────────

def test_durable_queue_truth() -> None:
    """gpu-fifo.md (R3): registration records run.queued; the worker
    order survives a restart via boot_resurrect; the sweep shields
    live ids."""
    src = _gw_source()
    assert 'ledger("run.queued"' in src
    assert 'ledger("run.resurrected"' in src
    assert "boot_resurrect(gw)" in src
    assert "live_run_ids=tuple(gw.runs.keys())" in src


def test_shutdown_shape() -> None:
    """shutdown.md: signal handler, server.stop ledger, os._exit(0)."""
    assert hasattr(gw_mod.Gateway, "shutdown")
    src = _gw_source()
    for needle in ("add_signal_handler", "server.stop", "os._exit(0)"):
        assert needle in src, needle


# ── E. flows.md honesty ────────────────────────────────────────────────

def test_run_wiring_overlay_is_still_not_behavior() -> None:
    """flows.md marks run-wiring DESIGN — the overlay must not exist as code."""
    assert _py_tree_hits("syncInlineFlow") == []
    assert "NOT yet behavior" in _FLOWS_MD.read_text(encoding="utf-8")


# ── F. card-stage-typing.md ────────────────────────────────────────────

def test_first_card_lane_and_bridge() -> None:
    """card-stage-typing.md: the lattice is load-bearing (bridge + lane)."""
    assert callable(gw_mod._card_bridge)
    assert (REPO / "flows" / "music-native" / "flow.py").is_file()

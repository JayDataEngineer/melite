"""test_all_runs_feed.py - the R2 all-run WS fan-out wall
(2026-09-06; design record docs/gateway/ws-mcp.md). The BARE door
(/v1/flows/events with no run_id) was a CLOSE; it is now the
ESTATE FEED: every run's frames mirrored on the "*" channel, each
stamped with its run id. Run-scoped frames stay BYTE-IDENTICAL
(the stamp lives only on the mirror).

Pinned, all offline (scratch gateway, TestClient):
  1. STAMPED MIRROR: publish(run, ev) reaches a "*" subscriber as
dict(ev, run=run) and the run subscriber as the ORIGINAL dict.
  2. HELLO: the bare door opens with the queue snapshot (channel,
queue_depth, queued, active) and then streams live frames.
  3. RUN DOOR UNCHANGED: the run-scoped hydration frames are
exactly the pre-fan-out shape (unknown run -> single unknown
frame).
  4. BOUNDED TOO: the "*" channel drops-oldest under pressure
(just like the run channels).
"""

from __future__ import annotations

import sys
from pathlib import Path

from starlette.applications import Starlette
from starlette.routing import Route as HTTPRoute
from starlette.routing import WebSocketRoute as WSRoute
from starlette.testclient import TestClient

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "python"))

import gateway as gw_mod  # noqa: E402

JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None


def _client() -> TestClient:
    app = Starlette(routes=[
        WSRoute("/v1/flows/events/{run_id:path}", gw_mod._ws_starlette),
        WSRoute("/v1/flows/events", gw_mod._ws_starlette),
        HTTPRoute("/{rest:path}", gw_mod._adapt,
                  methods=["GET", "POST", "PUT", "DELETE"]),
    ])
    app.state.gw = gw_mod.Gateway()
    return TestClient(app)


def test_mirror_stamps_run_channel_stays_byte_identical() -> None:
    gw = gw_mod.Gateway()
    wild = gw.subscribe(gw_mod.ALL_RUNS)
    own = gw.subscribe("run-x")
    ev = {"type": "stage", "stage": "n", "status": "running"}
    gw.publish("run-x", ev)
    assert wild.get_nowait() == dict(ev, run="run-x")
    assert own.get_nowait() == ev
    # the original dict was not mutated by the stamping
    assert ev == {"type": "stage", "stage": "n", "status": "running"}


def test_bare_door_hello_then_live_frame() -> None:
    gw = gw_mod.Gateway()
    app = Starlette(routes=[
        WSRoute("/v1/flows/events", gw_mod._ws_starlette)])
    app.state.gw = gw
    with TestClient(app) as c:
        with c.websocket_connect("/v1/flows/events") as ws:
            hello = ws.receive_json()
            assert hello["type"] == "hello"
            assert hello["channel"] == gw_mod.ALL_RUNS
            assert hello["queue_depth"] == 0
            assert hello["queued"] == []
            assert hello["active"] is None
            gw.publish("run-a", {"type": "run", "status": "queued"})
            frame = ws.receive_json()
            assert frame == {"type": "run", "status": "queued",
                             "run": "run-a"}


def test_run_door_frames_unchanged() -> None:
    with _client() as c:
        with c.websocket_connect("/v1/flows/events/ghost") as ws:
            frame = ws.receive_json()
            assert frame == {"type": "run", "status": "unknown"}


def test_wild_channel_is_bounded_drop_oldest() -> None:
    gw = gw_mod.Gateway()
    wild = gw.subscribe(gw_mod.ALL_RUNS)
    for i in range(gw_mod.SUBSCRIBER_Q_MAX + 10):
        gw.publish("run-b", {"type": "stage", "step": i})
    assert wild.qsize() == gw_mod.SUBSCRIBER_Q_MAX
    drained = [wild.get_nowait() for _ in range(gw_mod.SUBSCRIBER_Q_MAX)]
    assert drained[0]["step"] == 10
    assert drained[-1]["step"] == gw_mod.SUBSCRIBER_Q_MAX + 9
    assert all(f["run"] == "run-b" for f in drained)

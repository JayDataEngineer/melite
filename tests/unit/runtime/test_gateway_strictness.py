"""GATEWAY STRICTNESS UNIT WALL — the input rims the queue laws guard.

Three rims this suite pins (the duck-typing sweep, 2026-09-05):

  * the `test` flag at submit — truthiness routing let a body like
    {"test": "false"} (a STRING) route a production run into the
    test root and stamp the sidecar test:true (a lie in the ledger).
    The flag is a BOOLEAN, refused 4xx BEFORE any run registers
    (QUEUE LANE LAW).
  * the list-door limit params — garbage (?limit=abc) silently
    defaulted to 200; it now refuses 400 with a field-named error
    (no silent drops, in miniature).
  * the lane-disclosure doors answer LaneWireError as a structured
    500 (never a silent fallback, never a plain crash page).

No GPU, no server: direct handler/submit calls."""

import asyncio
import sys
from collections.abc import Awaitable, Callable
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "py"))

import gateway  # noqa: E402
import lane_disclosure as ld  # noqa: E402

# Awaited handler answers: (status code, JSON-ish envelope the tests
# read error/count keys off).
HandlerResult = tuple[int, dict[str, str | int | list[dict[str, str | int | bool]]]]
HandlerFn = Callable[[gateway._Ctx], Awaitable[HandlerResult]]


# ── the test flag is a BOOLEAN ─────────────────────────────────────

def _submit(body: dict[str, str | bool | int | list[bool]]) -> gateway.Run:
    gw = gateway.Gateway()
    return asyncio.run(gw.submit(body))


@pytest.mark.parametrize("bad", ["false", "yes", 1, 0, "true", [True]])
def test_non_bool_test_flag_refused_before_registration(bad: str | int | list[bool]) -> None:
    """4xx BEFORE any run registers — no run dir, no sidecar lie."""
    with pytest.raises(gateway.ValidationError, match="test flag"):
        _submit({"prompt": "x", "test": bad})


def test_bool_false_flag_passes_the_flag_gate() -> None:
    # the flag check passed when the refusal comes from the NEXT gate
    # (resolve_request: no flow selected) — a different, named error
    with pytest.raises(gateway.ValidationError, match="no flow selected"):
        _submit({"prompt": "x", "test": False})


def test_bool_true_flag_passes_the_flag_gate() -> None:
    with pytest.raises(gateway.ValidationError, match="no flow selected"):
        _submit({"prompt": "x", "test": True})


# ── limit params refuse garbage loudly ─────────────────────────────

def _ctx(path: str, qs: dict[str, str]) -> gateway._Ctx:
    return gateway._Ctx(None, "GET", path, path + "?" + "&".join(
        "%s=%s" % kv for kv in qs.items()), qs, b"")


@pytest.mark.parametrize("handler,good_path", [
    (gateway._h_runs_list, "/v1/flows/runs"),
    (gateway._h_assets_index, "/v1/assets"),
])
def test_garbage_limit_refuses_4xx(handler: HandlerFn, good_path: str) -> None:
    code, body = asyncio.run(
        handler(_ctx(good_path, {"limit": "abc"})))
    assert code == 400
    assert "limit" in body["error"]


def test_runs_list_integer_limit_serves(handler: HandlerFn | None=None) -> None:
    code, body = asyncio.run(
        gateway._h_runs_list(_ctx("/v1/flows/runs", {"limit": "5"})))
    assert code == 200
    assert body["count"] >= 0


def test_runs_list_default_limit_serves() -> None:
    code, body = asyncio.run(
        gateway._h_runs_list(_ctx("/v1/flows/runs", {})))
    assert code == 200


def test_assets_index_integer_limit_serves() -> None:
    code, body = asyncio.run(
        gateway._h_assets_index(_ctx("/v1/assets", {"limit": "5"})))
    assert code == 200


# ── lane doors answer LaneWireError as a structured 500 ────────────

@pytest.mark.parametrize("handler,path,setup", [
    (gateway._h_lanes, "/v1/lanes",
     lambda: setattr(ld, "peek", lambda *a, **k: (_ for _ in ()).throw(
         ld.LaneWireError("boom: field reason")))),
    (gateway._h_card_tools, "/v1/card-tools",
     lambda: setattr(ld, "card_tools", lambda: (_ for _ in ()).throw(
         ld.LaneWireError("boom: field reason")))),
])
def test_lane_wire_refusal_serves_structured_500(handler: HandlerFn, path: str, setup: Callable[[], None]) -> None:
    # The setup lambdas setattr a RAISING double onto lane_disclosure —
    # restore the original in a finally: a leaked double poisons every
    # later test in the process that calls the real function
    # (form_wire's card_tools pins caught the "boom" leak, 2026-09-05).
    attr = "peek" if handler is gateway._h_lanes else "card_tools"
    original = getattr(ld, attr)
    setup()
    try:
        code, body = asyncio.run(handler(_ctx(path, {})))
    finally:
        setattr(ld, attr, original)
    assert code == 500
    assert "lane wire refusal" in body["error"]
    assert "boom" in body["error"]


def test_skill_read_door_still_404s_unknown() -> None:
    # the 404 path is the disclosure function's own contract
    code, body = ld.skill_read("no-such-skill")
    assert code == 404
    assert "no such skill" in body["error"]

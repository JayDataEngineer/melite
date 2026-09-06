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
    # the flag check passed when the refusal comes from the NEXT gate.
    # ENVELOPE-FIRST (CARD BIRTH LAW, 2026-09-06): the draft gate now
    # sits between the flag gate and resolve_request, so the named
    # next-gate refusal is "draft_id is required", not "no flow
    # selected" — the flag gate still passed (never "test flag").
    with pytest.raises(gateway.ValidationError, match="draft_id is required"):
        _submit({"prompt": "x", "test": False})


def test_bool_true_flag_passes_the_flag_gate() -> None:
    with pytest.raises(gateway.ValidationError, match="draft_id is required"):
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
     # the door passes ?lane= through — the double tolerates the arg
     lambda: setattr(ld, "card_tools", lambda *a, **k: (_ for _ in ()).throw(
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


# ── drafts-get serves an OBJECT, never doubly-encoded text ──────────

def test_drafts_get_door_serves_object_not_text(
        tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Media->Cards regression ("flows aren't recreated"): drafts_get serves
    VERBATIM disk TEXT; the handler passed that str straight through as the
    payload and _adapt's json.dumps encoded it a second time — wire body
    "\\"{...}\\"" — so res.json() handed hydrateDraft a string, stages
    never hydrated, and the Cards studio opened empty. The door must answer
    a dict whose stages is a list, single-encoded on the wire."""
    import json as _json
    import re as _re

    import editor_runs as _er
    monkeypatch.setattr(gateway, "STATE_ROOT", tmp_path)
    st, saved = _er.drafts_save(str(tmp_path / "drafts"), {
        "intent": "cards reopen probe",
        "stages": [{"title": "S1", "service": "svc", "params": {}}],
    })
    assert st == 200
    did = str(saved["draftId"])
    path = "/v1/flows/drafts/" + did
    ctx = gateway._Ctx(None, "GET", path, path, {}, b"")
    ctx.m = _re.match(r"^/v1/flows/drafts/(.+)$", path)
    code, payload = asyncio.run(gateway._h_drafts_get(ctx))
    assert code == 200
    assert isinstance(payload, dict), \
        "door must serve an object, got %s" % type(payload).__name__
    assert isinstance(payload.get("stages"), list)
    assert payload["draft_id"] == did
    # single-encoding: exactly what _adapt puts on the wire parses back
    # to the same object (a str payload would come back a str here).
    wire = _json.dumps(payload, indent=2, default=str)
    assert isinstance(_json.loads(wire), dict)
    # unknown ids still refuse 404 with the error dict, untouched.
    missing = "/v1/flows/drafts/draft-nope"
    mctx = gateway._Ctx(None, "GET", missing, missing, {}, b"")
    mctx.m = _re.match(r"^/v1/flows/drafts/(.+)$", missing)
    mcode, mbody = asyncio.run(gateway._h_drafts_get(mctx))
    assert mcode == 404
    assert isinstance(mbody, dict)

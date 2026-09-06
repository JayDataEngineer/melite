"""test_structured_errors.py - the R4.2 envelope wall (2026-09-06).
design record docs/design/production-architecture-review.md
R4 item 2: every HTTP 4xx carries {code (+loc/expected/got)}
beside the VERBATIM error text. Text parity is sacred (compose
refusal goldens compare the message class) - structure rides
ALONGSIDE, never instead. Codes: precise where the raiser knows
(draft_required, flow_compile, card_compose, run_live, ...),
"invalid_request for the long tail (dispatcher normalization),
no_such_route/bad_json at the dispatcher itself.
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "py"))

import gateway as gw_mod  # noqa: E402

JsonV = dict[str, "JsonV"] | list["JsonV"] | str | int | float | bool | None
DRAFT = "e" * 96


@pytest.fixture()
def scratch(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Path:
    out = tmp_path / "output"
    out.mkdir()
    state = tmp_path / "state"
    (state / "drafts").mkdir(parents=True)
    (state / "drafts" / (DRAFT + ".json")).write_text("{}")
    monkeypatch.setattr(gw_mod, "OUT_ROOT", out)
    monkeypatch.setattr(gw_mod, "STATE_ROOT", state)
    monkeypatch.setattr(gw_mod, "LEDGER_PATH", tmp_path / "_ledger.jsonl")
    return out


def _call(gw: gw_mod.Gateway, method: str, target: str,
          body: JsonV) -> tuple[int, dict[str, JsonV]]:
    status, payload = asyncio.run(
        gw_mod.route(gw, method, target, json.dumps(body).encode()))
    assert isinstance(payload, dict)
    return status, payload


def test_envelope_unit_defaults() -> None:
    body = gw_mod._refusal(gw_mod.ValidationError("plain"))
    assert body == {"error": "plain", "code": "invalid_request"}


def test_envelope_unit_full() -> None:
    body = gw_mod._refusal(gw_mod.ValidationError(
        "bad flag", code="bad_envelope", loc="test",
        expected="boolean", got="str"))
    assert body == {"error": "bad flag", "code": "bad_envelope",
                    "loc": "test", "expected": "boolean",
                    "got": "str"}


def test_start_without_draft_is_draft_required(scratch: Path) -> None:
    gw = gw_mod.Gateway()
    status, payload = _call(gw, "POST", "/v1/flows/start",
                            {"flow_inline": {"id": "x",
                                              "stages": []}})
    assert status == 400
    assert payload["code"] == "draft_required"
    assert payload["loc"] == "draft_id"
    assert "draft_id is required" in str(payload["error"])
    assert gw.order == []


def test_start_string_test_flag(scratch: Path) -> None:
    gw = gw_mod.Gateway()
    status, payload = _call(gw, "POST", "/v1/flows/start",
                            {"draft_id": DRAFT, "test": "false"})
    assert status == 400
    assert payload["code"] == "bad_envelope"
    assert payload["loc"] == "test"
    assert payload["expected"] == "boolean"
    assert payload["got"] == "str"


def test_start_dangling_draft(scratch: Path) -> None:
    gw = gw_mod.Gateway()
    status, payload = _call(gw, "POST", "/v1/flows/start",
                            {"draft_id": "z" * 96})
    assert status == 400
    assert payload["code"] == "draft_unknown"
    assert payload["loc"] == "draft_id"


def test_validate_bad_engine_is_flow_compile(scratch: Path) -> None:
    gw = gw_mod.Gateway()
    status, payload = _call(gw, "POST", "/v1/flows/validate",
                            {"flow_inline": {"id": "x", "stages": [
                                {"id": "g", "engine": "nope-engine",
                                 "params": {}}]}})
    assert status == 400
    assert payload["code"] == "flow_compile"
    assert payload["loc"] == "flow"
    assert payload["error"]
    for row in payload["errors"]:
        assert isinstance(row, dict) and "code" in row, row


def test_compose_refusal_carries_loc(scratch: Path) -> None:
    gw = gw_mod.Gateway()
    status, payload = _call(gw, "POST", "/v1/flows/validate",
                            {"model": "music3", "prompt": ["x"]})
    assert status == 400
    assert payload["code"] == "card_compose"
    assert payload["loc"] == "params.prompt"
    assert payload["expected"] == "string_type"
    assert "rc=-3" in str(payload["error"])


def test_long_tail_gets_default_code(scratch: Path) -> None:
    gw = gw_mod.Gateway()
    status, payload = _call(gw, "POST", "/v1/uploads",
                            ["not", "an", "object"])
    assert status == 400
    assert payload["code"] == "invalid_request"
    assert "uploads" in str(payload["error"])


def test_unknown_route_has_code(scratch: Path) -> None:
    gw = gw_mod.Gateway()
    status, payload = _call(gw, "GET", "/v1/nope", {})
    assert status == 404
    assert payload["code"] == "no_such_route"


def test_stop_unknown_run_code(scratch: Path) -> None:
    gw = gw_mod.Gateway()
    status, payload = _call(gw, "POST", "/v1/flows/stop/run-ghost",
                            {})
    assert status == 400
    assert payload["code"] == "run_unknown"
    assert payload["loc"] == "run_id"


def test_reproduce_unknown_run_code(scratch: Path) -> None:
    gw = gw_mod.Gateway()
    status, payload = _call(
        gw, "POST", "/v1/flows/reproduce/run-ghost", {})
    assert status == 400
    assert payload["code"] == "run_unknown"
    assert payload["loc"] == "run_id"

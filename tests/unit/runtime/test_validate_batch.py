"""BATCH VALIDATE WALL (stroke 3, 2026-09-06) — POST /v1/flows/validate.

The inline arm refuses in BATCH: "error" stays the verbatim first
refusal (wire compatibility), "errors" rows name every stage-local
problem + every offline workflow-pin problem the door can see, so N
mistakes cost ONE round-trip instead of N (the review's authoring
friction #2). Pins:

  * compat: a refusal still 400s with "error" == the first FlowError
  * batch: two stage-local mistakes BOTH appear, each row naming its
    stage — one round-trip, not two
  * pin sweep: a comfyui stage carrying a workflow graph with an
    unknown class_type is refused AT THE DOOR with the node + class
    named (validate_workflow ABI against the estate pin — never on
    GPU money)
  * clean: a valid body 200s with no "errors" key
"""

import sys
from pathlib import Path
from types import SimpleNamespace

import asyncio

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "py"))

import gateway  # noqa: E402

# Envelopes and handler payloads are JSON (no future-import — old-style).
JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None


def _validate(body: dict[str, JsonValue]) -> tuple[int, dict[str, JsonValue]]:
    ctx = SimpleNamespace(json=body)
    code, payload = asyncio.run(gateway._h_flows_validate(ctx))
    return code, payload


def _stage_rows(payload: dict[str, JsonValue]) -> dict[str, str]:
    return {r.get("stage", r.get("scope")): r["error"]
            for r in payload.get("errors", [])}


def test_first_refusal_stays_compatible() -> None:
    code, payload = _validate({"flow_inline": {"id": "bad", "stages": [
        {"id": "s1", "engine": "no_such_engine"}]}})
    assert code == 400
    assert "error" in payload and "no_such_engine" in payload["error"]
    assert isinstance(payload.get("errors"), list)


def test_two_local_mistakes_one_round_trip() -> None:
    code, payload = _validate({"flow_inline": {"id": "two", "stages": [
        {"id": "badeng", "engine": "no_such_engine"},
        {"id": "badkind", "engine": "comfyui",
         "outputs": {"default": "not_a_kind"}}]}})
    assert code == 400
    rows = _stage_rows(payload)
    assert "no_such_engine" in rows["badeng"], rows
    assert "badkind" in rows and "not_a_kind" in rows["badkind"], rows


def test_workflow_pin_sweep_refuses_at_the_door() -> None:
    code, payload = _validate({"flow_inline": {"id": "pin", "stages": [
        {"id": "wf", "engine": "comfyui",
         "params": {"workflow": {
             "good": {"class_type": "KSampler", "inputs": {}},
             "ghost": {"class_type": "DefinitelyNotANode",
                       "inputs": {}}}}}]}})
    assert code == 400
    rows = _stage_rows(payload)
    assert "DefinitelyNotANode" in rows["wf"], rows
    assert "KSampler" not in str(rows["wf"])


def test_clean_body_200s_without_errors_key() -> None:
    code, payload = _validate({"flow_inline": {"id": "clean", "stages": [
        {"id": "gen", "engine": "anycreature",
         "inputs": {"prompt": {"initial": "prompt"}},
         "expected": {"prompt": "text"}}]}})
    assert code == 200, payload
    assert payload["ok"] is True
    assert "errors" not in payload

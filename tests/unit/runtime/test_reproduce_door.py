"""test_reproduce_door.py - the R4.5 reproduce wall (2026-09-06;
design record docs/design/production-architecture-review.md
R4 item 5: "every flow reconstructable after inference" as one
call. A settled run's EXACT recorded request (_request.json,
written at submit) re-submits through the same submit() the start
door rides — a NEW run id, the original record untouched, the
original draft doc re-validated (CARD BIRTH LAW, no auto-mint).
All offline (scratch roots; no worker run).
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "python"))

import gateway as gw_mod  # noqa: E402

JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None
DRAFT = "p" * 96


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


def _record(scratch: Path, run_id: str, *, draft: str = DRAFT,
             status: str = "completed",
             request: dict[str, JsonValue] | None = None) -> None:
    d = scratch / run_id
    d.mkdir(parents=True, exist_ok=True)
    body: dict[str, JsonValue] = request if request is not None else {
        "flow_inline": {
            "id": "reproduce-wall",
            "stages": [{"id": "gen", "engine": "comfyui",
                        "params": {"server_url": "http://127.0.0.1:1",
                                   "prompt": "reproduce wall",
                                   "width": 64, "height": 64,
                                   "steps": 1, "seed": 7}}]},
        "draft_id": DRAFT, "test": True}
    (d / "_request.json").write_text(json.dumps(body))
    (d / "_flow.json").write_text(json.dumps({
        "run_id": run_id, "status": status, "error": "",
        "stages": [], "skipped_stages": [], "artifacts": [],
        "created_at": 100.0, "test": True, "draft_id": draft,
        "pipeline": "reproduce-wall", "graph": []}))


def test_reproduce_submits_new_run_same_body(
        scratch: Path) -> None:
    _record(scratch, "run-rep1")
    gw = gw_mod.Gateway()
    res = asyncio.run(gw.reproduce("run-rep1"))
    assert res["replay_of"] == "run-rep1"
    assert res["run_id"] != "run-rep1"
    assert res["status"] in ("queued", "running")
    new_id = res["run_id"]
    assert gw.order == [new_id]
    new_run = gw.runs[new_id]
    body = json.loads(
        (new_run.dir / "_request.json").read_text())
    orig = json.loads(
        (scratch / "run-rep1" / "_request.json").read_text())
    assert body == orig          # EXACT body, byte-for-byte replay
    evs = [json.loads(l) for l in
           gw_mod.LEDGER_PATH.read_text().splitlines()]
    assert any(e["event"] == "run.reproduce" and
               e["data"]["replay_of"] == "run-rep1" for e in evs)


def test_unknown_record_refused(scratch: Path) -> None:
    gw = gw_mod.Gateway()
    with pytest.raises(gw_mod.ValidationError):
        asyncio.run(gw.reproduce("run-ghost"))
    assert gw.order == []


def test_live_run_refused(scratch: Path) -> None:
    _record(scratch, "run-live", status="running")
    gw = gw_mod.Gateway()
    live = gw_mod._rebuild_run_from_record("run-live")
    assert live is not None
    live.status = "running"
    gw.runs["run-live"] = live
    with pytest.raises(gw_mod.ValidationError):
        asyncio.run(gw.reproduce("run-live"))
    assert gw.order == []


def test_cardless_legacy_row_refused(scratch: Path) -> None:
    _record(scratch, "run-old", draft="")
    gw = gw_mod.Gateway()
    with pytest.raises(gw_mod.ValidationError) as ei:
        asyncio.run(gw.reproduce("run-old"))
    assert "cardless" in str(ei.value)
    assert gw.order == []


def test_missing_draft_doc_refused_by_birth_law(
        scratch: Path) -> None:
    _record(scratch, "run-nodoc")
    for p in (gw_mod.STATE_ROOT / "drafts").iterdir():
        p.unlink()
    gw = gw_mod.Gateway()
    with pytest.raises(gw_mod.ValidationError):
        asyncio.run(gw.reproduce("run-nodoc"))
    assert gw.order == []


def test_reproduce_route_in_table_and_docs() -> None:
    rows = [r.template for r in gw_mod.ROUTES if r.template]
    assert "/v1/flows/reproduce/{run_id}" in rows
    doc = (REPO / "docs" / "gateway" / "endpoints.md").read_text()
    assert "/v1/flows/reproduce/" in doc
    doors = (REPO / "web" / "catalog" / "src" / "generated" /
             "gatewayDoors.ts").read_text()
    assert "reproduce" in doors
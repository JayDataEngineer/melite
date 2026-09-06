"""test_agent_boot.py - the R4.1 boot-manifest wall (2026-09-06;
design record docs/design/production-architecture-review.md
R4 item 1). The headless agent's FIRST call answers everything a
session needs to compose: gateway runtime truth, health, queue
state, lanes, card tools, skills, model catalog, authoring
schema - ONE payload, fault-isolated per section (a broken lane
wire documents itself and the rest ships). All offline.
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

JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None
SECTIONS = ("gateway", "health", "queue", "lanes", "card_tools",
            "skills", "model_catalog", "schema")


@pytest.fixture()
def scratch(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(gw_mod, "OUT_ROOT", tmp_path / "output")
    monkeypatch.setattr(gw_mod, "STATE_ROOT", tmp_path / "state")
    monkeypatch.setattr(gw_mod, "LEDGER_PATH", tmp_path / "_ledger.jsonl")
    (tmp_path / "output").mkdir()


def _boot() -> tuple[int, dict[str, JsonValue]]:
    gw = gw_mod.Gateway()
    status, payload = asyncio.run(
        gw_mod.route(gw, "GET", "/v1/agent/boot", b""))
    assert status == 200
    assert isinstance(payload, dict)
    return status, payload


def test_manifest_has_every_section(scratch: None) -> None:
    _, manifest = _boot()
    for key in SECTIONS:
        assert key in manifest, key
    g = manifest["gateway"]
    assert isinstance(g, dict)
    assert g["routes"] == len(gw_mod.ROUTES) >= 51
    assert g["version"] == "0.1.0"
    assert isinstance(g["uptime_s"], (int, float))
    assert isinstance(g["boot_at"], (int, float))


def test_queue_section_is_live_truth(scratch: None) -> None:
    gw = gw_mod.Gateway()
    gw.order.append("run-x")
    status, manifest = asyncio.run(
        gw_mod.route(gw, "GET", "/v1/agent/boot", b""))
    assert status == 200
    q = manifest["queue"]
    assert isinstance(q, dict)
    assert q["depth"] == 1 and q["queued"] == ["run-x"]
    assert q["active"] is None


def test_sections_are_fault_isolated(
        scratch: None, monkeypatch: pytest.MonkeyPatch) -> None:
    import lane_disclosure

    def _boom(kind: str | None = None,
              genre: str | None = None) -> list[JsonValue]:
        raise RuntimeError("lane wire down")

    monkeypatch.setattr(lane_disclosure, "peek", _boom)
    _, manifest = _boot()
    lanes = manifest["lanes"]
    assert isinstance(lanes, dict) and "RuntimeError" in str(
        lanes.get("error", ""))
    for key in ("health", "card_tools", "skills", "model_catalog",
                "schema"):
        assert key in manifest   # the rest shipped


def test_boot_is_ledgered(scratch: None) -> None:
    _boot()
    evs = [json.loads(l) for l in
           gw_mod.LEDGER_PATH.read_text().splitlines()]
    assert any(e["event"] == "agent.boot" for e in evs)


def test_manifest_route_in_table_and_docs() -> None:
    paths = [r.path for r in gw_mod.ROUTES]
    assert "/v1/agent/boot" in paths
    doc = (REPO / "docs" / "gateway" / "endpoints.md").read_text()
    assert "/v1/agent/boot" in doc
    doors = (REPO / "web" / "catalog" / "src" / "generated" /
             "gatewayDoors.ts").read_text()
    assert "agent/boot" in doors
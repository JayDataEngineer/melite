"""test_retry_rows.py - the R3.3 retry/timeout wall (2026-09-06;
design record docs/queue/flows.md "retry rows"). Retry policy is
DATA on the stage row (retries: 0..5, timeout_s: positive | None),
validated at construction (PYTHON SHAPE LAW), carried through
to_graph onto the ABI NodeRow, honored by the runner:

  - a failed attempt (exception OR engine error dict) re-executes
    while attempts remain; every retry is ledgered run.stage_retry
    and stamped stage["retries_used"] / ["retry_last_error"]
  - a deliberate STOP never retries
  - timeout_s is the RUNNER budget (asyncio.wait_for) - distinct
    from params.timeout_s, the ENGINE own door

All offline: stub engines via load_engine monkeypatch; scratch
roots; no gateway boot, no GPU.
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
from flow import Stage  # noqa: E402
from flow_graph import FlowGraph, NodeRow  # noqa: E402

JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None

DRAFT = "r" * 96


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


def _run_for(scratch: Path, run_id: str, row: NodeRow) -> gw_mod.Run:
    (scratch / run_id).mkdir(exist_ok=True)
    run = gw_mod.Run(
        run_id=run_id,
        graph=FlowGraph(name="retry-wall", nodes=(row,)),
        request={"flow_inline": {}}, draft_id=DRAFT)
    run.stages = [{"id": row.node_id, "name": row.node_id, "index": 0,
                   "status": "pending", "outputs": {}, "expected": {}}]
    return run


class _Flaky:
    """Fails N times then succeeds. mode: raise | dict | stop."""
    calls = 0

    def __init__(self, fails: int, mode: str = "raise",
                 sleep_s: float = 0.0) -> None:
        self.fails = fails
        self.mode = mode
        self.sleep_s = sleep_s

    async def execute(self, abi: NodeRow, run_dir: str,
                      inputs: dict[str, JsonValue],
                      stop: asyncio.Event,
                      report: "type[object] | None" = None,
                      ) -> dict[str, JsonValue]:
        _Flaky.calls += 1
        if self.sleep_s:
            await asyncio.sleep(self.sleep_s)
        if _Flaky.calls <= self.fails:
            if self.mode == "raise":
                raise RuntimeError("boom %d" % _Flaky.calls)
            if self.mode == "stop":
                stop.set()
                return {"error": "stopped"}
            return {"error": "engine said no %d" % _Flaky.calls}
        return {"outputs": {"images": "ok.png"}, "artifacts": []}


def _stub_engine(monkeypatch: pytest.MonkeyPatch, eng: _Flaky) -> None:
    _Flaky.calls = 0
    monkeypatch.setattr(gw_mod, "load_engine", lambda t: eng)


def _ledger_events() -> list[dict[str, JsonValue]]:
    p = gw_mod.LEDGER_PATH
    if not p.exists():
        return []
    return [json.loads(l) for l in p.read_text().splitlines()]


def test_row_validation_bounds() -> None:
    NodeRow(**{"id": "x", "type": "s", "retries": 0})          # ok
    NodeRow(**{"id": "x", "type": "s", "retries": 5})          # cap
    NodeRow(**{"id": "x", "type": "s", "timeout_s": 0.5})      # ok
    with pytest.raises(Exception):
        NodeRow(**{"id": "x", "type": "s", "retries": 6})      # over cap
    with pytest.raises(Exception):
        NodeRow(**{"id": "x", "type": "s", "timeout_s": 0})    # nonpositive
    with pytest.raises(Exception):
        NodeRow(**{"id": "x", "type": "s", "timeout_s": -1.0})
    st = Stage(id="s1", engine="stub", retries=3, timeout_s=9.0)
    assert st.retries == 3 and st.timeout_s == 9.0


def test_exception_retries_then_succeeds(
        scratch: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    row = NodeRow(**{"id": "gen", "type": "flaky", "retries": 2,
                     "params": {"prompt": {"initial": "p"}}})
    run = _run_for(scratch, "run-t1", row)
    _stub_engine(monkeypatch, _Flaky(fails=2, mode="raise"))
    gw = gw_mod.Gateway()
    asyncio.run(gw.execute(run))
    assert _Flaky.calls == 3                      # 2 fails + 1 win
    assert run.stages[0]["status"] == "completed"
    assert run.stages[0]["retries_used"] == 2
    events = [e for e in _ledger_events()
              if e["event"] == "run.stage_retry"]
    assert len(events) == 2
    assert events[0]["data"]["attempt"] == 1


def test_zero_retries_fails_fast(
        scratch: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    row = NodeRow(**{"id": "gen", "type": "flaky",
                     "params": {"prompt": {"initial": "p"}}})
    run = _run_for(scratch, "run-t2", row)
    _stub_engine(monkeypatch, _Flaky(fails=1, mode="raise"))
    gw = gw_mod.Gateway()
    with pytest.raises(RuntimeError):
        asyncio.run(gw.execute(run))
    assert _Flaky.calls == 1
    assert run.stages[0]["status"] == "failed"
    assert "retries_used" not in run.stages[0]


def test_error_dict_retries_then_succeeds(
        scratch: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    row = NodeRow(**{"id": "gen", "type": "flaky", "retries": 2,
                     "params": {"prompt": {"initial": "p"}}})
    run = _run_for(scratch, "run-t3", row)
    _stub_engine(monkeypatch, _Flaky(fails=2, mode="dict"))
    gw = gw_mod.Gateway()
    asyncio.run(gw.execute(run))
    assert _Flaky.calls == 3
    assert run.stages[0]["status"] == "completed"
    assert run.stages[0]["retry_last_error"].startswith("attempt 2:")


def test_exhausted_retries_fail_with_engine_error(
        scratch: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    row = NodeRow(**{"id": "gen", "type": "flaky", "retries": 1,
                     "params": {"prompt": {"initial": "p"}}})
    run = _run_for(scratch, "run-t4", row)
    _stub_engine(monkeypatch, _Flaky(fails=9, mode="dict"))
    gw = gw_mod.Gateway()
    with pytest.raises(gw_mod.ValidationError):
        asyncio.run(gw.execute(run))
    assert _Flaky.calls == 2                      # initial + 1 retry
    assert run.stages[0]["status"] == "failed"
    assert run.stages[0]["retries_used"] == 1


def test_stop_never_retries(
        scratch: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    row = NodeRow(**{"id": "gen", "type": "flaky", "retries": 3,
                     "params": {"prompt": {"initial": "p"}}})
    run = _run_for(scratch, "run-t5", row)
    _stub_engine(monkeypatch, _Flaky(fails=1, mode="stop"))
    gw = gw_mod.Gateway()
    asyncio.run(gw.execute(run))
    assert _Flaky.calls == 1
    assert run.stages[0]["status"] == "stopped"
    assert "retries_used" not in run.stages[0]


def test_timeout_is_the_runners_budget(
        scratch: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    row = NodeRow(**{"id": "gen", "type": "flaky", "timeout_s": 0.05,
                     "retries": 1,
                     "params": {"prompt": {"initial": "p"}}})
    run = _run_for(scratch, "run-t6", row)
    _stub_engine(monkeypatch, _Flaky(fails=99, mode="raise",
                                     sleep_s=0.4))
    gw = gw_mod.Gateway()
    with pytest.raises(asyncio.TimeoutError):
        asyncio.run(gw.execute(run))
    assert _Flaky.calls == 2                      # initial + 1 retry
    assert run.stages[0]["status"] == "failed"
    assert run.stages[0]["retries_used"] == 1
    evs = [e for e in _ledger_events()
           if e["event"] == "run.stage_retry"]
    assert len(evs) == 1


def test_timeout_budget_passes_fast_engine(
        scratch: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    row = NodeRow(**{"id": "gen", "type": "flaky", "timeout_s": 5.0,
                     "params": {"prompt": {"initial": "p"}}})
    run = _run_for(scratch, "run-t7", row)
    _stub_engine(monkeypatch, _Flaky(fails=0, mode="raise",
                                     sleep_s=0.001))
    gw = gw_mod.Gateway()
    asyncio.run(gw.execute(run))
    assert run.stages[0]["status"] == "completed"


def test_to_graph_carries_retry_rows_source_pin() -> None:
    src = (REPO / "python" / "flow.py").read_text()
    assert "retries=st.retries" in src
    assert "timeout_s=st.timeout_s" in src
    gsrc = (REPO / "python" / "gateway.py").read_text()
    assert 'getattr(node, "retries", 0)' in gsrc
    assert 'getattr(node, "timeout_s", 0.0)' in gsrc

"""test_sim_backend — ROW 6 slice 1 (2026-09-07): the sim backend.

The queue-native test engine (plugins/engines/sim/) executes flows
through the REAL worker loop — draft → start → per-stage execute →
sidecar → artifacts — with zero inference (text files only). This
wall proves the seams headless, no GPU:

  1. two-stage sim chain completes; stage-2's artifact contains
     stage-1's echo (the carry-pool + file handoff seam).
  2. a `fail` stage errors the run with the EXACT message
     (the resilience seam).
  3. a slow stage + the stop door lands `stopped` (the stop seam).
  4. a kind-mismatch wire refuses at the VALIDATE door (no slot,
     no sidecar — the AI iterates free).

Design record: docs/design/row6-sim-backend.md. Runs against a
scratch gateway (own state root — never the live estate).
"""
import json as _json
import time
import urllib.request
import urllib.error
from collections.abc import Iterator

import pytest


def _post(port: int, path: str, body: dict) -> tuple[int, dict]:
    req = urllib.request.Request(
        "http://127.0.0.1:%d/%s" % (port, path),
        data=_json.dumps(body).encode("utf-8"),
        headers={"content-type": "application/json"},
        method="POST",
    )
    try:
        r = urllib.request.urlopen(req, timeout=15)
        return r.status, _json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            return e.code, _json.loads(e.read().decode("utf-8"))
        except Exception:
            return e.code, {}


def _get(port: int, path: str) -> tuple[int, dict]:
    try:
        r = urllib.request.urlopen(
            "http://127.0.0.1:%d/%s" % (port, path), timeout=15)
        return r.status, _json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            return e.code, _json.loads(e.read().decode("utf-8"))
        except Exception:
            return e.code, {}


@pytest.fixture(scope="module")
def scratch_gateway() -> Iterator[int]:
    from _anchor import boot_scratch_gateway, reap_gateway
    import sys as _sys
    port, proc = boot_scratch_gateway(
        wait_path="/v1/queue", python=_sys.executable,
        tries=150, sleep=0.2, env=None)
    yield port
    reap_gateway(proc)


def _compose(port: int, body: dict) -> str:
    """CARD BIRTH LAW: compose the card first, start rides the id.

    The draft door speaks the card shape (stage inputs are upstream
    NAME lists); the flow_inline body rides the START. The draft is
    the birth record — existence-checked before registration."""
    draft_stages = []
    for st in body.get("stages", []):
        names = [ref.get("output", "") for ref in
                 (st.get("inputs") or {}).values()
                 if isinstance(ref, dict)]
        draft_stages.append({"id": st.get("id", ""),
                             "inputs": names,
                             "params": st.get("params", {})})
    code, doc = _post(port, "v1/flows/drafts",
                      {"intent": "sim wall: %s" % body.get("id", "?"),
                       "stages": draft_stages,
                       "flow_inline": body})
    assert code == 200, "card compose refused: %s %s" % (code, doc)
    draft_id = doc.get("draftId")
    assert isinstance(draft_id, str) and draft_id, \
        "card compose returned no draftId: %s" % (doc,)
    return draft_id


def _start(port: int, body: dict) -> tuple[int, dict]:
    draft_id = _compose(port, body)
    return _post(port, "v1/flows/start",
                 {"flow_inline": body, "draft_id": draft_id})


def _wait_terminal(port: int, run_id: str,
                   timeout: float = 60.0) -> dict:
    deadline = time.time() + timeout
    last: dict = {}
    while time.time() < deadline:
        code, last = _get(port, "v1/flows/status/%s" % run_id)
        assert code == 200, "status refused: %s %s" % (code, last)
        if last.get("status") in ("completed", "failed", "stopped"):
            return last
        time.sleep(0.2)
    raise AssertionError("run %s never settled: %s" % (run_id, last))


_CHAIN = {
    "id": "sim-chain",
    "stages": [
        {"id": "first", "engine": "sim",
         "params": {"echo": "sim-seed-echo"},
         "outputs": {"txt": "text"}},
        {"id": "second", "engine": "sim",
         "params": {"echo": "sim-second-echo"},
         "inputs": {"prior": {"stage": "first", "output": "txt"}},
         "expected": {"prior": "text"},
         "outputs": {"txt": "text"}},
    ],
}


def test_sim_chain_completes_with_carry(scratch_gateway: int) -> None:
    port = scratch_gateway
    code, resp = _start(port, _CHAIN)
    assert code in (200, 202), "sim chain start refused: %s %s" % (code, resp)
    run_id = resp.get("run_id")
    assert run_id, "start returned no run_id: %s" % (resp,)
    final = _wait_terminal(port, run_id)
    assert final.get("status") == "completed", final
    stages = {s["id"]: s for s in final.get("stages", [])}
    assert set(stages) >= {"first", "second"}, stages.keys()
    # the carry/file seam: stage 2 read stage 1's artifact — its
    # served url + gallery ride the stage row (the editor contract).
    second = stages["second"]
    assert second.get("url", "").endswith(".txt"), second
    assert second.get("gallery"), second
    # the artifact is a raw text file, not JSON — read it raw.
    # The stage url keeps its run-relative subpath (sim/<stage>.txt).
    rel = second["url"].split("/v1/assets/runs/%s/" % run_id, 1)[-1]
    req = urllib.request.Request(
        "http://127.0.0.1:%d/v1/assets/runs/%s/%s" % (port, run_id, rel))
    with urllib.request.urlopen(req, timeout=15) as r:
        text = r.read().decode("utf-8")
    assert "sim-seed-echo" in text and "sim-second-echo" in text, text


def test_sim_fail_errors_exact(scratch_gateway: int) -> None:
    port = scratch_gateway
    body = {"id": "sim-fail", "stages": [
        {"id": "doomed", "engine": "sim",
         "params": {"echo": "x", "fail": "sim-boom-exact"},
         "outputs": {"txt": "text"}}]}
    code, resp = _start(port, body)
    assert code in (200, 202), "sim fail start refused: %s %s" % (code, resp)
    final = _wait_terminal(port, resp["run_id"])
    assert final.get("status") == "failed", final
    assert "sim-boom-exact" in str(final.get("error", "")), final


def test_sim_stop_lands_stopped(scratch_gateway: int) -> None:
    port = scratch_gateway
    body = {"id": "sim-slow", "stages": [
        {"id": "slow", "engine": "sim",
         "params": {"echo": "x", "sleep_s": 30},
         "outputs": {"txt": "text"}}]}
    code, resp = _start(port, body)
    assert code in (200, 202), "sim slow start refused: %s %s" % (code, resp)
    run_id = resp["run_id"]
    time.sleep(2.0)  # let the stage enter its sim work
    code, stopped = _post(port, "v1/flows/stop/%s" % run_id, {})
    assert code == 200, "stop refused: %s %s" % (code, stopped)
    final = _wait_terminal(port, run_id)
    assert final.get("status") == "stopped", final


def test_sim_kind_mismatch_refuses_pre_slot(
        scratch_gateway: int) -> None:
    port = scratch_gateway
    body = {"id": "sim-mismatch", "stages": [
        {"id": "first", "engine": "sim",
         "params": {"echo": "x"},
         "outputs": {"txt": "text"}},
        {"id": "second", "engine": "sim",
         "params": {"echo": "y"},
         "inputs": {"prior": {"stage": "first", "output": "txt"}},
         "expected": {"prior": "image"},
         "outputs": {"img": "image"}}]}
    code, resp = _post(port, "v1/flows/validate",
                       {"flow_inline": body})
    assert code in (400, 422), \
        "kind mismatch must refuse pre-slot: %s %s" % (code, resp)

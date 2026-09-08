"""test_sim_backend — ROW 6 slice 1 (2026-09-07): the sim backend.

The queue-native test engine (packages/engines/sim/) executes flows
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

Slice 2 (convergence plane, same file, TestStorm): a SEEDED storm
of starts/stops must converge — every run terminal, every failure
exact, and a clean run completes AFTER the storm (the queue
continues). No hypothesis on the box; determinism comes from a
pinned seed + stop-only-slow discipline (a stopped run is always
still working — never a race with completion).

Design record: docs/design/row6-sim-backend.md. Runs against a
scratch gateway (own state root — never the live estate).
"""
import json as _json
import random
import time
import urllib.request
import urllib.error
from collections.abc import Iterator

import pytest


def _post(port: int, path: str, body: "dict[str, object]") -> "tuple[int, dict[str, object]]":
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


def _get(port: int, path: str) -> "tuple[int, dict[str, object]]":
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
        wait_path="/v1/queue",         tries=150, sleep=0.2, env=None)
    yield port
    reap_gateway(proc)


def _compose(port: int, body: "dict[str, object]") -> str:
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


def _start(port: int, body: "dict[str, object]") -> "tuple[int, dict[str, object]]":
    draft_id = _compose(port, body)
    return _post(port, "v1/flows/start",
                 {"flow_inline": body, "draft_id": draft_id})


def _wait_terminal(port: int, run_id: str,
                   timeout: float = 60.0) -> "dict[str, object]":
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


_STORM_SEED = 20260907


def _storm_body(kind: str, tag: str) -> "dict[str, object]":
    """One single-stage sim flow per storm op kind."""
    params: dict = {"echo": "storm-%s-%s" % (kind, tag)}
    if kind == "fail":
        params["fail"] = "storm-fail-exact-%s" % tag
    if kind == "slow":
        params["sleep_s"] = 30
    return {"id": "storm-%s-%s" % (kind, tag), "stages": [
        {"id": "only", "engine": "sim",
         "params": params, "outputs": {"txt": "text"}}]}


class TestStorm:
    """The convergence plane: a seeded storm of starts/stops must
    CONVERGE — every run terminal, every failure exact, and (the
    RESILIENCE LAW half) a clean run completes after the storm."""

    def test_storm_converges(self, scratch_gateway: int) -> None:
        port = scratch_gateway
        rng = random.Random(_STORM_SEED)
        plan = (["slow"] * 2 + ["echo"] * 3 + ["fail"] * 2)
        rng.shuffle(plan)
        expect: dict[str, str] = {}
        for i, kind in enumerate(plan):
            tag = "%d" % i
            code, resp = _start(port, _storm_body(kind, tag))
            assert code in (200, 202), \
                "storm start %s refused: %s %s" % (kind, code, resp)
            expect[resp["run_id"]] = kind
        # stop ONLY the slows (always still working — deterministic,
        # never a race with completion); fast runs settle on their own.
        time.sleep(2.0)
        for run_id, kind in expect.items():
            if kind == "slow":
                code, _ = _post(port, "v1/flows/stop/%s" % run_id, {})
                assert code == 200, "storm stop refused: %s" % (run_id,)
        finals = {r: _wait_terminal(port, r, timeout=120.0)
                  for r in expect}
        assert len(finals) == len(expect), "a storm run was LOST"
        for run_id, final in finals.items():
            kind = expect[run_id]
            status = final.get("status")
            if kind == "echo":
                assert status == "completed", (run_id, final)
            elif kind == "fail":
                assert status == "failed", (run_id, final)
                assert "storm-fail-exact-" in str(
                    final.get("error", "")), (run_id, final)
            else:
                assert status == "stopped", (run_id, final)
        # the queue continues: a clean run AFTER the storm completes.
        code, resp = _start(port, _storm_body("echo", "after"))
        assert code in (200, 202), \
            "post-storm start refused: %s %s" % (code, resp)
        final = _wait_terminal(port, resp["run_id"])
        assert final.get("status") == "completed", final


# ── Row 6 slice 3 — the PROPERTY PLANE (the transition lattice) ────────
#
# The storm (slice 2) proves convergence on one seeded mix; the
# property plane proves the LATTICE systematically: for every
# reachable (state × gesture) cell, the landing state + the exact
# invariants. Same fixture, same helpers — new invariants join the
# plane here, never a new harness (the row-6 record's growth law).
#
#   running × stop     → stopped               (slice 1, kept)
#   queued  × stop     → stopped WITHOUT executing (the FIFO seam)
#   terminal × stop    → error reply, status UNCHANGED (no flips)
#   stopped × resume   → completed, CARRY intact (prefix proof)
#   failed  × resume   → the SAME stage fails exactly (prefix proof)
#   completed × resume → 4xx run_completed
#   live    × resume   → 4xx run_live

class TestTransitionLattice:
    """The queue's state machine, driven cell by cell through the
    live scratch gateway on the sim backend (no GPU, no mocks)."""

    def _stage(self, sid: str, echo: str, **params: "str | int | float | bool | None") -> "dict[str, object]":
        p: dict = {"echo": echo}
        p.update(params)
        return {"id": sid, "engine": "sim", "params": p,
                "outputs": {"txt": "text"}}

    def test_queued_stop_never_executes(self, scratch_gateway: int) -> None:
        # A slow run holds the FIFO ticket; a second run QUEUES. The
        # stop door on a queued run must land `stopped` with ZERO
        # stage execution — no artifact, no engine transition, and
        # the holder unaffected (it completes after).
        port = scratch_gateway
        code, holder = _start(port, {
            "id": "lattice-holder", "stages": [
                self._stage("hold", "lattice-holder-echo", sleep_s=8)]})
        assert code in (200, 202), (code, holder)
        code, queued = _start(port, {
            "id": "lattice-queued", "stages": [
                self._stage("q", "lattice-queued-echo")]})
        assert code in (200, 202), (code, queued)
        qid = queued["run_id"]
        # the queued run sits at status queued (the holder is busy)
        code, snap = _get(port, "v1/flows/status/%s" % qid)
        assert code == 200 and snap.get("status") in ("queued",), snap
        code, resp = _post(port, "v1/flows/stop/%s" % qid, {})
        assert code == 200, "queued stop refused: %s %s" % (code, resp)
        final = _wait_terminal(port, qid)
        assert final.get("status") == "stopped", final
        stages = final.get("stages", [])
        for s in stages:
            assert s.get("status") not in ("completed", "running"), \
                "queued-stop run executed a stage: %s" % (s,)
            assert not s.get("url"), \
                "queued-stop run produced an artifact: %s" % (s,)
        # the holder was never disturbed — it still completes
        hfinal = _wait_terminal(port, holder["run_id"], timeout=60)
        assert hfinal.get("status") == "completed", hfinal

    def test_terminal_stop_never_flips_status(
            self, scratch_gateway: int) -> None:
        # stop on a terminal run answers an ERROR body and the
        # status stays what it was — no resurrection, no flips.
        port = scratch_gateway
        code, resp = _start(port, {
            "id": "lattice-done", "stages": [
                self._stage("d", "lattice-done-echo")]})
        assert code in (200, 202), (code, resp)
        rid = resp["run_id"]
        final = _wait_terminal(port, rid)
        assert final.get("status") == "completed", final
        code, again = _post(port, "v1/flows/stop/%s" % rid, {})
        assert code == 200, (code, again)  # the door answers politely…
        assert "error" in again, \
            "stop on a completed run must say so: %s" % (again,)
        code, after = _get(port, "v1/flows/status/%s" % rid)
        assert after.get("status") == "completed", \
            "terminal stop FLIPPED the status: %s" % (after,)

    _CHAIN_SLOW2 = {
        "id": "lattice-carry",
        "stages": [
            {"id": "first", "engine": "sim",
             "params": {"echo": "lattice-carry-seed"},
             "outputs": {"txt": "text"}},
            {"id": "second", "engine": "sim",
             "params": {"echo": "lattice-carry-second",
                        "sleep_s": 8},
             "inputs": {"prior": {"stage": "first", "output": "txt"}},
             "expected": {"prior": "text"},
             "outputs": {"txt": "text"}}],
    }

    def test_stopped_resume_completes_with_carry(
            self, scratch_gateway: int) -> None:
        # stopped × resume → completed, and the resumed stage 2
        # carries stage 1's artifact (the pool re-seeded from the
        # durable record) — the prefix proof, end to end.
        port = scratch_gateway
        code, resp = _start(port, self._CHAIN_SLOW2)
        assert code in (200, 202), (code, resp)
        rid = resp["run_id"]
        time.sleep(2.5)  # stage 1 (fast) green; stage 2 mid-sleep
        code, stopped = _post(port, "v1/flows/stop/%s" % rid, {})
        assert code == 200, (code, stopped)
        final = _wait_terminal(port, rid)
        assert final.get("status") == "stopped", final
        stages = {s["id"]: s for s in final.get("stages", [])}
        assert stages["first"].get("status") == "completed", stages
        # resume under the SAME id: only stage 2 re-runs
        code, rresp = _post(port, "v1/flows/resume/%s" % rid, {})
        assert code in (200, 202), "resume refused: %s %s" % (code, rresp)
        rfinal = _wait_terminal(port, rid, timeout=60)
        assert rfinal.get("status") == "completed", rfinal
        rstages = {s["id"]: s for s in rfinal.get("stages", [])}
        second = rstages["second"]
        assert second.get("url", "").endswith(".txt"), second
        rel = second["url"].split("/v1/assets/runs/%s/" % rid, 1)[-1]
        req = urllib.request.Request(
            "http://127.0.0.1:%d/v1/assets/runs/%s/%s" % (port, rid, rel))
        with urllib.request.urlopen(req, timeout=15) as r:
            text = r.read().decode("utf-8")
        assert "lattice-carry-seed" in text \
            and "lattice-carry-second" in text, \
            "resumed stage lost the carry pool: %s" % text

    def test_failed_resume_reaches_same_stage_exactly(
            self, scratch_gateway: int) -> None:
        # failed × resume → the prefix re-runs from the first
        # non-green stage and the SAME stage fails with the SAME
        # exact message (stage 1 stays green; determinism held).
        port = scratch_gateway
        body = {"id": "lattice-refail", "stages": [
            self._stage("first", "lattice-refail-seed"),
            {"id": "second", "engine": "sim",
             "params": {"echo": "y", "fail": "lattice-refail-boom"},
             "inputs": {"prior": {"stage": "first", "output": "txt"}},
             "expected": {"prior": "text"},
             "outputs": {"txt": "text"}}]}
        code, resp = _start(port, body)
        assert code in (200, 202), (code, resp)
        rid = resp["run_id"]
        final = _wait_terminal(port, rid)
        assert final.get("status") == "failed", final
        assert "lattice-refail-boom" in str(final.get("error", "")), final
        code, rresp = _post(port, "v1/flows/resume/%s" % rid, {})
        assert code in (200, 202), "resume refused: %s %s" % (code, rresp)
        rfinal = _wait_terminal(port, rid, timeout=60)
        assert rfinal.get("status") == "failed", rfinal
        assert "lattice-refail-boom" in str(rfinal.get("error", "")), \
            rfinal
        rstages = {s["id"]: s for s in rfinal.get("stages", [])}
        assert rstages["first"].get("status") == "completed", \
            "resume re-ran the green prefix: %s" % (rstages,)

    def test_completed_resume_refused(self, scratch_gateway: int) -> None:
        port = scratch_gateway
        code, resp = _start(port, {
            "id": "lattice-cres", "stages": [
                self._stage("d", "lattice-cres-echo")]})
        assert code in (200, 202), (code, resp)
        rid = resp["run_id"]
        assert _wait_terminal(port, rid).get("status") == "completed"
        code, rresp = _post(port, "v1/flows/resume/%s" % rid, {})
        assert code in (400, 422), \
            "completed resume must 4xx: %s %s" % (code, rresp)

    def test_live_resume_refused(self, scratch_gateway: int) -> None:
        port = scratch_gateway
        code, resp = _start(port, {
            "id": "lattice-live", "stages": [
                self._stage("slow", "x", sleep_s=8)]})
        assert code in (200, 202), (code, resp)
        rid = resp["run_id"]
        time.sleep(1.0)
        code, rresp = _post(port, "v1/flows/resume/%s" % rid, {})
        assert code in (400, 422), \
            "live resume must 4xx: %s %s" % (code, rresp)
        # leave the scratch queue clean for the next cell
        code, stopped = _post(port, "v1/flows/stop/%s" % rid, {})
        assert code == 200, (code, stopped)
        assert _wait_terminal(port, rid).get("status") == "stopped"

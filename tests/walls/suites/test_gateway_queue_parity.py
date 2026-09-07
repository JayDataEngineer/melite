#!/usr/bin/env python3
"""test_gateway_queue_parity.py — P5 queue-core parity wall.

Proves the TypeScript single-module core
(plugins/gateway/src/queue/queue.ts, lock-first boot gate wired in
server.ts isMain) is the py queue machinery
(py/gateway.py: enqueue/dequeue ordering, serial-GPU single-writer
lock, retries, persistence/journal shapes, refusal texts):

  Phase L — lock contention (py STOPPED throughout this phase: no
    py gateway boots; the lock proves single-writer):
    L01 TS holder + TS contender: loser exits nonzero, stderr is
        the py-identical REFUSING line naming the holder pid.
    L02 py holder + TS contender vs TS holder + py contender: both
        REFUSING lines byte-equal modulo the pid digits.
    L03 two TS boots racing on a fresh root: exactly one READY,
        the other refuses (single-writer, no split brain).
    L04 dead-pid lock file: TS boots READY (steal), ledger carries
        server.lock_stolen, the file holds the new pid.
    L05 pid-checked release: killing the contender leaves the
        holder's lock intact; SIGTERM frees it; reboot acquires
        clean (no second lock_stolen row).
  Phase Q — ordering + serial worker:
    Q01 live py (engine-down fast-fail graph): two starts
        (first carries "priority":"high" — no priority lane
        exists, py ignores it, 202 FIFO) settle failed in order;
        run.queued ledger sequence is registration order.
    Q02 node QueueCore script: FIFO dequeue, active-block, settle
        mapping (completed/stopped/failed+"<Type>: <msg>"),
        queue_position, py-ordered snapshot, settled eviction
        (completed/failed past 500 oldest-first; running kept).
    Q03 node startWorker: FIFO execution, max concurrency 1, a
        failing middle run settles failed and the loop continues.
  Phase J — persistence/journal shapes (ASCII fixtures: byte pins):
    J01 ledger line: node appendLedger vs py ledger() — full line
        bytes equal modulo the ts digits.
    J02 registration bytes: py submit-written _flow.json +
        _request.json vs node sidecarDoc + verbatim body — key
        order + full bytes equal modulo run_id/created_at.
    J03 sweep bytes: py boot_sweep vs node bootSweep on fixture
        stale sidecars — swept FILE BYTES equal + run.swept rows
        equal modulo ts.
    J04 resurrect order: queued sidecars with shuffled created_at +
        a draftless orphan — py boot_resurrect order ==
        created_at-sorted == node plan; orphan skipped both sides.
  Phase R — refusal chain-order + lifecycle unknowns (dual-serve):
    R01 double-fault bodies take py's ENVELOPE-FIRST order both
        sides (bad-test beats missing-draft; bad-draft beats knob;
        knob beats ambiguity).
    R02 unknown-run family: status 404 / stop 400 / resume 400 /
        reproduce 400 byte-equal.
  Phase I — include_log blank ladder (dual-serve, the ctx.ts:366
    parse_qs parity fix):
    I01 ?include_log= (blank) -> no log_tail, both.
    I02 ?include_log=&include_log=1 -> tail present, both (the
        fixed divergence: blanks dropped, first non-blank wins).
    I03 ?include_log=0&include_log=1 -> no tail, both.
    I04 ?include_log=1&include_log= -> tail present, both.

No goldens: every leg compares py-vs-ts bytes (or ts-masked
digits). Fixtures stay ASCII (ensure_ascii parity), NaN-free, and
use INT created_at: integral floats are the one JSON text class
that cannot round-trip (py writes 100.0, JS writes 100 — same
double, different spelling), so byte legs pin ints while the
ordering legs still prove float order via plan/sort.

Py cites: lock 4405-4479 + main gate 4474-4480; order 1342 +
worker 1353-1371; evict 1137-1151; retries 1727-1780 +
_note_stage_retry 1906-1911; ledger 2241-2250 + atomic_write
2472-2475; sidecar 2124-2169; resurrect 2338-2376 + sweep
2378-2470; submit chain 1179-1260 + _strict_body 248-276 +
doors 279-335; stop 2040-2057 + resume 1913-1987 + reproduce
1989-2038; _h_queue 2893-2900; status log tail 2904-2982.

Date: 2026-09-07. Status: landed (P5 execution stroke).

Run: python3 tests/walls/suites/test_gateway_queue_parity.py
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

from _anchor import REPO, boot_scratch_gateway, reap_gateway

sys.dont_write_bytecode = True
sys.path.insert(0, str(REPO / "py"))

PASS = FAIL = 0
TS_SERVER = REPO / "plugins" / "gateway" / "src" / "server.ts"
TS_QUEUE = REPO / "plugins" / "gateway" / "src" / "queue" / "queue.ts"

WF = {"1": {"class_type": "EmptyLatentImage",
            "inputs": {"width": 64, "height": 64, "batch_size": 1}}}
STAGE = {"id": "gen", "engine": "comfyui", "params": {"workflow": WF}}


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


# ── node driver (one file, ops argv) ─────────────────────────────

DRIVER = """import * as q from %s;
const op = process.argv[2] ?? "";
const arg = JSON.parse(process.argv[3] ?? "{}");
const out = {};
if (op === "validate") {
  const drafts = arg.drafts ?? [];
  const r = q.validateSubmitEnvelope(arg.body,
    (id) => drafts.includes(id));
  out.result = r === null ? { ok: true } : r;
} else if (op === "coreScript") {
  const core = new q.QueueCore();
  const log = [];
  for (const step of arg.ops) {
    if (step[0] === "enqueue") {
      const run = { runId: step[1], status: "queued", error: "",
        createdAt: step[2] ?? 1, draftId: "d1", testFlag: false,
        stopFlag: !!step[3] };
      log.push(["pos", core.enqueue(run)]);
    } else if (step[0] === "dequeue") {
      const r = core.tryDequeue();
      log.push(["deq", r === null ? null : r.runId]);
    } else if (step[0] === "settle") {
      const r = core.runs.get(step[1]);
      log.push(["settled", core.settleRun(r, step[2] ?? null),
        r.error]);
    } else if (step[0] === "release") {
      core.releaseActive(); log.push(["released", true]);
    } else if (step[0] === "snapshot") {
      log.push(["snap", core.snapshot()]);
    } else if (step[0] === "pos") {
      log.push(["posq", core.queuePosition(step[1])]);
    } else if (step[0] === "evict") {
      log.push(["evicted", core.evictSettled().length,
        core.runs.has(step[1] ?? "")]);
    }
  }
  out.log = log;
} else if (op === "workerSim") {
  const core = new q.QueueCore();
  for (const id of arg.runs) {
    core.enqueue({ runId: id, status: "queued", error: "",
      createdAt: 1, draftId: "d1", testFlag: false, stopFlag: false });
  }
  const order = [];
  let conc = 0, maxConc = 0;
  const settled = {};
  const fails = arg.fail ?? {};
  const w = q.startWorker(core, {
    claim: () => core.tryDequeue(),
    release: () => core.releaseActive(),
    execute: async (run) => {
      order.push(run.runId); conc++;
      maxConc = Math.max(maxConc, conc);
      await new Promise((r) => setTimeout(r, 5));
      conc--;
      if (fails[run.runId]) throw new Error(fails[run.runId]);
    },
    onSettled: (run, status) => { settled[run.runId] = status; },
    pollMs: 5,
  });
  const t0 = Date.now();
  while (Object.keys(settled).length < arg.runs.length
      && Date.now() - t0 < 10000) {
    await new Promise((r) => setTimeout(r, 20));
  }
  w.stop();
  out.order = order; out.maxConc = maxConc; out.settled = settled;
} else if (op === "ledgerAppend") {
  q.appendLedger(arg.root, arg.event, arg.data, arg.nowS);
  const fs = await import("node:fs");
  const lines = fs.readFileSync(arg.root + "/output/_ledger.jsonl",
    "utf8").trim().split("\\n");
  out.line = lines[lines.length - 1];
} else if (op === "sidecarDoc") {
  out.doc = q.sidecarDoc(arg.fields);
} else if (op === "sweep") {
  out.swept = q.bootSweep(arg.root, arg.live ?? []);
} else if (op === "plan") {
  out.plan = q.planResurrect(arg.root);
} else if (op === "retry") {
  out.retry = q.shouldRetry(arg);
  out.note = q.noteStageRetry("run-x", "w", 0, arg.attempt,
    "boom-" + String(arg.attempt));
} else if (op === "lockAcquire") {
  out.result = q.acquireLock(arg.root);
} else if (op === "lockRelease") {
  out.result = q.releaseLock(arg.root);
}
console.log(JSON.stringify(out));
"""


def node_run(op: str, arg: dict, cwd=None):
    """Run the queue.ts driver; returns parsed last-line JSON."""
    d = Path(tempfile.gettempdir()) / ("wall-qparity-%d.mts" % os.getpid())
    if not d.is_file():
        d.write_text(DRIVER % json.dumps(TS_QUEUE.as_uri()))
    p = subprocess.run(
        [shutil.which("node") or "node", "--experimental-strip-types",
         "--no-warnings", str(d), op, json.dumps(arg)],
        cwd=str(cwd or REPO), capture_output=True, text=True, timeout=120)
    if p.returncode != 0:
        return None, "rc=%d %s" % (p.returncode, (p.stderr or "")[-300:])
    try:
        return json.loads(p.stdout.strip().splitlines()[-1]), ""
    except Exception as e:
        return None, "unparseable %r" % e


def py_run(src: str, env_root: str | None = None):
    """Run a python snippet in a subprocess; last stdout line is JSON."""
    env = dict(os.environ)
    if env_root is not None:
        env["MELITE_STATE_ROOT"] = env_root
    p = subprocess.run(
        [sys.executable, "-c", src], cwd=str(REPO),
        capture_output=True, text=True, timeout=120, env=env)
    if p.returncode != 0:
        return None, "rc=%d %s" % (p.returncode, (p.stderr or "")[-300:])
    try:
        return json.loads(p.stdout.strip().splitlines()[-1]), ""
    except Exception as e:
        return None, "unparseable %r" % e


def py_raw(src: str, env_root: str | None = None):
    """Run a python snippet; returns the RAW last stdout line."""
    env = dict(os.environ)
    if env_root is not None:
        env["MELITE_STATE_ROOT"] = env_root
    p = subprocess.run(
        [sys.executable, "-c", src], cwd=str(REPO),
        capture_output=True, text=True, timeout=120, env=env)
    if p.returncode != 0:
        return None, "rc=%d %s" % (p.returncode, (p.stderr or "")[-300:])
    try:
        return p.stdout.strip().splitlines()[-1], ""
    except Exception as e:
        return None, "unparseable %r" % e


def http(port: int, path: str, body=None, method: str = "GET"):
    data = None
    headers = {}
    if body is not None:
        data = body if isinstance(body, bytes) else json.dumps(body).encode()
        headers = {"Content-Type": "application/json"}
    req = urllib.request.Request("http://127.0.0.1:%d%s" % (port, path),
                                 data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:
        return None, ("TRANSPORT " + str(e)).encode()


def boot_ts(root: str):
    node = shutil.which("node")
    env = dict(os.environ, MELITE_STATE_ROOT=root)
    env.pop("COMFYUI_URL", None)
    proc = subprocess.Popen(
        [node, "--experimental-strip-types", "--no-warnings",
         str(TS_SERVER)],
        cwd=str(REPO), stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, start_new_session=True, env=env)
    assert proc.stdout is not None
    deadline = time.time() + 25
    while time.time() < deadline:
        line = proc.stdout.readline()
        if line.startswith("READY "):
            return int(line.split()[1]), proc
        if proc.poll() is not None:
            err = proc.stderr.read() if proc.stderr else ""
            raise RuntimeError("ts exited rc=%d %s"
                               % (proc.returncode, err[-300:]))
    proc.terminate()
    raise RuntimeError("ts server did not print READY")


def boot_py(root: str):
    env = dict(os.environ, MELITE_STATE_ROOT=root)
    env.pop("COMFYUI_URL", None)
    return boot_scratch_gateway(env=env)


def reap(proc) -> None:
    try:
        reap_gateway(proc)
    except Exception:
        try:
            proc.terminate()
        except Exception:
            pass


def mask_ts(line: str) -> str:
    return re.sub(r'"ts":\d+', '"ts":#', line)


def seed_draft(root: str, did: str = "d1") -> None:
    (Path(root) / "drafts").mkdir(parents=True, exist_ok=True)
    (Path(root) / "drafts" / (did + ".json")).write_text(
        json.dumps({"draft_id": did, "cards": [
            {"id": "gen", "kind": "exec",
             "label": "wall", "inputs": {},
             "expects": ["image"]}]}))


# ── Phase L: lock contention ─────────────────────────────────────

PY_HOLDER_SRC = (
    "import sys, time; sys.path.insert(0, 'py');"
    "import gateway as g;"
    "ok, note = g.acquire_lock();"
    "sys.stdout.write('READY %s\\n' % ok); sys.stdout.flush();"
    "time.sleep(25)"
)


def ts_contend(root: str, timeout: int = 20):
    """One TS boot attempt: (rc, stdout, stderr-tail)."""
    node = shutil.which("node")
    env = dict(os.environ, MELITE_STATE_ROOT=root)
    env.pop("COMFYUI_URL", None)
    p = subprocess.run(
        [node, "--experimental-strip-types", "--no-warnings",
         str(TS_SERVER)],
        cwd=str(REPO), capture_output=True, text=True,
        timeout=timeout, env=env)
    return p.returncode, p.stdout, (p.stderr or "")[-400:]


def phase_l() -> None:
    print("Phase L — lock contention (py STOPPED throughout)")
    # L01: TS holder + TS contender.
    r1 = tempfile.mkdtemp(prefix="wall-qp-lock1-")
    port1, holder = boot_ts(r1)
    try:
        rc, out, err = ts_contend(r1)
        line = [ln for ln in err.splitlines()
                if ln.startswith("[gateway] REFUSING TO START:")]
        want = ("[gateway] REFUSING TO START: gateway.lock held by "
                "live pid %d — one writer per state root" % holder.pid)
        check("L01 contender refuses py-identical text",
              rc != 0 and line == [want],
              "rc=%s out=%r err=%r" % (rc, out[-100:], err[-200:]))
    finally:
        reap(holder)
    # L02: py holder + TS contender (cross-language byte proof).
    r2 = tempfile.mkdtemp(prefix="wall-qp-lock2-")
    env = dict(os.environ, MELITE_STATE_ROOT=r2)
    pyh = subprocess.Popen(
        [sys.executable, "-c", PY_HOLDER_SRC], cwd=str(REPO),
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        text=True, start_new_session=True, env=env)
    try:
        assert pyh.stdout is not None
        assert pyh.stdout.readline().startswith("READY True")
        rc, out, err = ts_contend(r2)
        line = [ln for ln in err.splitlines()
                if ln.startswith("[gateway] REFUSING TO START:")]
        want = ("[gateway] REFUSING TO START: gateway.lock held by "
                "live pid %d — one writer per state root" % pyh.pid)
        check("L02 py-holder/TS-contender identical text",
              rc != 0 and line == [want],
              "rc=%s err=%r" % (rc, err[-200:]))
    finally:
        try:
            pyh.terminate()
        except Exception:
            pass
        pyh.wait()
    # L03: two TS boots racing — exactly one writer.
    r3 = tempfile.mkdtemp(prefix="wall-qp-lock3-")
    results: dict = {}

    def racer(tag: str) -> None:
        try:
            node = shutil.which("node")
            env = dict(os.environ, MELITE_STATE_ROOT=r3)
            env.pop("COMFYUI_URL", None)
            p = subprocess.Popen(
                [node, "--experimental-strip-types", "--no-warnings",
                 str(TS_SERVER)],
                cwd=str(REPO), stdout=subprocess.PIPE,
                stderr=subprocess.PIPE, text=True,
                start_new_session=True, env=env)
            assert p.stdout is not None
            first = p.stdout.readline()
            if first.startswith("READY "):
                results[tag] = ("ready", p)
            else:
                p.wait(timeout=25)
                err = p.stderr.read() if p.stderr else ""
                results[tag] = ("refused", p.returncode, err[-200:])
        except Exception as e:  # pragma: no cover — race harness
            results[tag] = ("error", repr(e)[:120])

    th = [threading.Thread(target=racer, args=(t,)) for t in ("a", "b")]
    for t in th:
        t.start()
    for t in th:
        t.join(timeout=60)
    kinds = sorted(v[0] for v in results.values())
    try:
        check("L03 racing boots split exactly one writer",
              kinds == ["ready", "refused"],
              "kinds=%r" % (results,))
        for tag, v in results.items():
            if v[0] == "refused":
                ok = (v[1] != 0 and "[gateway] REFUSING TO START: "
                      "gateway.lock held by live pid " in v[2])
                check("L03 loser text names the live holder", ok, repr(v))
    finally:
        for v in results.values():
            if v[0] == "ready":
                reap(v[1])
    # L04: dead-pid lock file steals clean.
    r4 = tempfile.mkdtemp(prefix="wall-qp-lock4-")
    (Path(r4) / "gateway.lock").write_text("424242")
    port4, srv4 = boot_ts(r4)
    try:
        rows = (Path(r4) / "output" / "_ledger.jsonl").read_text(
            ).splitlines()
        stolen = [json.loads(r) for r in rows
                  if json.loads(r).get("event") == "server.lock_stolen"]
        held = (Path(r4) / "gateway.lock").read_text().strip()
        check("L04 dead-pid steal boots + ledgers + re-pids",
              stolen and stolen[0]["data"].get("stale_pid") == 424242
              and held.isdigit() and int(held) != 424242,
              "stolen=%r held=%r" % (stolen, held))
    finally:
        reap(srv4)
    # L05: pid-checked release (contender death never frees holder).
    r5 = tempfile.mkdtemp(prefix="wall-qp-lock5-")
    port5, h5 = boot_ts(r5)
    try:
        rc, _, _ = ts_contend(r5)
        held = (Path(r5) / "gateway.lock").read_text().strip()
        check("L05 contender death keeps holder lock",
              rc != 0 and held == str(h5.pid),
              "rc=%s held=%r holder=%d" % (rc, held, h5.pid))
        n_before = len((Path(r5) / "output" / "_ledger.jsonl"
                           ).read_text().splitlines())
    finally:
        reap(h5)
    gone = not (Path(r5) / "gateway.lock").exists()
    port5b, h5b = boot_ts(r5)
    try:
        rows = (Path(r5) / "output" / "_ledger.jsonl").read_text(
            ).splitlines()[n_before:]
        steals = [r for r in rows
                  if json.loads(r).get("event") == "server.lock_stolen"]
        check("L05 SIGTERM frees; reboot acquires clean",
              gone and steals == [],
              "gone=%s steals=%r" % (gone, steals))
    finally:
        reap(h5b)


# ── Phase Q: ordering + serial worker ────────────────────────────

def poll_status(port: int, rid: str, deadline: float = 60.0):
    t0 = time.time()
    while time.time() - t0 < deadline:
        st, body = http(port, "/v1/flows/status/" + rid)
        if st == 200:
            doc = json.loads(body.decode())
            if doc.get("status") in ("completed", "failed", "stopped"):
                return doc
        time.sleep(1.0)
    return None


def phase_q() -> None:
    print("Phase Q — ordering + serial worker")
    # Q01: live py, engine-down fast-fail graph, priority ignored.
    rq = tempfile.mkdtemp(prefix="wall-qp-q-")
    seed_draft(rq)
    py_port, py_proc = boot_py(rq)
    try:
        b1 = {"draft_id": "d1", "priority": "high",
              "flow_inline": {"id": "q1", "stages": [STAGE]}}
        st1, r1 = http(py_port, "/v1/flows/start", b1, "POST")
        b2 = {"draft_id": "d1",
              "flow_inline": {"id": "q2", "stages": [STAGE]}}
        st2, r2 = http(py_port, "/v1/flows/start", b2, "POST")
        ok = st1 == 202 and st2 == 202
        rid1 = json.loads(r1.decode())["run_id"] if ok else ""
        rid2 = json.loads(r2.decode())["run_id"] if ok else ""
        check("Q01 priority-carrying start still 202 FIFO",
              ok, "st=%r/%r" % (st1, st2))
        if ok:
            d1 = poll_status(py_port, rid1)
            d2 = poll_status(py_port, rid2)
            rows = (Path(rq) / "output" / "_ledger.jsonl").read_text(
                ).splitlines()
            queued = [json.loads(r)["data"]["run_id"] for r in rows
                      if json.loads(r).get("event") == "run.queued"]
            check("Q01 both settle failed, queued ledger in order",
                  d1 is not None and d1["status"] == "failed"
                  and d2 is not None and d2["status"] == "failed"
                  and queued == [rid1, rid2],
                  "d1=%r d2=%r queued=%r"
                  % (d1, d2, queued))
    finally:
        reap(py_proc)
    # Q02: node QueueCore script vs py shapes.
    ops = [
        ["enqueue", "run-a", 3.0], ["enqueue", "run-b", 1.0],
        ["enqueue", "run-c", 2.0, True],
        ["snapshot"], ["pos", "run-b"], ["pos", "run-zzz"],
        ["dequeue"], ["dequeue"],
        ["settle", "run-a", None], ["release"],
        ["dequeue"],
        ["settle", "run-c", "Error: stop race"],
        ["settle", "run-b", "ValueError: bad engine reply"],
        ["release"], ["snapshot"],
    ]
    ts, note = node_run("coreScript", {"ops": ops})
    log = ts["log"] if ts else None
    want = [
        ["pos", 0], ["pos", 1], ["pos", 2],
        ["snap", {"queued": 3, "running": 0, "active": "",
                  "queued_ids": ["run-a", "run-b", "run-c"]}],
        ["posq", 1], ["posq", 0],
        ["deq", "run-a"], ["deq", None],
        ["settled", "completed", ""], ["released", True],
        ["deq", "run-b"],
        ["settled", "stopped", ""], ["settled", "failed",
                                     "ValueError: bad engine reply"],
        ["released", True],
        ["snap", {"queued": 1, "running": 0, "active": "",
                  "queued_ids": ["run-c"]}],
    ]
    check("Q02 core FIFO/active-block/settle/snapshot", log == want,
          "%r %s" % (log, note))
    # eviction: 501 settled rows + the live running row (501 past
    # the 500 cap sheds exactly the oldest settled; the running
    # row is never touched even though it is the newest).
    big = [["enqueue", "run-%04d" % i, float(i)] for i in range(501)]
    for i in range(501):
        big += [["dequeue"], ["settle", "run-%04d" % i,
                              None if i % 2 else "Error: x"],
                ["release"]]
    big += [["enqueue", "run-live", 9999.0],
            ["dequeue"], ["evict", "run-live"]]
    ts2, note2 = node_run("coreScript", {"ops": big})
    ev = ts2["log"][-1] if ts2 else None
    check("Q02 evict oldest settled, live running kept",
          ev == ["evicted", 1, True], "%r %s" % (ev, note2))
    # Q03: worker seriality, failure never sinks the loop.
    ts3, note3 = node_run("workerSim", {
        "runs": ["w1", "w2", "w3"], "fail": {"w2": "boom"}})
    check("Q03 worker FIFO, concurrency 1, continues past failure",
          ts3 is not None and ts3["order"] == ["w1", "w2", "w3"]
          and ts3["maxConc"] == 1
          and ts3["settled"] == {"w1": "completed", "w2": "failed",
                                 "w3": "completed"},
          "%r %s" % (ts3, note3))
    # Q04: retry table (stop never retries; attempts bound maxExtra).
    tt = []
    for att, mx, stop in [(0, 3, False), (2, 3, False), (3, 3, False),
                          (0, 3, True), (0, 0, False)]:
        r, n = node_run("retry", {"attempt": att, "maxExtra": mx,
                                  "stopSet": stop})
        tt.append(r["retry"] if r else None)
    check("Q04 shouldRetry table", tt == [True, True, False, False,
                                          False], repr(tt))
    r5, _ = node_run("retry", {"attempt": 2, "maxExtra": 5,
                               "stopSet": False})
    check("Q04 retry note ledger+stamp+bus shape",
          r5 is not None and r5["note"] == {
              "stagePatch": {"retries_used": 2,
                             "retry_last_error": "boom-2"},
              "ledgerEvent": "run.stage_retry",
              "ledgerData": {"run_id": "run-x", "stage": "w",
                             "attempt": 2, "error": "boom-2"},
              "busFrame": {"type": "stage", "stage": "w", "index": 0,
                           "retry": 2}}, repr(r5))


# ── Phase J: persistence/journal shapes ──────────────────────────

PY_LEDGER_SRC = (
    "import sys; sys.path.insert(0, 'py');"
    "import gateway as g;"
    "g.ledger('run.stage_retry', {'run_id': 'run-x', 'stage': 'w',"
    " 'attempt': 2, 'error': 'boom-2'});"
    "from pathlib import Path;"
    "print((g.LEDGER_PATH).read_text().strip().splitlines()[-1])"
)

PY_SUBMIT_SRC = (
    "import sys, json, asyncio; sys.path.insert(0, 'py');"
    "import gateway as g;"
    "gw = g.Gateway();"
    "run = asyncio.run(gw.submit(%s));"
    "from pathlib import Path;"
    "d = Path(%r) / 'output' / run.run_id;"
    "print(json.dumps({'run_id': run.run_id,"
    " 'flow': (d / '_flow.json').read_text(),"
    " 'req': (d / '_request.json').read_text()}))"
)

PY_SWEEP_SRC = (
    "import sys, json; sys.path.insert(0, 'py');"
    "from pathlib import Path;"
    "import gateway as g;"
    "out = Path(%s) / 'output';"
    "before = {p.parent.name: p.read_bytes()"
    " for p in sorted(out.glob('run-*/_flow.json'))};"
    "n = g.boot_sweep(set());"
    "after = {p.parent.name: p.read_bytes()"
    " for p in sorted(out.glob('run-*/_flow.json'))};"
    "changed = sorted(k for k in after if after[k] != before.get(k));"
    "print(json.dumps({'n': n, 'swept': changed}))"
)

PY_RESURRECT_SRC = (
    "import sys, json; sys.path.insert(0, 'py');"
    "import gateway as g;"
    "gw = g.Gateway();"
    "n = g.boot_resurrect(gw);"
    "print(json.dumps({'n': n, 'order': gw.order}))"
)


def stale_fixture(root: str) -> None:
    out = Path(root) / "output"
    out.mkdir(parents=True, exist_ok=True)
    run = {
        "run_id": "run-stale1", "status": "running", "error": "",
        "stages": [{"id": "w", "name": "w", "index": 0,
                    "status": "running", "outputs": {},
                    "expected": {}}],
        "skipped_stages": [], "artifacts": [],
        "created_at": 100, "test": False, "draft_id": "d1",
        "pipeline": "wall", "graph": []}
    (out / "run-stale1").mkdir(exist_ok=True)
    (out / "run-stale1" / "_flow.json").write_text(
        json.dumps(run, indent=2))
    qd = dict(run, run_id="run-stale2", status="queued")
    (out / "run-stale2").mkdir(exist_ok=True)
    (out / "run-stale2" / "_flow.json").write_text(
        json.dumps(qd, indent=2))
    done = dict(run, run_id="run-done", status="completed")
    (out / "run-done").mkdir(exist_ok=True)
    (out / "run-done" / "_flow.json").write_text(
        json.dumps(done, indent=2))
    (out / "run-bad").mkdir(exist_ok=True)
    (out / "run-bad" / "_flow.json").write_text("{nope")


def ledger_rows(root: str, event: str):
    rows = []
    try:
        lines = (Path(root) / "output" / "_ledger.jsonl"
                 ).read_text().splitlines()
    except OSError:
        return rows
    for ln in lines:
        try:
            obj = json.loads(ln)
        except ValueError:
            continue
        if obj.get("event") == event:
            rows.append(obj.get("data"))
    return rows


def phase_j() -> None:
    print("Phase J — persistence/journal shapes")
    # J01: ledger line bytes (modulo ts).
    rj = tempfile.mkdtemp(prefix="wall-qp-j1-")
    pj = tempfile.mkdtemp(prefix="wall-qp-j1py-")
    data = {"run_id": "run-x", "stage": "w", "attempt": 2,
            "error": "boom-2"}
    ts, note = node_run("ledgerAppend", {
        "root": rj, "event": "run.stage_retry", "data": data,
        "nowS": 1700000000})
    py, pnote = py_raw(PY_LEDGER_SRC, pj)
    check("J01 ledger line bytes modulo ts",
          ts is not None and py is not None
          and mask_ts(ts["line"]) == mask_ts(py),
          "ts=%r py=%r %s %s" % (ts, py, note, pnote))
    # J02: registration bytes (modulo run_id/created_at).
    rk = tempfile.mkdtemp(prefix="wall-qp-j2-")
    seed_draft(rk)
    body = {"draft_id": "d1",
            "flow_inline": {"id": "reg", "stages": [STAGE]}}
    py2, pnote2 = py_run(PY_SUBMIT_SRC % (repr(body), rk), rk)
    ok = py2 is not None
    if ok:
        pyflow = json.loads(py2["flow"])
        rid = py2["run_id"]
        pk = list(pyflow.keys())
        chk = [
            ("run_id", pyflow["run_id"] == rid),
            ("status", pyflow["status"] == "queued"),
            ("error", pyflow["error"] == ""),
            ("stages", pyflow["stages"] == [
                {"id": "gen", "name": "gen", "index": 0,
                 "status": "pending", "outputs": {"default": "image"},
                 "expected": {}}]),
            ("skipped", pyflow["skipped_stages"] == []),
            ("artifacts", pyflow["artifacts"] == []),
            ("test", pyflow["test"] is False),
            ("draft", pyflow["draft_id"] == "d1"),
            ("pipeline", pyflow["pipeline"] == "reg"),
        ]
        check("J02 py sidecar registration rows sane",
              all(v for _, v in chk),
              repr([k for k, v in chk if not v]))
        exp_graph = [{"id": "gen", "type": "comfyui",
                      "input_from": [], "input_names": {},
                      "outputs": {"default": "image"},
                      "params": {"workflow": WF}}]
        fields = {"runId": rid, "status": "queued", "error": "",
                  "stages": pyflow["stages"],
                  "skippedStages": [], "artifacts": [],
                  "createdAt": pyflow["created_at"], "testFlag": False,
                  "draftId": "d1", "pipeline": "reg",
                  "graph": exp_graph}
        ts2, note2 = node_run("sidecarDoc", {"fields": fields})
        same = (ts2 is not None
                and list(ts2["doc"].keys()) == pk
                and {k: v for k, v in ts2["doc"].items()
                     if k not in ("run_id",)} == {
                    k: v for k, v in pyflow.items()
                    if k not in ("run_id",)})
        check("J02 node sidecarDoc key order + rows mirror py",
              same, "%s %s" % (list(ts2["doc"].keys()) if ts2 else None,
                               note2))
        pyreq = json.loads(py2["req"])
        check("J02 _request.json verbatim body keys",
              list(pyreq.keys()) == ["draft_id", "flow_inline"]
              and pyreq["draft_id"] == "d1", repr(pyreq))
    # J03: sweep bytes on stale fixtures.
    rs = tempfile.mkdtemp(prefix="wall-qp-j3-")
    stale_fixture(rs)
    rp = Path(tempfile.mkdtemp(prefix="wall-qp-j3py-"))
    shutil.copytree(rs, rp / "seed", dirs_exist_ok=True)
    shutil.copytree(str(rp / "seed"), str(rp), dirs_exist_ok=True)
    shutil.rmtree(rp / "seed")
    ts3, note3 = node_run("sweep", {"root": rs, "live": []})
    py3, pnote3 = py_run(PY_SWEEP_SRC % repr(str(rp)), str(rp))
    files_same = all(
        ((Path(rs) / "output" / rid / "_flow.json").read_text() ==
         (rp / "output" / rid / "_flow.json").read_text())
        for rid in ("run-stale1", "run-stale2", "run-done"))
    bad_untouched = ((rp / "output" / "run-bad" / "_flow.json"
                      ).read_text() == "{nope")
    # run-done sweeps on BOTH sides (completed top-level, but the
    # sweep recurses: the nested running stage settles failed while
    # the terminal top-level status stands — the documented
    # recursion, pinned here, never assumed).
    done_doc = json.loads((rp / "output" / "run-done" / "_flow.json"
                           ).read_text())
    check("J03 swept file bytes py==ts, terminal/bad untouched",
          ts3 is not None and py3 is not None
          and sorted(ts3["swept"]) == sorted(py3["swept"])
          == ["run-done", "run-stale1", "run-stale2"]
          and files_same
          and done_doc["status"] == "completed"
          and done_doc["stages"][0]["status"] == "failed"
          and bad_untouched,
          "ts=%r py=%r same=%s %s %s" % (ts3, py3, files_same,
                                         note3, pnote3))
    tsw = ledger_rows(rs, "run.swept")
    pyw = ledger_rows(str(rp), "run.swept")
    norm = sorted(json.dumps(d, sort_keys=True) for d in tsw)
    check("J03 run.swept ledger data agree",
          norm == sorted(json.dumps(d, sort_keys=True) for d in pyw),
          "ts=%r py=%r" % (tsw, pyw))
    # J04: resurrect order + orphan skip.
    rr = tempfile.mkdtemp(prefix="wall-qp-j4-")
    out = Path(rr) / "output"
    out.mkdir(parents=True, exist_ok=True)
    (Path(rr) / "drafts").mkdir(parents=True, exist_ok=True)
    (Path(rr) / "drafts" / "d1.json").write_text("{}")
    graph = [{"id": "g", "type": "comfyui", "input_from": [],
              "input_names": {}, "outputs": {}, "params": {}}]
    for rid, created, did in [("run-q1", 300, "d1"),
                              ("run-q2", 100, "d1"),
                              ("run-q3", 200, "d1"),
                              ("run-orph", 50, "gone")]:
        doc = {"run_id": rid, "status": "queued", "error": "",
               "stages": [], "skipped_stages": [], "artifacts": [],
               "created_at": created, "test": False, "draft_id": did,
               "pipeline": "wall", "graph": graph}
        (out / rid).mkdir(exist_ok=True)
        (out / rid / "_flow.json").write_text(json.dumps(doc))
        (out / rid / "_request.json").write_text(
            json.dumps({"draft_id": did}))
    rp2 = Path(tempfile.mkdtemp(prefix="wall-qp-j4py-"))
    shutil.copytree(rr, rp2 / "seed", dirs_exist_ok=True)
    for child in (rp2 / "seed").iterdir():
        shutil.move(str(child), str(rp2 / child.name))
    (rp2 / "seed").rmdir()
    ts4, note4 = node_run("plan", {"root": rr})
    py4, pnote4 = py_run(PY_RESURRECT_SRC, str(rp2))
    check("J04 resurrect FIFO-by-created_at, orphan skipped",
          ts4 is not None and py4 is not None
          and ts4["plan"]["order"] == ["run-q2", "run-q3", "run-q1"]
          == py4["order"]
          and ts4["plan"]["orphans"] == ["run-orph"],
          "ts=%r py=%r %s %s" % (ts4, py4, note4, pnote4))


# ── Phase R: refusal chain-order + lifecycle unknowns ────────────

def refused(st: int | None, body: bytes):
    try:
        return st, json.loads(body.decode())
    except Exception:
        return st, {"_raw": body[:160].decode("utf8", "replace")}


def phase_r() -> None:
    print("Phase R — refusal chain-order + lifecycle unknowns")
    rp = tempfile.mkdtemp(prefix="wall-qp-rpy-")
    rt = tempfile.mkdtemp(prefix="wall-qp-rts-")
    seed_draft(rp)
    seed_draft(rt)
    py_port, py_proc = boot_py(rp)
    ts_port, ts_proc = boot_ts(rt)
    try:
        vecs = [
            ("bad-test-beats-missing-draft",
             {"test": "yes"}, "bad_envelope"),
            ("bad-draft-beats-knob",
             {"draft_id": "BAD ID!!", "flow": "x",
              "start_from": 1}, "draft_malformed"),
            ("knob-beats-ambiguity",
             {"draft_id": "d1", "flow": "x", "model": "y",
              "overrides": {}}, "invalid_request"),
        ]
        for name, body, code in vecs:
            ps, pb = refused(*http(py_port, "/v1/flows/start", body,
                                   "POST"))
            ts, tb = refused(*http(ts_port, "/v1/flows/start", body,
                                   "POST"))
            check("R01 %s byte-equal" % name,
                  ps == ts and pb == tb and ps == 400
                  and pb.get("code") == code,
                  "py=(%r,%r) ts=(%r,%r)" % (ps, pb, ts, tb))
        # lifecycle unknowns.
        legs = [
            ("status-unknown", "GET", "/v1/flows/status/run-nope",
             None, 404),
            ("stop-unknown", "POST", "/v1/flows/stop/run-nope",
             None, 400),
            ("resume-unknown", "POST", "/v1/flows/resume/run-nope",
             None, 400),
            ("reproduce-unknown", "POST",
             "/v1/flows/reproduce/run-nope", None, 400),
        ]
        for name, meth, path, body, want_st in legs:
            ps, pb = refused(*http(py_port, path, body, meth))
            ts, tb = refused(*http(ts_port, path, body, meth))
            check("R02 %s byte-equal" % name,
                  ps == ts == want_st and pb == tb,
                  "py=(%r,%r) ts=(%r,%r)" % (ps, pb, ts, tb))
    finally:
        reap(py_proc)
        reap(ts_proc)


# ── Phase I: include_log blank ladder ────────────────────────────

def fixture_status_run(root: str) -> str:
    rid = "run-logladder1"
    out = Path(root) / "output" / rid
    out.mkdir(parents=True, exist_ok=True)
    doc = {"run_id": rid, "status": "failed",
           "error": "EngineError: down",
           "stages": [{"id": "w", "name": "w", "index": 0,
                       "status": "failed", "outputs": {},
                       "expected": {},
                       "ws_log": ["line-a", "line-b"]}],
           "skipped_stages": [], "artifacts": [],
           "created_at": 100, "test": False,
           "draft_id": "d1", "pipeline": "wall", "graph": []}
    (out / "_flow.json").write_text(json.dumps(doc, indent=2))
    return rid


def has_tail(port: int, rid: str, qs: str):
    st, body = http(port, "/v1/flows/status/" + rid + qs)
    if st != 200:
        return None
    return "log_tail" in json.loads(body.decode())


def phase_i() -> None:
    print("Phase I — include_log blank ladder")
    rp = tempfile.mkdtemp(prefix="wall-qp-ipy-")
    rt = tempfile.mkdtemp(prefix="wall-qp-its-")
    rid = fixture_status_run(rp)
    fixture_status_run(rt)
    py_port, py_proc = boot_py(rp)
    ts_port, ts_proc = boot_ts(rt)
    try:
        for name, qs, want in [
            ("blank-drops", "?include_log=", False),
            ("blank-then-1", "?include_log=&include_log=1", True),
            ("0-then-1", "?include_log=0&include_log=1", False),
            ("1-then-blank", "?include_log=1&include_log=", True),
        ]:
            ph = has_tail(py_port, rid, qs)
            th = has_tail(ts_port, rid, qs)
            check("I %s py==ts==%s" % (name, want),
                  ph is want and th is want, "py=%r ts=%r" % (ph, th))
    finally:
        reap(py_proc)
        reap(ts_proc)


def main() -> int:
    global PASS, FAIL
    phase_l()
    phase_q()
    phase_j()
    phase_r()
    phase_i()
    print("queue_parity: %d passed, %d failed" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())

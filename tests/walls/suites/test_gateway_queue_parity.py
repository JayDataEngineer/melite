#!/usr/bin/env python3
"""test_gateway_queue_parity.py — P5 queue-core wall (TS-ONLY).

Pins the TypeScript single-module core
(packages/queue/src/queue/queue.ts — the serial-GPU state machine:
enqueue/dequeue ordering, single-writer lock, retries,
persistence/journal shapes, refusal texts; the lock-first boot gate
is wired in apps/gateway/src/main.ts):

  Phase L — lock contention (holders boot via boot_scratch_gateway;
    contenders use raw node runs so the refusal stderr stays
    observable):
    L01 TS holder + TS contender: loser exits nonzero, stderr is
        the REFUSING line naming the holder pid.
    L02 TS holder + TS contender (holder-pid shape): the REFUSING
        line names the live holder pid (regex) and gateway.lock
        still holds that pid.
    L03 two TS boots racing on a fresh root: exactly one READY,
        the other refuses (single-writer, no split brain).
    L04 dead-pid lock file: TS boots READY (steal), ledger carries
        server.lock_stolen, the file holds the new pid.
    L05 pid-checked release: killing the contender leaves the
        holder's lock intact; SIGTERM frees it; reboot acquires
        clean (no second lock_stolen row).
  Phase Q — ordering + serial worker (TS boot via
    boot_scratch_gateway against a slow-failing stub engine):
    Q01 two starts (first carries "priority":"high" — no priority
        lane exists, TS ignores it, 202 FIFO): receipts read
        queued with distinct run ids; while the stub blocks run 1,
        /v1/queue shows it active with run 2 queued behind (FIFO
        registration order); both settle failed (ComfyError).
    Q02 node QueueCore script: FIFO dequeue, active-block, settle
        mapping (completed/stopped/failed+"<Type>: <msg>"),
        queue_position, ordered snapshot, settled eviction
        (completed/failed past 500 oldest-first; running kept).
    Q03 node startWorker: FIFO execution, max concurrency 1, a
        failing middle run settles failed and the loop continues.
    Q04 retry table (stop never retries; attempts bound maxExtra)
        + the retry note ledger+stamp+bus shape.
  Phase J — persistence/journal shapes (TS-vs-literal, plus frozen
    goldens in golden_ts/test_gateway_queue_parity/ + causes.md
    there; fixtures stay ASCII, NaN-free, INT created_at):
    J01 ledger line: node appendLedger exact line bytes (pinned
        nowS) vs the literal.
    J02 registration: node sidecarDoc key order + full doc vs
        literals (the flow_inline preview writes no sidecar —
        doors/flowsRun.ts served shape — so registration bytes
        pin at the sidecarDoc unit).
    J03 sweep bytes: node bootSweep on fixture stale sidecars —
        swept ids vs literal, swept FILE BYTES vs goldens,
        run.swept rows (ts-masked) vs golden; the completed
        top-level stands while its nested running stage settles
        failed (the documented recursion); the unparseable
        sidecar stays untouched.
    J04 resurrect order: queued sidecars with shuffled created_at +
        a draftless orphan — node plan order + orphans vs literals.
    J05 rebuild values: plan order + orphans vs literals
        (graph-missing/[] res + list-_request res + draft-DIRECTORY
        orphan + numeric-string created + raise-road skip); rebuilt
        values for the verbatim-rows and graph-missing records vs
        literals; garbage created_at coerces 0 and boots first
        (recorded history: the retired py oracle crashed its whole
        boot on this class — never ported, TS boots where py
        could not).
  Phase R — refusal chain-order + lifecycle unknowns (single-serve
    TS vs frozen golden bytes: status literal + body golden):
    R01 double-fault bodies take the ENVELOPE-FIRST order
        (bad-test beats missing-draft; bad-draft beats knob;
        knob beats ambiguity).
    R02 unknown-run family: status 404 / stop 400 / resume 400 /
        reproduce 400.
  Phase I — include_log blank ladder (single-serve TS vs literal
    tail present/absent):
    I01 ?include_log= (blank) -> no log_tail.
    I02 ?include_log=&include_log=1 -> tail present (blanks
        dropped, first non-blank wins).
    I03 ?include_log=0&include_log=1 -> no tail.
    I04 ?include_log=1&include_log= -> tail present.

No py legs: every leg pins TS-vs-literal or TS-vs-golden bytes.
Fixtures use INT created_at: integral floats are the one JSON text
class that cannot round-trip (JS writes 100 where py wrote 100.0 —
same double, different spelling), so byte legs pin ints while the
ordering legs still prove float order via plan/sort.

TS cites: queue.ts refuseStartLine/acquireLock/releaseLock (lock),
QueueCore/snapshot/queuePosition/evictSettled (ordering),
startWorker (serial worker), shouldRetry/noteStageRetry (retries),
appendLedger (journal), sidecarDoc (registration), bootSweep
(sweep), planResurrect/buildRebuiltRun (resurrect/rebuild),
validateSubmitEnvelope/refusal envelope (refusals);
doors/flowsRun.ts (flow_inline preview serve: no-sidecar start,
serial pump); apps/gateway/src/main.ts (single-writer boot gate).

Date: 2026-09-07. Status: landed (P5 execution stroke).
ORACLE DEATH 2026-09-08: re-derived TS-ONLY per the operator order
"we do not need parity, we need to migrate, not keep the old
machinery" — py legs deleted, TS behavior pinned via literals +
frozen goldens.
Date: 2026-09-08. Status: landed (oracle-death re-derivation).

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
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from _anchor import REPO, boot_scratch_gateway, reap_gateway

sys.dont_write_bytecode = True

PASS = FAIL = 0
TS_SERVER = REPO / "apps" / "gateway" / "src" / "main.ts"
TS_QUEUE = REPO / "packages" / "queue" / "src" / "queue" / "queue.ts"
GOLDEN_DIR = (REPO / "tests" / "walls" / "suites" / "golden_ts" /
              "test_gateway_queue_parity")

WF = {"1": {"class_type": "EmptyLatentImage",
            "inputs": {"width": 64, "height": 64, "batch_size": 1}}}
STAGE = {"id": "gen", "engine": "comfyui", "params": {"workflow": WF}}


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def golden(name: str) -> bytes:
    return (GOLDEN_DIR / name).read_bytes()


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
} else if (op === "build") {
  try {
    const r = q.buildRebuiltRun(arg.root, arg.runId);
    out.built = { draft_id: r.draftId, stages: r.stages,
      skipped_stages: r.skippedStages, artifacts: r.artifacts };
  } catch (e) {
    out.built = null;
  }
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


def boot_holder(root: str):
    """Boot the TS holder on a pinned root (caller reaps)."""
    env = dict(os.environ, MELITE_STATE_ROOT=root)
    env.pop("COMFYUI_URL", None)
    return boot_scratch_gateway(env=env)


def mask_ts(line: str) -> str:
    return re.sub(r'"ts":\d+', '"ts":#', line)


def seed_draft(root: str, did: str = "d1") -> None:
    (Path(root) / "drafts").mkdir(parents=True, exist_ok=True)
    (Path(root) / "drafts" / (did + ".json")).write_text(
        json.dumps({"draft_id": did, "cards": [
            {"id": "gen", "kind": "exec",
             "label": "wall", "inputs": {},
             "expects": ["image"]}]}))


# ── slow-failing stub engine (Q01: deterministic FIFO window) ────
# Blocks /prompt so run 1 stays active while run 2 queues behind it,
# then fails the prompt: both runs settle failed, in order.

class _SlowFailHandler(BaseHTTPRequestHandler):
    def log_message(self, *a: object) -> None:
        pass

    def _send(self, obj: object, code: int = 200) -> None:
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_POST(self) -> None:
        n = int(self.headers.get("content-length") or 0)
        if n:
            self.rfile.read(n)
        if self.path == "/prompt":
            time.sleep(3)
            return self._send({"error": "stub down"}, code=500)
        return self._send({"error": "stub: no such route"}, code=404)

    def do_GET(self) -> None:
        return self._send({"error": "stub: no such route"}, code=404)


def boot_stub() -> tuple[str, ThreadingHTTPServer]:
    srv = ThreadingHTTPServer(("127.0.0.1", 0), _SlowFailHandler)
    srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return "http://127.0.0.1:%d" % srv.server_address[1], srv


# ── Phase L: lock contention ─────────────────────────────────────

def ts_contend(root: str, timeout: int = 20):
    """One TS boot attempt: (rc, stdout, stderr-tail). Raw run (not
    the scratch helper — the contender's refusal stderr is the
    assertion, and the helper discards it)."""
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
    print("Phase L — lock contention (TS holders throughout)")
    # L01: TS holder + TS contender.
    r1 = tempfile.mkdtemp(prefix="wall-qp-lock1-")
    port1, holder = boot_holder(r1)
    try:
        rc, out, err = ts_contend(r1)
        line = [ln for ln in err.splitlines()
                if ln.startswith("[gateway] REFUSING TO START:")]
        want = ("[gateway] REFUSING TO START: gateway.lock held by "
                "live pid %d — one writer per state root" % holder.pid)
        check("L01 contender refuses with holder-naming text",
              rc != 0 and line == [want],
              "rc=%s out=%r err=%r" % (rc, out[-100:], err[-200:]))
    finally:
        reap_gateway(holder)
    # L02: TS holder + TS contender (holder-pid shape leg): the
    # REFUSING line names the live holder pid and the lock file
    # still pins it (converted from the retired py-holder leg —
    # the cross-language byte proof died with the py oracle; the
    # holder-pid contract it proved now pins TS-only).
    r2 = tempfile.mkdtemp(prefix="wall-qp-lock2-")
    port2, holder2 = boot_holder(r2)
    try:
        rc, out, err = ts_contend(r2)
        line = [ln for ln in err.splitlines()
                if ln.startswith("[gateway] REFUSING TO START:")]
        shape = (len(line) == 1 and re.fullmatch(
            r"\[gateway\] REFUSING TO START: gateway.lock held by "
            r"live pid \d+ — one writer per state root", line[0])
            is not None)
        names_holder = (len(line) == 1
                        and line[0].endswith("live pid %d — one writer "
                                             "per state root" % holder2.pid))
        held = (Path(r2) / "gateway.lock").read_text().strip()
        check("L02 refusal names the live holder pid, lock pins it",
              rc != 0 and shape and names_holder
              and held == str(holder2.pid),
              "rc=%s line=%r held=%r holder=%d"
              % (rc, line, held, holder2.pid))
    finally:
        reap_gateway(holder2)
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
                reap_gateway(v[1])
    # L04: dead-pid lock file steals clean.
    r4 = tempfile.mkdtemp(prefix="wall-qp-lock4-")
    (Path(r4) / "gateway.lock").write_text("424242")
    port4, srv4 = boot_holder(r4)
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
        reap_gateway(srv4)
    # L05: pid-checked release (contender death never frees holder).
    r5 = tempfile.mkdtemp(prefix="wall-qp-lock5-")
    port5, h5 = boot_holder(r5)
    try:
        rc, _, _ = ts_contend(r5)
        held = (Path(r5) / "gateway.lock").read_text().strip()
        check("L05 contender death keeps holder lock",
              rc != 0 and held == str(h5.pid),
              "rc=%s held=%r holder=%d" % (rc, held, h5.pid))
        n_before = len((Path(r5) / "output" / "_ledger.jsonl"
                           ).read_text().splitlines())
    finally:
        reap_gateway(h5)
    gone = not (Path(r5) / "gateway.lock").exists()
    port5b, h5b = boot_holder(r5)
    try:
        rows = (Path(r5) / "output" / "_ledger.jsonl").read_text(
            ).splitlines()[n_before:]
        steals = [r for r in rows
                  if json.loads(r).get("event") == "server.lock_stolen"]
        check("L05 SIGTERM frees; reboot acquires clean",
              gone and steals == [],
              "gone=%s steals=%r" % (gone, steals))
    finally:
        reap_gateway(h5b)


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
    # Q01: TS boot against the slow-failing stub engine. The first
    # start carries "priority":"high" — no priority lane exists, TS
    # ignores it (receipt is bare run_id + status), FIFO registration
    # order shows while run 1 is stub-blocked, and both settle
    # failed (ComfyError fast-fail on the stub 500).
    stub_url, stub = boot_stub()
    try:
        rq = tempfile.mkdtemp(prefix="wall-qp-q-")
        seed_draft(rq)
        env = dict(os.environ, MELITE_STATE_ROOT=rq,
                   COMFYUI_URL=stub_url)
        port, proc = boot_scratch_gateway(env=env)
        try:
            b1 = {"draft_id": "d1", "priority": "high",
                  "flow_inline": {"id": "q1", "stages": [STAGE]}}
            st1, r1 = http(port, "/v1/flows/start", b1, "POST")
            b2 = {"draft_id": "d1",
                  "flow_inline": {"id": "q2", "stages": [STAGE]}}
            st2, r2 = http(port, "/v1/flows/start", b2, "POST")
            ok = st1 == 202 and st2 == 202
            check("Q01 priority-carrying start still 202 FIFO",
                  ok, "st=%r/%r" % (st1, st2))
            if ok:
                doc1 = json.loads(r1.decode())
                doc2 = json.loads(r2.decode())
                rid1, rid2 = doc1["run_id"], doc2["run_id"]
                check("Q01 receipts bare (no priority lane), ids "
                      "distinct",
                      sorted(doc1.keys()) == ["run_id", "status"]
                      and sorted(doc2.keys()) == ["run_id", "status"]
                      and doc1["status"] == "queued"
                      and doc2["status"] == "queued"
                      and rid1 != rid2,
                      "r1=%r r2=%r" % (doc1, doc2))
                stq, qraw = http(port, "/v1/queue")
                try:
                    q = json.loads(qraw.decode())
                except Exception:
                    q = {}
                check("Q01 stub-blocked run 1 active, run 2 queued "
                      "behind (FIFO)",
                      stq == 200 and q.get("active") == rid1
                      and q.get("queued_ids") == [rid2],
                      "q=%r" % (q,))
                d1 = poll_status(port, rid1)
                d2 = poll_status(port, rid2)
                check("Q01 both settle failed (ComfyError fast-fail)",
                      d1 is not None and d1["status"] == "failed"
                      and "ComfyError" in str(d1.get("error", ""))
                      and d2 is not None and d2["status"] == "failed"
                      and "ComfyError" in str(d2.get("error", "")),
                      "d1=%r d2=%r"
                      % ((d1 or {}).get("status"),
                         (d2 or {}).get("status")))
        finally:
            reap_gateway(proc)
    finally:
        stub.shutdown()
    # Q02: node QueueCore script vs hardcoded want literals.
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
    # J01: ledger line exact bytes (pinned nowS) vs the literal.
    rj = tempfile.mkdtemp(prefix="wall-qp-j1-")
    data = {"run_id": "run-x", "stage": "w", "attempt": 2,
            "error": "boom-2"}
    ts, note = node_run("ledgerAppend", {
        "root": rj, "event": "run.stage_retry", "data": data,
        "nowS": 1700000000})
    want_line = ('{"ts":1700000000,"event":"run.stage_retry",'
                 '"data":{"run_id": "run-x", "stage": "w", '
                 '"attempt": 2, "error": "boom-2"}}')
    check("J01 ledger line exact bytes",
          ts is not None and ts["line"] == want_line,
          "ts=%r %s" % (ts, note))
    # J02: node sidecarDoc key order + full doc vs literals (the
    # py-submit registration leg died with the py oracle; the
    # flow_inline preview writes no sidecar — doors/flowsRun.ts
    # served shape — so registration bytes pin at sidecarDoc).
    stages = [{"id": "gen", "name": "gen", "index": 0,
               "status": "pending", "outputs": {"default": "image"},
               "expected": {}}]
    exp_graph = [{"id": "gen", "type": "comfyui",
                  "input_from": [], "input_names": {},
                  "outputs": {"default": "image"},
                  "params": {"workflow": WF}}]
    fields = {"runId": "run-j02", "status": "queued", "error": "",
              "stages": stages, "skippedStages": [], "artifacts": [],
              "createdAt": 100, "testFlag": False, "draftId": "d1",
              "pipeline": "reg", "graph": exp_graph}
    ts2, note2 = node_run("sidecarDoc", {"fields": fields})
    want_keys = ["run_id", "status", "error", "stages",
                 "skipped_stages", "artifacts", "created_at",
                 "test", "draft_id", "pipeline", "graph"]
    want_doc = {"run_id": "run-j02", "status": "queued", "error": "",
                "stages": stages, "skipped_stages": [],
                "artifacts": [], "created_at": 100, "test": False,
                "draft_id": "d1", "pipeline": "reg",
                "graph": exp_graph}
    check("J02 sidecarDoc key order + rows pin TS literals",
          ts2 is not None and list(ts2["doc"].keys()) == want_keys
          and ts2["doc"] == want_doc,
          "%s %s" % (list(ts2["doc"].keys()) if ts2 else None,
                     note2))
    # J03: sweep bytes on stale fixtures (TS bootSweep vs goldens).
    rs = tempfile.mkdtemp(prefix="wall-qp-j3-")
    stale_fixture(rs)
    ts3, note3 = node_run("sweep", {"root": rs, "live": []})
    check("J03 swept ids pin TS literal",
          ts3 is not None
          and sorted(ts3["swept"]) == ["run-done", "run-stale1",
                                      "run-stale2"],
          "ts=%r %s" % (ts3, note3))
    files_ok = all(
        (Path(rs) / "output" / rid / "_flow.json").read_bytes()
        == golden("j03-%s.flow.json" % rid)
        for rid in ("run-stale1", "run-stale2", "run-done"))
    check("J03 swept file bytes match goldens", files_ok, note3)
    bad_untouched = ((Path(rs) / "output" / "run-bad" / "_flow.json"
                      ).read_text() == "{nope")
    # run-done sweeps too (completed top-level, but the sweep
    # recurses: the nested running stage settles failed while the
    # terminal top-level status stands — the documented recursion,
    # pinned here, never assumed).
    done_doc = json.loads((Path(rs) / "output" / "run-done" / "_flow.json"
                           ).read_text())
    check("J03 terminal/bad shape: done stands, stage failed, bad "
          "untouched",
          done_doc["status"] == "completed"
          and done_doc["stages"][0]["status"] == "failed"
          and bad_untouched,
          "done=%r bad=%r" % (done_doc.get("status"), bad_untouched))
    try:
        lines = (Path(rs) / "output" / "_ledger.jsonl"
                 ).read_text().splitlines()
    except OSError:
        lines = []
    masked = sorted(mask_ts(ln) for ln in lines
                    if json.loads(ln).get("event") == "run.swept")
    check("J03 run.swept ledger rows match golden",
          masked == json.loads(golden("j03-ledger-swept.json").decode()),
          "rows=%r" % (masked,))
    # J04: resurrect order + orphan skip (TS plan vs literals).
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
    ts4, note4 = node_run("plan", {"root": rr})
    check("J04 resurrect FIFO-by-created_at, orphan skipped",
          ts4 is not None
          and ts4["plan"]["order"] == ["run-q2", "run-q3", "run-q1"]
          and ts4["plan"]["orphans"] == ["run-orph"],
          "ts=%r %s" % (ts4, note4))
    # J05: rebuild values (graph-missing/list-request res +
    # draft-dir orphan + artifact spellings + verbatim rows +
    # numeric-string created + raise-road skip), then the
    # garbage-created TS-only leg.
    r5 = tempfile.mkdtemp(prefix="wall-qp-j5-")
    out5 = Path(r5) / "output"
    out5.mkdir(parents=True, exist_ok=True)
    (Path(r5) / "drafts").mkdir(parents=True, exist_ok=True)
    (Path(r5) / "drafts" / "d1.json").write_text("{}")
    (Path(r5) / "drafts" / "ddir.json").mkdir()
    graph = [{"id": "g", "type": "comfyui"}]
    j5docs = {
        # rid: (created, draft, extra sidecar keys, request text)
        "run-m1": (300, "d1", {}, None),
        "run-m2": (100, "d1", {"graph": []}, None),
        "run-lr": (200, "d1", {"graph": graph}, "[1, 2]"),
        "run-dd": (50, "ddir", {"graph": graph}, None),
        "run-ar": (400, "d1", {"graph": graph, "stages": "ab",
                               "skipped_stages": [7, "s", None],
                               "artifacts": ["", None, 0, False, "a",
                                             True, 1, 1.5, [1],
                                             {"k": 1}, 0.0]}, None),
        "run-ns": ("123", "d1", {"graph": graph}, None),
        "run-ns2": (500, "d1", {"graph": graph}, None),
        "run-rb": (600, "d1", {"graph": graph, "stages": 5}, None),
    }
    for rid, (created, did, extra, req) in j5docs.items():
        doc = {"run_id": rid, "status": "queued", "error": "",
               "stages": [], "skipped_stages": [], "artifacts": [],
               "created_at": created, "test": False, "draft_id": did,
               "pipeline": "wall"}
        doc.update(extra)
        # run-m1: missing graph (base doc carries none); run-m2: [].
        (out5 / rid).mkdir(exist_ok=True)
        (out5 / rid / "_flow.json").write_text(json.dumps(doc))
        (out5 / rid / "_request.json").write_text(
            req if req is not None else json.dumps({"draft_id": did}))
    ts5, note5 = node_run("plan", {"root": r5})
    want_order = ["run-m2", "run-ns", "run-lr", "run-m1", "run-ar",
                  "run-ns2"]
    check("J05 plan order + orphans incl list-request, draft-dir, "
          "numstr-created, raise-road",
          ts5 is not None
          and ts5["plan"]["order"] == want_order
          and ts5["plan"]["orphans"] == ["run-dd", "run-rb"],
          "ts=%r %s" % (ts5, note5))
    want_built = {
        "run-ar": {"draft_id": "d1", "stages": ["a", "b"],
                   "skipped_stages": [7, "s", None],
                   "artifacts": ["a", "True", "1", "1.5", "[1]",
                                 "{'k': 1}"]},
        "run-m1": {"draft_id": "d1", "stages": [],
                   "skipped_stages": [], "artifacts": []},
    }
    for rid, want in want_built.items():
        tsb, bnote = node_run("build", {"root": r5, "runId": rid})
        check("J05 rebuilt values " + rid,
              tsb is not None and tsb["built"] == want,
              "ts=%r %s" % (tsb, bnote))
    # Garbage created_at: TS coerces 0 and boots it first (recorded
    # history: the retired py oracle's candidate float() killed its
    # whole boot on this class — never ported by design).
    r6 = tempfile.mkdtemp(prefix="wall-qp-j6-")
    out6 = Path(r6) / "output"
    out6.mkdir(parents=True, exist_ok=True)
    (Path(r6) / "drafts").mkdir(parents=True, exist_ok=True)
    (Path(r6) / "drafts" / "d1.json").write_text("{}")
    for rid, created in (("run-gx", "abc"), ("run-ok", 100)):
        doc = {"run_id": rid, "status": "queued", "error": "",
               "stages": [], "skipped_stages": [], "artifacts": [],
               "created_at": created, "test": False, "draft_id": "d1",
               "pipeline": "wall", "graph": graph}
        (out6 / rid).mkdir(exist_ok=True)
        (out6 / rid / "_flow.json").write_text(json.dumps(doc))
        (out6 / rid / "_request.json").write_text(
            json.dumps({"draft_id": "d1"}))
    ts6, note6 = node_run("plan", {"root": r6})
    check("J05 garbage-created: TS coerces 0, boots first",
          ts6 is not None
          and ts6["plan"]["order"] == ["run-gx", "run-ok"]
          and ts6["plan"]["orphans"] == [],
          "ts=%r %s" % (ts6, note6))


# ── Phase R: refusal chain-order + lifecycle unknowns ────────────

def refused(st: int | None, body: bytes):
    try:
        return st, body.decode()
    except Exception:
        return st, body[:160].decode("utf8", "replace")


def phase_r() -> None:
    print("Phase R — refusal chain-order + lifecycle unknowns")
    rt = tempfile.mkdtemp(prefix="wall-qp-rts-")
    seed_draft(rt)
    env = dict(os.environ, MELITE_STATE_ROOT=rt)
    env.pop("COMFYUI_URL", None)
    ts_port, ts_proc = boot_scratch_gateway(env=env)
    try:
        vecs = [
            ("bad-test-beats-missing-draft",
             {"test": "yes"}, "r01-bad-test.json", 400),
            ("bad-draft-beats-knob",
             {"draft_id": "BAD ID!!", "flow": "x",
              "start_from": 1}, "r01-bad-draft.json", 400),
            ("knob-beats-ambiguity",
             {"draft_id": "d1", "flow": "x", "model": "y",
              "overrides": {}}, "r01-knob.json", 400),
        ]
        for name, body, gold, want_st in vecs:
            st, raw = refused(*http(ts_port, "/v1/flows/start", body,
                                    "POST"))
            check("R01 %s pins TS golden" % name,
                  st == want_st and raw.encode() == golden(gold),
                  "ts=(%r,%r)" % (st, raw[:120]))
        # lifecycle unknowns.
        legs = [
            ("status-unknown", "GET", "/v1/flows/status/run-nope",
             "r02-status.json", 404),
            ("stop-unknown", "POST", "/v1/flows/stop/run-nope",
             "r02-stop.json", 400),
            ("resume-unknown", "POST", "/v1/flows/resume/run-nope",
             "r02-resume.json", 400),
            ("reproduce-unknown", "POST",
             "/v1/flows/reproduce/run-nope",
             "r02-reproduce.json", 400),
        ]
        for name, meth, path, gold, want_st in legs:
            st, raw = refused(*http(ts_port, path, None, meth))
            check("R02 %s pins TS golden" % name,
                  st == want_st and raw.encode() == golden(gold),
                  "ts=(%r,%r)" % (st, raw[:120]))
    finally:
        reap_gateway(ts_proc)


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
    rt = tempfile.mkdtemp(prefix="wall-qp-its-")
    rid = fixture_status_run(rt)
    env = dict(os.environ, MELITE_STATE_ROOT=rt)
    env.pop("COMFYUI_URL", None)
    ts_port, ts_proc = boot_scratch_gateway(env=env)
    try:
        for name, qs, want in [
            ("blank-drops", "?include_log=", False),
            ("blank-then-1", "?include_log=&include_log=1", True),
            ("0-then-1", "?include_log=0&include_log=1", False),
            ("1-then-blank", "?include_log=1&include_log=", True),
        ]:
            th = has_tail(ts_port, rid, qs)
            check("I %s ts==%s" % (name, want),
                  th is want, "ts=%r" % (th,))
    finally:
        reap_gateway(ts_proc)


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

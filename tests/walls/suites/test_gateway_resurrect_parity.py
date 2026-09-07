#!/usr/bin/env python3
"""test_gateway_resurrect_parity.py — P5 boot-resurrect + stale-sweep parity wall.

Proves the TypeScript single queue core
(plugins/gateway/src/queue/queue.ts: resurrectRuns/bootSweep, wired
into server.ts bootState) reconciles a dead gateway's state
root exactly like the py gateway (py/gateway.py boot path 4485-4486):

  resurrect: every QUEUED sidecar with a doc-backed draft + a
             parseable _request.json + object graph rows re-queues in
             created_at order (FIFO) with a run.resurrected row;
             orphans / half-written records skip to the sweep.
  sweep:     every other stale running/queued sidecar (top-level AND
             per-stage, recursive) becomes failed with the boot note;
             queued zombies take the queued_why error (never
             executed); terminal rows (completed/failed/stopped) and
             unparseable/missing sidecars are untouched (idempotent —
             a second sweep settles nothing). Ledger run.swept
             carries state queued_lost|failed + error "boot sweep",
             then server.boot carries {port, swept, resurrected}.

RESURRECT/SWEEP MAPPING DECISIONS (py cites — read fully):
  - sweep_sidecar 2253-2288: recursive dict+list patch
    running/queued -> failed; sweep key = queued_why iff the top
    level was queued (and the note non-empty) else why; error is
    overwritten ONLY in that was-queued case; atomic tmp+rename
    indent=2 (2447-2450). Terminal/unparseable -> False, no write.
  - _rebuild 2291-2335: draft_id non-empty + drafts/<id>.json is_file
    (CARD BIRTH LAW) + _request.json parseable + FlowGraph/NodeRow
    constructible; stages/skipped/artifacts ride verbatim
    (2332-2334), error restarts "" (never copied); created_at honors
    created_at only (the C-era "created" fossil is a list-door
    concern, not the record's).
  - boot_resurrect 2338-2375: OUT_ROOT/run-*/_flow.json scan, status
    == queued filter, FIFO by created_at, register + run.resurrected
    per id; orphans/half-written skip (swept below).
  - boot_sweep 2378-2409: sorted scan, live_run_ids exempt, pre-read
    decides queued_lost vs failed, sweep + run.swept per touched id.
  - boot order main() 4485-4486: resurrect FIRST, sweep SECOND.
  - editor_runs parity (editor_runs.py 451-480, 577-584): the
    read-time string sweep covers running rows with the read-time
    note; the BOOT sweep here covers running AND queued with the
    boot notes (gateway.py ownership — the broader rule).
  - KNOWN PY BUG, NOT PORTED (gateway.py:2359): boot_resurrect calls
    doc.get on the parsed sidecar — a valid-JSON-non-object sidecar
    ([1,2], 5, "x", null) raises AttributeError (only
    OSError/ValueError skip) and the whole boot CRASHES. The same
    crash lives in boot_sweep 2396 (pre.get) and sweep_sidecar 2265
    (obj.get — a patched top-level array dies at obj["sweep"]=).
    The core skips non-objects at resurrect (never candidates) and
    leaves them untouched at sweep (no write, no ledger) — TS boots
    where py cannot, while the read doors still 500-class on
    scalars exactly as py does (status 500 +
    error/type/traceback/route, never bytes). Second unported crash
    class: float(created_at) on garbage strings at candidate time
    (~2359-2363; rebuild's own float sits inside the per-id
    try/except → skip) — the core coerces non-numbers to 0 (never
    throws).

Method — fixture state roots, four phases (no goldens anywhere):
  Phase A (dual boot-function, no scalars): seed -> pyA/tsA copies;
    py boot_resurrect+boot_sweep via a python subprocess, TS via a
    node script importing queue.ts. Counts + FIFO ids + swept
    FILE BYTES + untouched files + parsed ledger events must agree.
  Phase B (dual-serve, fresh no-scalar seed -> real py + TS boots):
    server.boot counts agree (engine differs by design:
    python-orchestrator vs ts-preview); swept files byte-equal;
    settled status/detail/list reads byte-equal (live q1/q2 rows are
    worker-racy on py — dropped from the list compare, proved live
    on the TS side in C1 instead).
  Phase C (TS-only): C1 live-serve on the phase-B TS boot (queued
    status rows + queue_position, /v1/queue, WS hello with the
    resurrected queue + queued WS hydrate); C2 boot-where-py-crashes
    (scalar seed: py direct-boot dies AttributeError, TS boots
    clean, scalars untouched, detail 200s, status 500-class pins).
  Phase D (idempotence): a second sweep settles nothing on either
    side (0/0, files unchanged).

Run: python3 tests/walls/suites/test_gateway_resurrect_parity.py
"""

import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

from _anchor import REPO, boot_scratch_gateway, reap_gateway

sys.dont_write_bytecode = True

PASS = FAIL = 0
TS_SERVER = REPO / "plugins" / "gateway" / "src" / "server.ts"
TS_QUEUE = REPO / "plugins" / "gateway" / "src" / "queue" / "queue.ts"

BOOT_WHY = ("gateway restarted (boot sweep): stale active sidecar "
            "from a dead process")
BOOT_QUEUED_WHY = ("gateway restarted before the run started "
                   "(never executed) — resubmit")


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def build_seed(root, scalars: bool = False) -> dict:
    """One fixture state root. Returns {relpath: raw bytes} for the
    untouched-file legs (resurrected + terminal + bad + scalars)."""
    from pathlib import Path as _P
    root = _P(root)
    (root / "drafts").mkdir(parents=True)
    (root / "drafts" / "d1.json").write_text("{}")
    (root / "drafts" / "d2.json").write_text("{}")
    out = root / "output"
    out.mkdir(parents=True)
    snap = {}

    def put(run_id: str, doc) -> None:
        d = out / run_id
        d.mkdir(parents=True, exist_ok=True)
        if isinstance(doc, str):
            (d / "_flow.json").write_text(doc)
        else:
            (d / "_flow.json").write_text(json.dumps(doc))
        snap["output/%s/_flow.json" % run_id] = (
            d / "_flow.json").read_bytes()

    graph1 = [{"id": "w", "type": "comfyui"}]
    put("run-q1", {"run_id": "run-q1", "status": "queued",
                   "pipeline": "anny", "draft_id": "d1",
                   "created_at": 1700000011,
                   "stages": [{"id": "w", "index": 0, "status": "pending"}],
                   "graph": graph1})
    (out / "run-q1" / "_request.json").write_text(
        json.dumps({"draft_id": "d1", "prompt": "hi"}))
    put("run-q2", {"run_id": "run-q2", "status": "queued",
                   "pipeline": "anny", "draft_id": "d2",
                   "created_at": 1700000012,
                   "stages": [{"id": "w", "index": 0, "status": "pending"}],
                   "graph": graph1})
    (out / "run-q2" / "_request.json").write_text(
        json.dumps({"draft_id": "d2", "prompt": "yo"}))
    # queued orphan (draft doc gone) — never resurrects, sweeps lost.
    put("run-qorph", {"run_id": "run-qorph", "status": "queued",
                      "pipeline": "anny", "draft_id": "gone",
                      "created_at": 1700000013})
    # stale running — sweeps failed with the boot note (per-stage too).
    put("run-r1", {"run_id": "run-r1", "status": "running",
                   "pipeline": "anny", "created_at": 1700000004,
                   "stages": [{"id": "w", "index": 0, "status": "running"}]})
    # terminal rows — the sweep must not touch them.
    put("run-done", {"run_id": "run-done", "status": "completed",
                     "pipeline": "anny", "created_at": 1700000001})
    put("run-fail", {"run_id": "run-fail", "status": "failed",
                     "pipeline": "anny", "created_at": 1700000002,
                     "error": "boom"})
    put("run-stop", {"run_id": "run-stop", "status": "stopped",
                     "pipeline": "anny", "created_at": 1700000003})
    # unparseable + sideless — both boots skip silently.
    put("run-bad", "{oops")
    (out / "run-nosidecar").mkdir(parents=True)
    if scalars:
        # valid-JSON-non-object sidecars: py boots DIE on these
        # (AttributeError at gateway.py:2359); TS must boot clean.
        for rid, text in (("run-arr", "[1,2]"), ("run-num", "5"),
                          ("run-str", '"hi"'), ("run-null", "null")):
            put(rid, text)
    return snap


def http(port: int, path: str, method: str = "GET",
         headers: dict | None = None) -> tuple:
    req = urllib.request.Request(
        "http://127.0.0.1:%d%s" % (port, path), method=method,
        headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return (r.status, r.read(),
                    {k.lower(): v for k, v in r.headers.items()})
    except urllib.error.HTTPError as e:
        return (e.code, e.read(),
                {k.lower(): v for k, v in e.headers.items()})
    except Exception as e:
        return (None, b"", {"transport": str(e)})


def dual(py_port: int, ts_port: int, path: str, name: str) -> None:
    ps, pb, _ = http(py_port, path)
    ts, tb, _ = http(ts_port, path)
    if ps is None or ts is None:
        check(name, False, "transport py=%r ts=%r" % (pb[:80], tb[:80]))
        return
    ok = ps == ts and pb == tb
    note = ""
    if not ok:
        note = "status %r/%r py %dB ts %dB" % (ts, ps, len(pb), len(tb))
        for i, (a, b) in enumerate(zip(pb, tb)):
            if a != b:
                note += " first-div @%d %r/%r" % (
                    i, pb[max(0, i - 40):i + 40], tb[max(0, i - 40):i + 40])
                break
        else:
            if len(pb) != len(tb):
                note += " len-div"
    check(name, ok, note)


PY_BOOT_SRC = (
    "import json, sys\n"
    "sys.path.insert(0, 'py')\n"
    "sys.dont_write_bytecode = True\n"
    "import gateway as g\n"
    "gw = g.Gateway()\n"
    "r = g.boot_resurrect(gw)\n"
    "s = g.boot_sweep(tuple(gw.runs.keys()))\n"
    "print(json.dumps({'resurrected': r, 'live': sorted(gw.runs.keys()),"
    " 'swept': s}))\n"
)


def py_boot(root) -> tuple:
    """Direct-function py boot (no worker, no server). Returns
    (rc, payload-dict-or-None, stderr-tail)."""
    env = dict(os.environ, MELITE_STATE_ROOT=str(root))
    p = subprocess.run(
        [sys.executable, "-c", PY_BOOT_SRC], cwd=str(REPO), env=env,
        capture_output=True, text=True, timeout=120)
    if p.returncode != 0:
        return (p.returncode, None, (p.stderr or "")[-400:])
    try:
        return (0, json.loads(p.stdout.strip().splitlines()[-1]), "")
    except Exception as e:
        return (0, None, "unparseable py boot out: %r" % e)


TS_BOOT_SRC = (
    "import { resurrectRuns as coreResurrect,"
    " bootSweep as coreSweep } from '%s';\n"
    "const root = process.argv[2];\n"
    "const roots = { stateRoot: root, runsRoot: root + '/output',"
    " ledgerPath: root + '/output/_ledger.jsonl' };\n"
    "const live = coreResurrect(roots.stateRoot, () => {});\n"
    "const swept = coreSweep(roots.stateRoot, live);\n"
    "console.log(JSON.stringify({ resurrected: live.length,"
    " live: [...live].sort(), swept: swept.length,"
    " sweptIds: [...swept].sort() }));\n"
) % str(TS_QUEUE)


def ts_boot(root, helper: str) -> tuple:
    """Direct-function TS boot. Returns (rc, payload-or-None, tail)."""
    node = shutil.which("node")
    p = subprocess.run(
        [node, "--experimental-strip-types", helper, str(root)],
        cwd=str(REPO), capture_output=True, text=True, timeout=120)
    if p.returncode != 0:
        return (p.returncode, None, (p.stderr or "")[-400:])
    try:
        return (0, json.loads(p.stdout.strip().splitlines()[-1]), "")
    except Exception as e:
        return (0, None, "unparseable ts boot out: %r" % e)


def ledger_events(root) -> list:
    """Parsed (event, data) rows ignoring ts (clocks differ per side;
    py writes spaced json, TS compact — parsed, never bytes)."""
    from pathlib import Path as _P
    rows = []
    try:
        lines = (_P(str(root)) / "output" / "_ledger.jsonl"
                 ).read_text().splitlines()
    except OSError:
        return rows
    for line in lines:
        try:
            obj = json.loads(line)
        except ValueError:
            continue
        rows.append((obj.get("event"),
                     json.dumps(obj.get("data"), sort_keys=True)))
    return sorted(rows)


def boot_ts(env: dict) -> tuple:
    node = shutil.which("node")
    if node is None:
        raise RuntimeError("node not on PATH")
    proc = subprocess.Popen(
        [node, "--experimental-strip-types", str(TS_SERVER)],
        cwd=str(REPO), stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        text=True, start_new_session=True, env=env)
    assert proc.stdout is not None
    deadline = time.time() + 25
    while time.time() < deadline:
        line = proc.stdout.readline()
        if line.startswith("READY "):
            return int(line.split()[1]), proc
        if proc.poll() is not None:
            raise RuntimeError("ts server exited rc=%d" % proc.returncode)
    proc.terminate()
    raise RuntimeError("ts server did not print READY")


WS_KEY = "dGhlIHNhbXBsZSBub25jZQ=="


def ws_handshake(port: int, target: str):
    s = socket.create_connection(("127.0.0.1", port), timeout=10)
    lines = ["GET %s HTTP/1.1" % target, "Host: 127.0.0.1:%d" % port,
             "Upgrade: websocket", "Connection: Upgrade",
             "Sec-WebSocket-Key: " + WS_KEY, "Sec-WebSocket-Version: 13"]
    s.sendall(("\r\n".join(lines) + "\r\n\r\n").encode())
    buf = b""
    while b"\r\n\r\n" not in buf:
        chunk = s.recv(4096)
        if not chunk:
            break
        buf += chunk
    head, _, rest = buf.partition(b"\r\n\r\n")
    return s, head.split(b"\r\n", 1)[0], rest


def ws_read_frame(s: socket.socket, rest: bytes, timeout: float = 10.0):
    s.settimeout(timeout)
    buf = rest
    while len(buf) < 2:
        buf += s.recv(4096)
    b1, b2 = buf[0], buf[1]
    opcode = b1 & 0x0F
    if opcode == 0x8:
        raise AssertionError("server closed")
    assert opcode == 0x1, "opcode %x" % opcode
    ln = b2 & 0x7F
    pos = 2
    if ln == 126:
        while len(buf) < 4:
            buf += s.recv(4096)
        ln = int.from_bytes(buf[2:4], "big")
        pos = 4
    elif ln == 127:
        while len(buf) < 10:
            buf += s.recv(4096)
        ln = int.from_bytes(buf[2:10], "big")
        pos = 10
    while len(buf) < pos + ln:
        buf += s.recv(4096)
    return buf[pos:pos + ln], buf[pos + ln:]


def ws_close(s: socket.socket) -> None:
    try:
        s.sendall(b"\x88\x80\x00\x00\x00\x00")
    except OSError:
        pass
    try:
        s.close()
    except OSError:
        pass


def main() -> int:
    base = None
    procs = []
    try:
        from pathlib import Path as _P
        base = _P(tempfile.mkdtemp(prefix="wall-resurrect-"))
        helper = str(base / "ts_boot.mjs")
        _P(helper).write_text(TS_BOOT_SRC)

        # ── Phase A: dual boot-function agreement (no scalars) ──
        seedA = base / "seedA"
        snapA = build_seed(seedA)
        pyA, tsA = base / "pyA", base / "tsA"
        shutil.copytree(seedA, pyA)
        shutil.copytree(seedA, tsA)
        prc, py, pnote = py_boot(pyA)
        check("A py boots", prc == 0 and py is not None, pnote)
        trc, ts, tnote = ts_boot(tsA, helper)
        check("A ts boots", trc == 0 and ts is not None, tnote)
        if py is None or ts is None:
            print("resurrect parity: %d passed, %d failed" % (PASS, FAIL))
            return 1
        check("A resurrected 2", py["resurrected"] == ts["resurrected"] == 2,
              "%r/%r" % (ts.get("resurrected"), py.get("resurrected")))
        check("A fifo [q1,q2]",
              py["live"] == ts["live"] == ["run-q1", "run-q2"],
              "%r/%r" % (ts["live"], py["live"]))
        check("A swept 2", py["swept"] == ts["swept"] == 2,
              "%r/%r" % (ts.get("swept"), py.get("swept")))
        py_swept = sorted(
            d for (e, d) in ledger_events(pyA) if e == "run.swept")
        ts_swept = sorted(
            d for (e, d) in ledger_events(tsA) if e == "run.swept")
        check("A swept ids {qorph,r1}",
              py_swept == ts_swept and len(py_swept) == 2
              and any("run-qorph" in d for d in py_swept)
              and any("run-r1" in d for d in py_swept),
              "%r/%r" % (ts_swept, py_swept))
        # swept FILE bytes (incl. the queued_why error on the orphan).
        for rid in ("run-qorph", "run-r1"):
            pb = (pyA / "output" / rid / "_flow.json").read_bytes()
            tb = (tsA / "output" / rid / "_flow.json").read_bytes()
            check("A swept bytes " + rid, pb == tb,
                  "py %dB ts %dB" % (len(pb), len(tb)))
        qo = json.loads(
            (tsA / "output" / "run-qorph" / "_flow.json").read_text())
        check("A orphan queued_why",
              qo.get("status") == "failed"
              and qo.get("sweep") == BOOT_QUEUED_WHY
              and qo.get("error") == BOOT_QUEUED_WHY,
              "%r" % (qo,))
        r1 = json.loads(
            (tsA / "output" / "run-r1" / "_flow.json").read_text())
        check("A running boot-why",
              r1.get("status") == "failed"
              and r1.get("sweep") == BOOT_WHY
              and "error" not in r1
              and r1["stages"] == [{"id": "w", "index": 0,
                                    "status": "failed"}],
              "%r" % (r1,))
        # untouched files on both sides.
        for rel in ("output/run-q1/_flow.json", "output/run-q2/_flow.json",
                    "output/run-done/_flow.json",
                    "output/run-fail/_flow.json",
                    "output/run-stop/_flow.json",
                    "output/run-bad/_flow.json"):
            want = snapA[rel]
            check("A untouched " + rel,
                  (pyA / rel).read_bytes() == want
                  and (tsA / rel).read_bytes() == want)
        check("A sideless ignored",
              not (pyA / "output" / "run-nosidecar" / "_flow.json").exists()
              and not (tsA / "output" / "run-nosidecar"
                       / "_flow.json").exists())
        check("A ledger events agree",
              ledger_events(pyA) == ledger_events(tsA),
              "%r vs %r" % (ledger_events(tsA), ledger_events(pyA)))

        # ── Phase B: dual-serve on fresh roots (real boots) ──
        seedB = base / "seedB"
        build_seed(seedB)
        pyB, tsB = base / "pyB", base / "tsB"
        shutil.copytree(seedB, pyB)
        shutil.copytree(seedB, tsB)
        # Dead-end engine URL: the py worker fails resurrected fake
        # graphs fast (refused) instead of dialing a default host.
        py_env = dict(os.environ, MELITE_STATE_ROOT=str(pyB),
                      COMFYUI_URL="http://127.0.0.1:9")
        ts_env = dict(os.environ, MELITE_STATE_ROOT=str(tsB),
                      COMFYUI_URL="http://127.0.0.1:9")
        py_port, py_proc = boot_scratch_gateway(env=py_env)
        procs.append(py_proc)
        ts_port, ts_proc = boot_ts(ts_env)
        procs.append(ts_proc)
        for side, root in (("py", pyB), ("ts", tsB)):
            rows = [json.loads(line) for line in
                    (root / "output" / "_ledger.jsonl").read_text()
                    .splitlines()]
            boots = [r for r in rows if r.get("event") == "server.boot"]
            want_engine = ("python-orchestrator" if side == "py"
                           else "ts-preview")
            check("B server.boot " + side,
                  len(boots) == 1
                  and boots[0]["data"].get("swept") == 2
                  and boots[0]["data"].get("resurrected") == 2
                  and boots[0]["data"].get("engine") == want_engine,
                  "%r" % (boots,))
        for rid in ("run-qorph", "run-r1"):
            pb = (pyB / "output" / rid / "_flow.json").read_bytes()
            tb = (tsB / "output" / rid / "_flow.json").read_bytes()
            check("B swept bytes " + rid, pb == tb,
                  "py %dB ts %dB" % (len(pb), len(tb)))
        for rid in ("run-done", "run-fail", "run-stop",
                    "run-r1", "run-qorph"):
            dual(py_port, ts_port, "/v1/flows/status/" + rid,
                 "B status-" + rid)
            dual(py_port, ts_port, "/v1/flows/runs/" + rid,
                 "B detail-" + rid)
        dual(py_port, ts_port,
             "/v1/flows/status/run-r1?include_log=1", "B status-r1-log")
        dual(py_port, ts_port, "/v1/flows/status/run-bad",
             "B status-bad")
        # live q1/q2 are worker-racy on py (its worker consumes the
        # resurrected work; TS holds it queued — C1 pins the TS
        # side), so the list drops them on both sides first.
        _, pb, _ = http(py_port, "/v1/flows/runs")
        _, tb, _ = http(ts_port, "/v1/flows/runs")
        try:
            [REDACTED 2026-11-05], td = json.loads(pb), json.loads(tb)
            pr = [r for r in [REDACTED 2026-11-05]["runs"]
                  if r["run_id"] not in ("run-q1", "run-q2")]
            tr = [r for r in td["runs"]
                  if r["run_id"] not in ("run-q1", "run-q2")]
            ok = ([REDACTED 2026-11-05]["count"] == td["count"] == 9
                  and len(pr) == len(tr) == 7
                  and all(json.dumps(a, indent=2, ensure_ascii=False)
                          == json.dumps(b, indent=2, ensure_ascii=False)
                          for a, b in zip(pr, tr)))
            check("B list-settled", ok,
                  "count %r/%r rows %d/%d" % (td.get("count"),
                                              [REDACTED 2026-11-05].get("count"),
                                              len(tr), len(pr)))
        except Exception as e:
            check("B list-settled", False, "unparseable %r" % e)
        # swept/terminal WS hydrates are unknown on both (neither
        # side owns them live).
        unknown = b'{"type":"run","status":"unknown"}'
        for target, n in (("/v1/flows/events/run-done", "ws-unknown-done"),
                          ("/v1/flows/events/run-r1", "ws-unknown-r1")):
            for port, side in ((py_port, "py"), (ts_port, "ts")):
                s = None
                try:
                    s, status, rest = ws_handshake(port, target)
                    if status != b"HTTP/1.1 101 Switching Protocols":
                        check("B " + n, False, "%s %r" % (side, status))
                        break
                    frame, _ = ws_read_frame(s, rest)
                    if frame != unknown:
                        check("B " + n, False,
                              "%s %r" % (side, frame[:80]))
                        break
                except Exception as e:
                    check("B " + n, False, "%s %r" % (side, e))
                    break
                finally:
                    if s is not None:
                        ws_close(s)
            else:
                check("B " + n, True)

        # ── Phase C1: TS-only live serve (the phase-B TS boot) ──
        s, body, _ = http(ts_port, "/v1/flows/status/run-q1")
        try:
            doc = json.loads(body)
            check("C1 q1 live queued",
                  s == 200 and doc.get("status") == "queued"
                  and doc.get("queue_position") == 0
                  and doc.get("error") == ""
                  and doc.get("run_id") == "run-q1"
                  and doc.get("stages") == [{"id": "w", "index": 0,
                                             "status": "pending"}],
                  "status %r %r" % (s, body[:160]))
        except Exception as e:
            check("C1 q1 live queued", False, "%r" % e)
        s, body, _ = http(ts_port, "/v1/flows/status/run-q2")
        try:
            doc = json.loads(body)
            check("C1 q2 position 1",
                  s == 200 and doc.get("status") == "queued"
                  and doc.get("queue_position") == 1,
                  "status %r %r" % (s, body[:160]))
        except Exception as e:
            check("C1 q2 position 1", False, "%r" % e)
        s, body, _ = http(ts_port, "/v1/queue")
        try:
            doc = json.loads(body)
            check("C1 queue",
                  s == 200 and doc == {"queued": 2, "running": 0,
                                       "active": "",
                                       "queued_ids": ["run-q1", "run-q2"]},
                  "status %r %r" % (s, body[:160]))
        except Exception as e:
            check("C1 queue", False, "%r" % e)
        s = None
        try:
            s, status, rest = ws_handshake(ts_port, "/v1/flows/events")
            frame, _ = ws_read_frame(s, rest)
            check("C1 ws hello",
                  status == b"HTTP/1.1 101 Switching Protocols"
                  and frame == (b'{"type":"hello","channel":"*",'
                                b'"queue_depth":2,'
                                b'"queued":["run-q1","run-q2"],'
                                b'"active":null}'),
                  "%r %r" % (status, frame[:120]))
        except Exception as e:
            check("C1 ws hello", False, "%r" % e)
        finally:
            if s is not None:
                ws_close(s)
        s = None
        try:
            s, status, rest = ws_handshake(ts_port,
                                           "/v1/flows/events/run-q1")
            frame, _ = ws_read_frame(s, rest)
            if frame != b'{"type":"run","status":"queued"}':
                check("C1 ws hydrate", False, "%r" % frame[:80])
            else:
                try:
                    ws_read_frame(s, b"", timeout=1.0)
                    check("C1 ws hydrate", False, "second frame arrived")
                except socket.timeout:
                    check("C1 ws hydrate", True)
        except Exception as e:
            check("C1 ws hydrate", False, "%r" % e)
        finally:
            if s is not None:
                ws_close(s)

        # ── Phase C2: boot where py crashes (scalar sidecars) ──
        seedC = base / "seedC"
        snapC = build_seed(seedC, scalars=True)
        tsC = base / "tsC"
        shutil.copytree(seedC, tsC)
        prc, _, pnote = py_boot(seedC)
        check("C2 py boot crashes",
              prc != 0 and "AttributeError" in pnote
              and "has no attribute 'get'" in pnote,
              "rc=%r %r" % (prc, pnote[-160:]))
        trc, ts, tnote = ts_boot(tsC, helper)
        check("C2 ts boots clean",
              trc == 0 and ts is not None and ts["resurrected"] == 2
              and ts["live"] == ["run-q1", "run-q2"]
              and ts["swept"] == 2, "%r %r" % (ts, tnote))
        for rid, text in (("run-arr", "[1,2]"), ("run-num", "5"),
                          ("run-str", '"hi"'), ("run-null", "null")):
            check("C2 scalar untouched " + rid,
                  (tsC / "output" / rid / "_flow.json").read_text()
                  == text)
        tsC_env = dict(os.environ, MELITE_STATE_ROOT=str(tsC))
        tsC_port, tsC_proc = boot_ts(tsC_env)
        procs.append(tsC_proc)
        for rid in ("run-arr", "run-num", "run-str", "run-null"):
            s, body, _ = http(tsC_port, "/v1/flows/runs/" + rid)
            check("C2 detail-200 " + rid, s == 200,
                  "status %r" % (s,))
        for rid in ("run-arr", "run-num"):
            s, body, _ = http(tsC_port, "/v1/flows/status/" + rid)
            try:
                doc = json.loads(body)
                check("C2 status-500 " + rid,
                      s == 500
                      and set(doc.keys()) == {"error", "type",
                                              "traceback", "route"}
                      and doc["route"] == "GET /v1/flows/status/" + rid,
                      "status %r keys %r" % (s, sorted(doc.keys())))
            except Exception as e:
                check("C2 status-500 " + rid, False, "%r" % e)
        s, body, _ = http(tsC_port, "/v1/queue")
        try:
            doc = json.loads(body)
            check("C2 queue",
                  s == 200 and doc.get("queued") == 2
                  and doc.get("queued_ids") == ["run-q1", "run-q2"],
                  "status %r %r" % (s, body[:160]))
        except Exception as e:
            check("C2 queue", False, "%r" % e)

        # ── Phase D: sweep idempotence (second sweep settles 0) ──
        prc, py2, pnote = py_boot(pyA)
        trc, ts2, tnote = ts_boot(tsA, helper)
        # NOTE: the direct re-boot re-registers the still-queued q1/q2
        # (ledger duplicates, like py) but sweeps nothing new — the
        # idempotence claim is the SWEPT count only.
        check("D sweep idempotent",
              prc == 0 and trc == 0 and py2 is not None
              and ts2 is not None and py2["swept"] == ts2["swept"] == 0,
              "%r/%r" % (ts2, py2))
        for rid in ("run-qorph", "run-r1"):
            check("D swept stable " + rid,
                  (pyA / "output" / rid / "_flow.json").read_bytes()
                  == (tsA / "output" / rid / "_flow.json").read_bytes())
    finally:
        for proc in procs:
            try:
                reap_gateway(proc)
            except Exception:
                pass
        if base is not None:
            shutil.rmtree(str(base), ignore_errors=True)
    print("resurrect parity: %d passed, %d failed" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""test_gateway_queue_refusals.py — P5 queue-refusal parity wall (ladder P5 gate).

Proves the TypeScript queue core (plugins/gateway/src/queue/* over the
ctx.ts seam + doors/flowsRun.ts + doors/runs.ts) refuses byte-identical
to the py gateway (py/gateway.py) on every queue-door refusal leg —
the wall-first port of the refusal battery (test_py_gateway.py refusal
legs + every refusal text/code across the queue doors):

  Phase D — dual-serve (py + TS up, separate MELITE_STATE_ROOTs):
    D01 bad-JSON shape (strict start door; parser prose differs —
        status 400 + code bad_json + "bad JSON: " prefix, shape only)
    D02 unknown route 404 no_such_route (byte-equal)
    D03 method mismatch GET /v1/flows/start 404 (byte-equal)
    D04 method mismatch GET /v1/flows/resume/<id> 404 (byte-equal)
    S01 non-object start body 400 bad_envelope/body (byte-equal)
    S02 string test flag 400 bad_envelope/test (byte-equal)
    S03 missing draft_id 400 draft_required (byte-equal)
    S04 malformed draft_id 400 draft_malformed (byte-equal)
    S05 unknown draft_id 400 draft_unknown (byte-equal)
    S06 retired runner knob 400 invalid_request knob text (byte-equal)
    S07 retired pipe-carry key 400 invalid_request carry text (byte-equal)
    S08 ambiguous doors 400 invalid_request (byte-equal)
    S09 no flow selected 400 invalid_request (byte-equal)
    S10 flow_inline unknown top key 400 invalid_request (byte-equal)
    Q01 empty queue snapshot 200 (byte-equal; both fresh)
    T01 status unknown run 404 unknown run_id (byte-equal)
    P01 stop unknown run 400 run_unknown (byte-equal)
    G01 runs-list ?limit=abc 400 limit text (byte-equal)
    E01 events non-upgrade fallback 404 no_such_route (byte-equal)
    N01 run-detail unknown 404 unknown run_id (byte-equal)
    R01 resume unknown run 400 run_unknown (byte-equal; NEW TS arm)
    R02 resume completed 400 run_completed (byte-equal; NEW TS arm)
    R03 resume queued-sidecar 400 run_not_resumable (byte-equal; NEW)
    R04 resume failed/draft-gone 400 run_record_unusable (byte-equal)
    C01 reproduce unknown 400 run_unknown (byte-equal; NEW TS arm)
    C02 reproduce cardless 400 run_cardless (byte-equal; NEW TS arm)
    C03 reproduce no-request 400 run_record_unusable (byte-equal; NEW)
    C04 reproduce non-object request 400 run_record_unusable (byte-equal)
    B01 burst 5 sequential starts all 202 (full queue never 429/503)
    B02 parallel 8 starts all 202 (contention never 409/423)
  Phase S — py STOPPED, TS alone (the flag-flip criterion: the full
    wall suite green against the TS boot with py stopped — TS is the
    writer): a subset re-run against TS only, bytes compared to the
    recorded dual-phase TS bytes.
  Phase K — lock-held parity (R2 single-writer, no servers):
    K01 second py acquire on the LIVE py root refuses held-by-live-pid
    K02 node acquireLock on the SAME live root refuses the IDENTICAL
        note (byte-exact across languages, same pid)
    K03 fresh-root acquires (py + node, separate tmps) answer acquired
    K04 dead-pid steal (py + node, separate tmps) answers stolen

Py cites (every leg names its lines; texts are verbatim contracts):
  dispatcher bad-JSON 4335-4340, unknown-route 4357-4358, method gate
  4325, normalization 4347-4356; submit body 1184-1188, test flag
  1195-1200, draft_required 1219-1226, draft_malformed 1227-1233,
  draft_unknown 1240-1247; _strict_body knob 263-267, carry 270-276;
  ambiguous 304-307, no-flow 335-336; flow_from_body top keys
  1413-1417 (py/flow.py); _h_queue 2893-2900; status unknown 2959-2962;
  stop unknown 2042-2044; runs limit 3019-3023; ws fallback 3005-3008;
  run_detail unknown 667-668 (py/editor_runs.py); resume refusals
  1926-1958; reproduce refusals 2002-2033; lock 4405-4447.

KNOWN divergences (asserted as shape, never bytes):
  - bad-JSON error TEXT embeds the host parser's message (CPython
    JSONDecodeError vs V8 SyntaxError) — status + code + prefix.
  - TS resume/reproduce HAPPY paths answer 400 preview_scope (the
    re-queue / exact-resubmit workers stay py-owned Phase-5 work) —
    this wall pins REFUSALS only; no resumable/replayable fixture
    asserts a 200 here.
  - TS hQueue is a static empty snapshot (live depth stays py-owned)
    — Q01 pins the empty shape both boots share; post-burst depth
    is never compared.
  - live-registry resume/reproduce (run_live) needs a live row whose
    id is random per side — implemented in both arms (liveRunStatus
    seam) but pinned by shape in the unit suites, not byte-compared
    here (burst ids differ per side by construction).

Run: python3 tests/walls/suites/test_gateway_queue_refusals.py
"""

import json
import os
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

PASS = FAIL = 0
DID = "wall-queue-draft-1"
GONE_DRAFT = "wall-gone-draft-9"
TS_SERVER = REPO / "plugins" / "gateway" / "src" / "server.ts"
# Adjudication 2026-09-07: the P5 core is single-module lock-first —
# the lock helper lives in queue.ts (queue lane); this wall's node
# harness imports it from there (was queue/lock.ts, deleted).
TS_LOCK = REPO / "plugins" / "gateway" / "src" / "queue" / "queue.ts"
WF = {"1": {"class_type": "EmptyLatentImage",
            "inputs": {"width": 64, "height": 64, "batch_size": 1}}}


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def http(port: int, path: str, body: bytes | None = None,
         method: str | None = None) -> tuple[int | None, bytes]:
    req = urllib.request.Request(
        "http://127.0.0.1:%d%s" % (port, path),
        data=body if body is not None else None,
        method=method or ("POST" if body is not None else "GET"))
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:
        return None, ("TRANSPORT " + str(e)).encode()


def boot_ts(env: dict) -> tuple[int, "subprocess.Popen[str]"]:
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


def start_body(draft: str = DID) -> bytes:
    return json.dumps({
        "flow_inline": {"id": "wall-run", "stages": [
            {"id": "gen", "engine": "comfyui",
             "params": {"workflow": WF, "timeout_s": 60}}]},
        "draft_id": draft}).encode()


def write_flow(root: Path, run_id: str, doc: dict,
               request: object | None = None,
               with_request: bool = True) -> None:
    d = root / "output" / run_id
    d.mkdir(parents=True, exist_ok=True)
    (d / "_flow.json").write_text(json.dumps(doc))
    if with_request:
        (d / "_request.json").write_text(json.dumps(
            request if request is not None else
            {"flow_inline": {"id": "wall-run", "stages": []},
             "draft_id": DID}))


def base_flow(run_id: str, status: str, draft: str = DID) -> dict:
    return {"run_id": run_id, "status": status, "error": "",
            "stages": [], "skipped_stages": [], "artifacts": [],
            "created_at": 100.0, "test": False, "draft_id": draft,
            "pipeline": "queue-wall", "graph": []}


def node_lock(root: str) -> dict:
    harness = Path(tempfile.gettempdir()) / (
        "wall-queue-lock-%d.mts" % os.getpid())
    if not harness.is_file():
        harness.write_text(
            "import { acquireLock } from %s;\n"
            "const out = acquireLock(process.argv[2] ?? \"\");\n"
            "console.log(JSON.stringify(out));\n"
            % json.dumps(TS_LOCK.as_uri()))
    proc = subprocess.run(
        [shutil.which("node") or "node", "--experimental-strip-types",
         "--no-warnings", str(harness), root],
        cwd=str(REPO), capture_output=True, text=True, timeout=60)
    line = (proc.stdout or "").strip().splitlines()
    if not line:
        return {"ok": False,
                "note": "harness no output rc=%d %s"
                % (proc.returncode, (proc.stderr or "")[-200:])}
    try:
        doc = json.loads(line[-1])
        return doc if isinstance(doc, dict) else {"ok": False, "note": "shape"}
    except ValueError:
        return {"ok": False, "note": "unparsable %r" % line[-1][:120]}


def py_lock(root: str) -> dict:
    proc = subprocess.run(
        [sys.executable, "-c",
         "import json,sys; sys.path.insert(0,'py');"
         "import gateway as g;"
         "from pathlib import Path;"
         "g.STATE_ROOT = Path(%r);"
         "ok,note = g.acquire_lock();"
         "print(json.dumps({'ok':ok,'note':note}))" % root],
        cwd=str(REPO), capture_output=True, text=True, timeout=60,
        env=dict(os.environ, MELITE_STATE_ROOT=root))
    line = (proc.stdout or "").strip().splitlines()
    if not line:
        return {"ok": False,
                "note": "py no output rc=%d %s"
                % (proc.returncode, (proc.stderr or "")[-200:])}
    try:
        doc = json.loads(line[-1])
        return doc if isinstance(doc, dict) else {"ok": False, "note": "shape"}
    except ValueError:
        return {"ok": False, "note": "unparsable %r" % line[-1][:120]}


def main() -> int:
    py_root = Path(tempfile.mkdtemp(prefix="wall-qref-py-"))
    ts_root = Path(tempfile.mkdtemp(prefix="wall-qref-ts-"))
    py_proc = ts_proc = None
    ts_bytes: dict[str, bytes] = {}
    try:
        for root in (py_root, ts_root):
            (root / "drafts").mkdir(parents=True)
            (root / "drafts" / (DID + ".json")).write_text(
                json.dumps({"draft_id": DID}))
        py_port, py_proc = boot_scratch_gateway(env=dict(
            os.environ, MELITE_STATE_ROOT=str(py_root)))
        ts_port, ts_proc = boot_ts(dict(
            os.environ, MELITE_STATE_ROOT=str(ts_root)))

        def dual(path: str, body: bytes | None, method: str | None,
                 leg: str, want: dict | None = None,
                 want_status: int = 400) -> None:
            a = http(py_port, path, body, method=method)
            b = http(ts_port, path, body, method=method)
            check("%s status py=%r ts=%r" % (leg, a[0], b[0]),
                  a[0] == b[0] == want_status,
                  "py=%r ts=%r" % (a[0], b[0]))
            if want is not None:
                try:
                    da = json.loads(a[1].decode() or "{}")
                except ValueError:
                    da = {}
                try:
                    db = json.loads(b[1].decode() or "{}")
                except ValueError:
                    db = {}
                check("%s body" % leg,
                      a[1] == b[1] and da == want and db == want,
                      "py=%r ts=%r" % (a[1][:200], b[1][:200]))
            else:
                check("%s bytes" % leg, a[1] == b[1],
                      "py=%r ts=%r" % (a[1][:200], b[1][:200]))
            ts_bytes[leg] = b[1]

        # ── Phase D: dispatcher legs ──
        st, raw = http(py_port, "/v1/flows/start", b"{bad")
        try:
            dpy = json.loads(raw.decode() or "{}")
        except ValueError:
            dpy = {}
        st2, raw2 = http(ts_port, "/v1/flows/start", b"{bad")
        try:
            dts = json.loads(raw2.decode() or "{}")
        except ValueError:
            dts = {}
        check("D01 bad JSON py shape",
              st == 400 and str(dpy.get("error", "")).startswith("bad JSON: ")
              and dpy.get("code") == "bad_json", raw[:140].decode("utf8", "replace"))
        check("D01 bad JSON ts shape",
              st2 == 400 and str(dts.get("error", "")).startswith("bad JSON: ")
              and dts.get("code") == "bad_json", raw2[:140].decode("utf8", "replace"))
        dual("/v1/queue-no-such-door", None, "GET", "D02 unknown route",
             {"error": "no such route GET /v1/queue-no-such-door",
              "code": "no_such_route"}, want_status=404)
        dual("/v1/flows/start", None, "GET", "D03 start method",
             {"error": "no such route GET /v1/flows/start",
              "code": "no_such_route"}, want_status=404)
        dual("/v1/flows/resume/wall-no-such-run", None, "GET",
             "D04 resume method",
             {"error": "no such route GET /v1/flows/resume/wall-no-such-run",
              "code": "no_such_route"}, want_status=404)

        # ── Phase D: start-door legs ──
        dual("/v1/flows/start", b"[1,2]", "POST", "S01 non-object",
             {"error": "request body must be a JSON object",
              "code": "bad_envelope", "loc": "body",
              "expected": "object", "got": "list"})
        dual("/v1/flows/start", json.dumps(
            {"flow_inline": {}, "draft_id": DID,
             "test": "false"}).encode(), "POST", "S02 test flag",
             {"error": "test flag must be a boolean (got str 'false')",
              "code": "bad_envelope", "loc": "test",
              "expected": "boolean", "got": "str"})
        dual("/v1/flows/start", json.dumps(
            {"flow_inline": {"id": "w", "stages": []}}).encode(),
            "POST", "S03 draft required",
            {"error": "draft_id is required — every run is born from an "
             "action card (CARD BIRTH LAW); compose the card first: "
             "POST /v1/flows/drafts, then start with its draft_id "
             "(docs/cards/draft-door.md)",
             "code": "draft_required", "loc": "draft_id",
             "expected": "doc-backed draft id", "got": "absent"})
        dual("/v1/flows/start", json.dumps(
            {"flow_inline": {"id": "w", "stages": []},
             "draft_id": "!!"}).encode(), "POST", "S04 draft malformed",
             {"error": "draft_id malformed (96 char cap, "
              "[A-Za-z0-9_-] only): '!!'",
              "code": "draft_malformed", "loc": "draft_id",
              "expected": "[A-Za-z0-9_-]{1,96}", "got": "!!"})
        dual("/v1/flows/start", json.dumps(
            {"flow_inline": {"id": "w", "stages": []},
             "draft_id": "wall-no-such-draft"}).encode(),
            "POST", "S05 draft unknown",
            {"error": "unknown draft_id 'wall-no-such-draft' — no card "
             "doc at drafts/wall-no-such-draft.json; compose the card "
             "first: POST /v1/flows/drafts",
             "code": "draft_unknown", "loc": "draft_id",
             "expected": "existing card doc",
             "got": "wall-no-such-draft"})
        dual("/v1/flows/start", json.dumps(
            {"flow_inline": {"id": "w", "stages": []},
             "draft_id": DID, "start_from": 1}).encode(),
            "POST", "S06 retired knob",
            {"error": "request body carries retired runner knob(s) "
             "['start_from'] — the runner never reads these "
             "(silent-drop class); remove them",
             "code": "invalid_request"})
        dual("/v1/flows/start", json.dumps(
            {"flow_inline": {"id": "w", "stages": []},
             "draft_id": DID, "pipe": "x"}).encode(),
            "POST", "S07 retired carry",
            {"error": "request body carries retired pipe-carry key(s) "
             "['pipe'] — the 2026-08-10 stowaway wire: no gateway ever "
             "stashed it (flow_doc was never emitted). The revive rail "
             "is the draft (draft_id) + the run registry; card bodies "
             "carry params only",
             "code": "invalid_request"})
        dual("/v1/flows/start", json.dumps(
            {"flow_inline": {"id": "w", "stages": []},
             "draft_id": DID, "model": "x"}).encode(),
            "POST", "S08 ambiguous",
            {"error": "ambiguous request: names ['flow_inline', "
             "'model'] — provide exactly one of flow, flow_inline, "
             "model",
             "code": "invalid_request"})
        dual("/v1/flows/start", json.dumps(
            {"draft_id": DID}).encode(),
            "POST", "S09 no flow",
            {"error": "no flow selected: provide flow, flow_inline "
             "or model",
             "code": "invalid_request"})
        dual("/v1/flows/start", json.dumps(
            {"flow_inline": {"id": "w",
                            "stages": [{"id": "gen", "engine": "comfyui",
                                        "params": {"workflow": WF}}],
                            "yaml": 1},
             "draft_id": DID}).encode(),
            "POST", "S10 inline top key",
            {"error": "flow body carries unknown keys ['yaml'] — "
             "allowed: ['description', 'id', 'stages']",
             "code": "invalid_request"})

        # ── Phase D: queue / status / stop / list / events / detail ──
        dual("/v1/queue", None, "GET", "Q01 empty queue",
             {"queued": 0, "running": 0, "active": "",
              "queued_ids": []}, want_status=200)
        dual("/v1/flows/status/wall-no-such-run", None, "GET",
             "T01 status unknown",
             {"error": "unknown run_id", "code": "invalid_request"},
             want_status=404)
        dual("/v1/flows/stop/wall-no-such-run", b"", "POST",
             "P01 stop unknown",
             {"error": "unknown run_id 'wall-no-such-run'",
              "code": "run_unknown", "loc": "run_id"})
        dual("/v1/flows/runs?limit=abc", None, "GET", "G01 limit garbage",
             {"error": "limit must be an integer (got 'abc')",
              "code": "invalid_request"})
        # NOTE (py 3005-3008): _h_ws_fallback returns NO code, so the
        # dispatcher normalization (4347-4356) stamps invalid_request —
        # NOT no_such_route (that code lives on the unmatched-route
        # fallback 4357-4358 only). Both sides agree byte-for-byte.
        dual("/v1/flows/events/wall-no-such-run", None, "GET",
             "E01 events fallback",
             {"error": "no such route GET /v1/flows/events/wall-no-such-run",
              "code": "invalid_request"}, want_status=404)
        dual("/v1/flows/runs/wall-no-such-run", None, "GET",
             "N01 detail unknown",
             {"error": "unknown run_id", "code": "invalid_request"},
             want_status=404)

        # ── Phase D: resume / reproduce fixtures (both roots) ──
        for root in (py_root, ts_root):
            write_flow(root, "run-resume-done",
                       base_flow("run-resume-done", "completed"))
            write_flow(root, "run-resume-queued",
                       base_flow("run-resume-queued", "queued"))
            write_flow(root, "run-resume-unusable",
                       dict(base_flow("run-resume-unusable", "failed",
                                     GONE_DRAFT),
                            stages=[{"id": "gen", "name": "gen", "index": 0,
                                     "status": "failed", "outputs": {},
                                     "expected": {}, "error": "boom"}]))
            write_flow(root, "run-rep-cardless",
                       base_flow("run-rep-cardless", "completed", ""),
                       with_request=False)
            write_flow(root, "run-rep-noreq",
                       base_flow("run-rep-noreq", "completed"),
                       with_request=False)
            write_flow(root, "run-rep-nonobj",
                       base_flow("run-rep-nonobj", "completed"),
                       request=[1, 2])
        dual("/v1/flows/resume/wall-no-such-run", b"", "POST",
             "R01 resume unknown",
             {"error": "no durable record for run 'wall-no-such-run'",
              "code": "run_unknown", "loc": "run_id"})
        dual("/v1/flows/resume/run-resume-done", b"", "POST",
             "R02 resume completed",
             {"error": "run run-resume-done completed — nothing to resume",
              "code": "run_completed", "loc": "run_id",
              "expected": "failed|stopped", "got": "completed"})
        dual("/v1/flows/resume/run-resume-queued", b"", "POST",
             "R03 resume not-resumable",
             {"error": "run run-resume-queued is 'queued' — resume needs "
              "failed or stopped",
              "code": "run_not_resumable", "loc": "run_id",
              "expected": "failed|stopped", "got": "queued"})
        dual("/v1/flows/resume/run-resume-unusable", b"", "POST",
             "R04 resume unusable",
             {"error": "run run-resume-unusable record is unusable (draft "
              "doc gone or half-written) — resubmit instead",
              "code": "run_record_unusable", "loc": "run_id"})
        dual("/v1/flows/reproduce/wall-no-such-run", b"", "POST",
             "C01 reproduce unknown",
             {"error": "no durable record for run 'wall-no-such-run'",
              "code": "run_unknown", "loc": "run_id"})
        dual("/v1/flows/reproduce/run-rep-cardless", b"", "POST",
             "C02 reproduce cardless",
             {"error": "run run-rep-cardless is a cardless legacy row (no "
              "draft_id) — compose a fresh card to replay it",
              "code": "run_cardless", "loc": "draft_id",
              "expected": "doc-backed draft id", "got": "absent"})
        dual("/v1/flows/reproduce/run-rep-noreq", b"", "POST",
             "C03 reproduce no-request",
             {"error": "run run-rep-noreq has no recorded request body — "
              "cannot replay",
              "code": "run_record_unusable", "loc": "run_id"})
        dual("/v1/flows/reproduce/run-rep-nonobj", b"", "POST",
             "C04 reproduce non-object",
             {"error": "run run-rep-nonobj recorded a non-object request "
              "body",
              "code": "run_record_unusable", "loc": "run_id",
              "expected": "object", "got": "list"})

        # ── Phase D: full-queue + contention (never a refusal) ──
        burst_ok = True
        for i in range(5):
            for port, side in ((py_port, "py"), (ts_port, "ts")):
                st, raw = http(port, "/v1/flows/start", start_body())
                if st != 202:
                    burst_ok = False
                try:
                    doc = json.loads(raw.decode() or "{}")
                except ValueError:
                    doc = {}
                if st != 202 or "run_id" not in doc:
                    burst_ok = False
        check("B01 burst 5x2 all 202", burst_ok, "a start refused under depth")
        cont_ok = True
        cont_lock = threading.Lock()

        def fire(port: int) -> None:
            nonlocal cont_ok
            st, raw = http(port, "/v1/flows/start", start_body())
            with cont_lock:
                if st != 202:
                    cont_ok = False

        threads = ([threading.Thread(target=fire, args=(py_port,))
                    for _ in range(8)] +
                   [threading.Thread(target=fire, args=(ts_port,))
                    for _ in range(8)])
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        check("B02 parallel 8x2 all 202", cont_ok, "contention refused")

        # ── Phase K: lock-held parity (py root is LIVE-held) ──
        want_held = "gateway.lock held by live pid %d" % py_proc.pid
        kpy = py_lock(str(py_root))
        check("K01 py second acquire refuses",
              kpy.get("ok") is False and kpy.get("note") == want_held,
              "%r" % kpy)
        kts = node_lock(str(py_root))
        check("K02 node acquire refuses identical",
              kts.get("ok") is False and kts.get("note") == want_held,
              "%r" % kts)
        fresh_py = tempfile.mkdtemp(prefix="wall-qref-lockpy-")
        fresh_ts = tempfile.mkdtemp(prefix="wall-qref-lockts-")
        try:
            fpy = py_lock(fresh_py)
            check("K03a py fresh acquires",
                  fpy == {"ok": True, "note": "acquired"}, "%r" % fpy)
            fts = node_lock(fresh_ts)
            check("K03b node fresh acquires",
                  fts == {"ok": True, "note": "acquired"}, "%r" % fts)
        finally:
            shutil.rmtree(fresh_py, ignore_errors=True)
            shutil.rmtree(fresh_ts, ignore_errors=True)
        dead_py = tempfile.mkdtemp(prefix="wall-qref-deadpy-")
        dead_ts = tempfile.mkdtemp(prefix="wall-qref-deadts-")
        try:
            Path(dead_py, "gateway.lock").write_text("999999999")
            Path(dead_ts, "gateway.lock").write_text("999999999")
            spy = py_lock(dead_py)
            check("K04a py steals dead pid",
                  spy == {"ok": True,
                          "note": "stolen from dead pid 999999999"},
                  "%r" % spy)
            sts = node_lock(dead_ts)
            check("K04b node steals dead pid",
                  sts == {"ok": True,
                          "note": "stolen from dead pid 999999999"},
                  "%r" % sts)
        finally:
            shutil.rmtree(dead_py, ignore_errors=True)
            shutil.rmtree(dead_ts, ignore_errors=True)

        # ── Phase S: py STOPPED — TS alone serves the same bytes ──
        reap_gateway(py_proc)
        py_proc = None
        time.sleep(0.5)
        subset = ["D02 unknown route", "D03 start method", "S03 draft required",
                  "S05 draft unknown", "S08 ambiguous", "T01 status unknown",
                  "P01 stop unknown", "G01 limit garbage",
                  "R01 resume unknown", "R02 resume completed",
                  "C01 reproduce unknown", "C02 reproduce cardless",
                  "N01 detail unknown"]
        paths = {  # leg -> (path, body, method, status)
            "D02 unknown route": ("/v1/queue-no-such-door", None, "GET", 404),
            "D03 start method": ("/v1/flows/start", None, "GET", 404),
            "S03 draft required": (
                "/v1/flows/start",
                json.dumps({"flow_inline": {"id": "w", "stages": []}}).encode(),
                "POST", 400),
            "S05 draft unknown": (
                "/v1/flows/start",
                json.dumps({"flow_inline": {"id": "w", "stages": []},
                            "draft_id": "wall-no-such-draft"}).encode(),
                "POST", 400),
            "S08 ambiguous": (
                "/v1/flows/start",
                json.dumps({"flow_inline": {"id": "w", "stages": []},
                            "draft_id": DID, "model": "x"}).encode(),
                "POST", 400),
            "T01 status unknown": (
                "/v1/flows/status/wall-no-such-run", None, "GET", 404),
            "P01 stop unknown": (
                "/v1/flows/stop/wall-no-such-run", b"", "POST", 400),
            "G01 limit garbage": (
                "/v1/flows/runs?limit=abc", None, "GET", 400),
            "R01 resume unknown": (
                "/v1/flows/resume/wall-no-such-run", b"", "POST", 400),
            "R02 resume completed": (
                "/v1/flows/resume/run-resume-done", b"", "POST", 400),
            "C01 reproduce unknown": (
                "/v1/flows/reproduce/wall-no-such-run", b"", "POST", 400),
            "C02 reproduce cardless": (
                "/v1/flows/reproduce/run-rep-cardless", b"", "POST", 400),
            "N01 detail unknown": (
                "/v1/flows/runs/wall-no-such-run", None, "GET", 404),
        }
        for leg in subset:
            path, body, method, want_st = paths[leg]
            st, raw = http(ts_port, path, body, method=method)
            check("TS-alone %s" % leg,
                  st == want_st and raw == ts_bytes[leg],
                  "st=%r bytes-match=%s" % (st, raw == ts_bytes[leg]))
    finally:
        for proc in (py_proc, ts_proc):
            if proc is not None:
                try:
                    reap_gateway(proc)
                except Exception:
                    pass
        shutil.rmtree(py_root, ignore_errors=True)
        shutil.rmtree(ts_root, ignore_errors=True)
    print("queue refusals: %d passed, %d failed" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())

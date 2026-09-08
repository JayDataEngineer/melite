#!/usr/bin/env python3
"""test_gateway_flows_run_parity.py — P4 flows-run TS-ONLY wall.

Pins the TypeScript engine-IO half (packages/gateway/src/engine/
comfyui.ts via doors/flowsRun.ts + the ctx.ts seam) against frozen
literals and frozen TS goldens (golden_ts/
test_gateway_flows_run_parity/, causes.md there):

  Phase A — door refusals (single-serve TS vs `want` literals):
    bad-JSON shape (V8 text prefix, shape-only), non-object body,
    non-bool test flag, draft required / malformed / unknown (CARD
    BIRTH LAW), retired pipe-carry knob, ambiguous doors,
    flow_inline unknown top key, unknown-run status 404, unknown-run
    stop 400, method-mismatch 404.
  Phase B — happy-path lifecycle (TS-only, run_id + root
    normalized): 202 {run_id, status} receipt (shape + golden), the
    SUBMITTED engine graph (namespaced gen::1 — the merged
    single-graph path), terminal status body (golden: stages incl.
    merged/url/gallery/result_outputs, artifacts, error "",
    queue_position 0, skipped_stages []), ?include_log=TRUE tail
    (golden), harvested artifact bytes (PNG-BYTES literal).
  Phase C — engine-behavior pins (a node harness driving
    engine/comfyui.ts in-process, same stub, vs literal error
    texts): polling cadence/deadline mapping ("ComfyUI run exceeded
    2s (interrupt delivered)"), stop ("stopped (interrupt
    delivered)", interrupt + queue-delete witnessed on the stub),
    node_errors text ("ComfyUI validation refused the graph: ..."),
    merged node_errors ("... the merged graph: ..."), prompt-400
    text ("POST /prompt 400: ..."), history error-status text
    ("ComfyUI run failed: ...").
  Phase D — stop-door lifecycle (TS-only, never-completing stub):
    200 {run_id, status: stopping} receipt (golden), terminal
    "stopped" body (golden: stage error "ComfyError: stopped
    (interrupt delivered)", run error ""), interrupt witnessed.
  Phase E — engine-down shape (stub socket closed): the run fails;
    status failed + stage failed + "refused" in the error.

The stub is a PYTHON stdlib ThreadingHTTPServer living in THIS
process (hermetic wall discipline: no live engine in walls, ever):
scripted /prompt + /history/<id> (per-prompt poll counts) + /view +
/interrupt + /queue delete-recording + a 101 /ws tap answer (the TS
preview ships no WS tap; the tap must see a handshake-shaped answer
and stay harmless).

TS runs as the real server boot (own MELITE_STATE_ROOT, COMFYUI_URL
= stub) via the shared boot_scratch_gateway (tests/_bootstrap.py).
Draft docs are written to the TS root under a fixed draft id.

ASSERTED SHAPES (not bytes):
  - run_id values are random per boot (normalized to <RID>).
  - absolute artifact paths carry the state root (normalized to
    <ROOT>).
  - bad-JSON error TEXT embeds the host parser's message (V8
    SyntaxError) — status + code + prefix only.
  - engine-down error TEXT (node:http ECONNREFUSED prose) — failed
    shape + "refused" substring.
  - method-mismatch body — 404 status only (no wire peer to agree
    with).
  - float formatting — no served body carries a float.

Polling/timeout mapping decisions under test (TS cites):
  - cadence 250ms + history GET timeout 30s (engine/comfyui.ts
    pollToTerminal: sleep(250), httpCall timeout 30000).
  - entry-absent + past-deadline -> interrupt + "ComfyUI run
    exceeded <n>s (interrupt delivered)" (pollToTerminal via the
    exceededText closures; the %.0f-equivalent is formatTimeout0f,
    round-half-even).
  - status_str error -> execution_error message detail else the
    whole status dict, "ComfyUI run failed: ..." (mapHistoryEntry +
    pollToTerminal's failed arm).
  - not-completed + past-deadline -> interrupt + exceeded (the
    pending arm).
  - stop flag -> interrupt + "stopped (interrupt delivered)"
    (pollToTerminal's shouldStop arm); the gateway stop-gates on
    flag-set AND "stop" in the lowercased error (doors/flowsRun.ts
    handleFlowsStop + the merged worker's stopped arm).
  - single-stage pure-comfyui runs take the MERGED path
    (doors/flowsRun.ts merged worker): ONE submit of the namespaced
    graph, "the merged graph" node_errors text (submitPrompt merged
    arm), "merged run exceeded" deadline text with floor
    max(budget,2400) (executeFlow), per-stage harvest into
    <run>/<stage>/ with prefix-stripped keys, terminal stage rows
    {id,name,index,status,outputs,expected,merged,url,gallery,
    result_outputs}.

TS door cites (doors/flowsRun.ts): retired pipe-carry refusal
(checkStrictBody arm), flow_inline top-key + unknown-keys refusals,
envelope bad_envelope arms (non-object body, non-bool test flag),
draft_required / draft_malformed / draft_unknown (CARD BIRTH LAW),
ambiguous-doors refusal, status unknown-run 404
(handleFlowsStatus), stop unknown-run 400 run_unknown
(handleFlowsStop), status payload + runLogTail (?include_log tail).

ORACLE DEATH 2026-09-08: this wall was a dual-serve py-vs-TS parity
comparison (per the operator order "we do not need parity, we need
to migrate, not keep the old machinery"); re-derived TS-ONLY — the
py scratch-gateway legs, the py-vs-TS byte-equality legs, and the py
native/mergegraph in-process legs are deleted; TS behavior pins to
the `want` literals + frozen goldens below. The keeper engine libs
(packages/engines/comfyui/compose/native.py, mergegraph.py) are
engine libs, not the gateway oracle — untouched; the node harness
legs driving their TS port (engine/comfyui.ts) are the behavior
pin now.

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

Run: python3 tests/walls/suites/test_gateway_flows_run_parity.py
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
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from _anchor import REPO, boot_scratch_gateway, reap_gateway

sys.dont_write_bytecode = True

PASS = FAIL = 0
DID = "wall-flows-draft-1"
ENGINE_TS = REPO / "packages" / "gateway" / "src" / "engine" / "comfyui.ts"
GOLDEN_DIR = (REPO / "tests" / "walls" / "suites" / "golden_ts" /
              "test_gateway_flows_run_parity")
WF = {"1": {"class_type": "EmptyLatentImage",
            "inputs": {"width": 64, "height": 64, "batch_size": 1}}}
HISTORY_OK = {"status": {"status_str": "success", "completed": True},
              "outputs": {"gen::save": {
                  "images": [{"filename": "out.png", "subfolder": "",
                              "type": "output"}]}}}
HISTORY_ERR = {"status": {"status_str": "error", "completed": False,
                          "messages": [["execution_error",
                                        {"node_id": "1",
                                         "exception_message": "boom"}]]},
               "outputs": {}}
NODE_ERRORS = {"1": {"errors": [{"message": "unknown node"}]}}


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def golden(name: str) -> str:
    return (GOLDEN_DIR / name).read_text(encoding="utf-8")


# ── the stub ComfyUI ─────────────────────────────────────────────

class Stub:
    """Scripted engine: mode switches the scripted shape; every
    request is recorded under a lock."""

    def __init__(self) -> None:
        self.mode = "normal"
        self.hits: dict[str, int] = {}
        self.prompts: list[dict] = []
        self.interrupts = 0
        self.queue_deletes: list[list] = []
        self.views = 0
        self.lock = threading.Lock()
        self.server: ThreadingHTTPServer | None = None
        self.port = 0

    def history_for(self, pid: str) -> dict:
        with self.lock:
            self.hits[pid] = self.hits.get(pid, 0) + 1
            n = self.hits[pid]
            mode = self.mode
        if mode == "never":
            return {}
        if mode == "error-status":
            return {pid: HISTORY_ERR}
        if n >= 2:
            return {pid: HISTORY_OK}
        return {}


STUB = Stub()


class _Handler(BaseHTTPRequestHandler):
    def log_message(self, *a: object) -> None:
        pass

    def _send(self, obj: object, code: int = 200,
              raw: bytes | None = None, ctype: str = "application/json"
              ) -> None:
        body = raw if raw is not None else json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("content-type", ctype)
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_POST(self) -> None:
        n = int(self.headers.get("content-length") or 0)
        raw = self.rfile.read(n) if n else b""
        if self.path == "/prompt":
            try:
                doc = json.loads(raw.decode() or "{}")
            except ValueError:
                doc = {}
            with STUB.lock:
                STUB.prompts.append(doc)
                mode = STUB.mode
            if mode == "prompt-400":
                return self._send({"error": "queue full"}, code=400)
            if mode == "node-errors":
                return self._send({"node_errors": NODE_ERRORS})
            return self._send({})
        if self.path == "/queue":
            try:
                doc = json.loads(raw.decode() or "{}")
            except ValueError:
                doc = {}
            with STUB.lock:
                if isinstance(doc.get("delete"), list):
                    STUB.queue_deletes.append(doc["delete"])
            return self._send({})
        if self.path == "/interrupt":
            with STUB.lock:
                STUB.interrupts += 1
            return self._send({})
        return self._send({"error": "stub: no such route"}, code=404)

    def do_GET(self) -> None:
        if self.path.startswith("/history/"):
            pid = self.path.rsplit("/", 1)[1]
            return self._send(STUB.history_for(pid))
        if self.path.startswith("/view"):
            with STUB.lock:
                STUB.views += 1
            return self._send(None, raw=b"PNG-BYTES",
                              ctype="application/octet-stream")
        if self.path.startswith("/ws"):
            # a handshake-shaped answer: the tap must stay harmless.
            self.send_response(101)
            self.send_header("content-length", "0")
            self.end_headers()
            return
        return self._send({"error": "stub: no such route"}, code=404)


def boot_stub() -> str:
    srv = ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
    srv.daemon_threads = True
    STUB.server = srv
    STUB.port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return "http://127.0.0.1:%d" % STUB.port


# ── HTTP helpers ─────────────────────────────────────────────────

def http(port: int, path: str, body: bytes | None = None,
         method: str | None = None) -> tuple[int | None, bytes]:
    data = body if body is not None else b""
    req = urllib.request.Request(
        "http://127.0.0.1:%d%s" % (port, path),
        data=data if body is not None else None,
        method=method or ("POST" if body is not None else "GET"))
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:
        return None, ("TRANSPORT " + str(e)).encode()


def start_body(draft: str = DID) -> bytes:
    return json.dumps({
        "flow_inline": {"id": "wall-run", "stages": [
            {"id": "gen", "engine": "comfyui",
             "params": {"workflow": WF, "timeout_s": 60}}]},
        "draft_id": draft}).encode()


def wait_status(port: int, run_id: str, want: tuple[str, ...] = (
        "completed", "failed", "stopped"),
        deadline: float = 60.0) -> tuple[int | None, dict]:
    end = time.time() + deadline
    last: tuple[int | None, dict] = (None, {})
    while time.time() < end:
        st, raw = http(port, "/v1/flows/status/" + run_id)
        try:
            doc = json.loads(raw.decode() or "{}")
        except ValueError:
            doc = {}
        last = (st, doc if isinstance(doc, dict) else {})
        if st == 200 and last[1].get("status") in want:
            return last
        time.sleep(0.2)
    return last


def normalize(text: str, roots: list[tuple[str, str]]) -> str:
    for root, _run in roots:
        text = text.replace(root, "<ROOT>")
    import re
    text = re.sub(r"run-[0-9a-f]{12}-[0-9a-f]{8}", "<RID>", text)
    return text


# ── the node harness (drives engine/comfyui.ts in-process) ──────

HARNESS = """\
import { executeFlow, executeSingle } from %s;
const stub = process.env.WALL_STUB ?? "";
const op = process.argv[2] ?? "";
const workdir = process.argv[3] ?? "";
const WF = { "1": { class_type: "EmptyLatentImage",
  inputs: { width: 64, height: 64, batch_size: 1 } } };
let stop = false;
try {
  if (op === "single-timeout") {
    await executeSingle(workdir, { workflow: WF, timeout_s: 2 },
      { default: "image" }, {}, stub);
  } else if (op === "single-stop") {
    setTimeout((): void => { stop = true; }, 700);
    await executeSingle(workdir, { workflow: WF, timeout_s: 60 },
      { default: "image" }, { shouldStop: (): boolean => stop }, stub);
  } else if (op === "single-node-errors" || op === "single-prompt400"
      || op === "single-history-error") {
    await executeSingle(workdir, { workflow: WF, timeout_s: 60 },
      { default: "image" }, {}, stub);
  } else if (op === "flow-merged-node-errors") {
    await executeFlow(
      [{ stageId: "gen", workflow: WF, outputs: { default: "image" },
         outputNodes: {}, params: { timeout_s: 60 } }],
      workdir, {}, {}, {}, stub);
  } else { throw new Error("unknown op " + op); }
  console.log(JSON.stringify({ ok: true }));
} catch (exc) {
  const msg = exc instanceof Error ? exc.message : String(exc);
  const name = exc instanceof Error ? exc.name : "Error";
  console.log(JSON.stringify({ ok: false, error: name + ": " + msg }));
}
"""


def node_engine(op: str, workdir: str, stub: str) -> dict:
    path = Path(tempfile.gettempdir()) / ("wall-flows-harness-%d.mts" % os.getpid())
    if not path.is_file():
        path.write_text(HARNESS % json.dumps(ENGINE_TS.as_uri()))
    env = dict(os.environ, WALL_STUB=stub)
    proc = subprocess.run(
        [shutil.which("node") or "node", "--experimental-strip-types",
         "--no-warnings", str(path), op, workdir],
        cwd=str(REPO), env=env, capture_output=True, text=True, timeout=90)
    line = (proc.stdout or "").strip().splitlines()
    if not line:
        return {"ok": False,
                "error": "harness produced no output (rc=%d) %s"
                % (proc.returncode, (proc.stderr or "")[-300:])}
    try:
        return json.loads(line[-1])
    except ValueError:
        return {"ok": False, "error": "harness unparsable: %r" % line[-1][:200]}


# ── the wall ─────────────────────────────────────────────────────

def main() -> int:
    stub_url = boot_stub()
    ts_root = Path(tempfile.mkdtemp(prefix="wall-flows-ts-"))
    ts_proc = None
    try:
        (ts_root / "drafts").mkdir(parents=True)
        (ts_root / "drafts" / (DID + ".json")).write_text(
            json.dumps({"draft_id": DID}))
        ts_port, ts_proc = boot_scratch_gateway(env=dict(
            os.environ, MELITE_STATE_ROOT=str(ts_root),
            COMFYUI_URL=stub_url))

        # ── Phase A: refusal pins (TS vs `want` literals) ──
        cases = [
            ("non-object", b"[1,2]",
             {"error": "request body must be a JSON object",
              "code": "bad_envelope", "loc": "body",
              "expected": "object", "got": "list"}),
            ("test flag", json.dumps(
                {"flow_inline": {}, "draft_id": DID,
                 "test": "false"}).encode(),
             {"error": "test flag must be a boolean (got str 'false')",
              "code": "bad_envelope", "loc": "test",
              "expected": "boolean", "got": "str"}),
            ("draft required", json.dumps(
                {"flow_inline": {"id": "w", "stages": []}}).encode(),
             {"error": "draft_id is required — every run is born from an "
              "action card (CARD BIRTH LAW); compose the card first: "
              "POST /v1/flows/drafts, then start with its draft_id "
              "(docs/cards/draft-door.md)",
              "code": "draft_required", "loc": "draft_id",
              "expected": "doc-backed draft id", "got": "absent"}),
            ("draft malformed", json.dumps(
                {"flow_inline": {"id": "w", "stages": []},
                 "draft_id": "!!"}).encode(),
             {"error": "draft_id malformed (96 char cap, "
              "[A-Za-z0-9_-] only): '!!'",
              "code": "draft_malformed", "loc": "draft_id",
              "expected": "[A-Za-z0-9_-]{1,96}", "got": "!!"}),
            ("draft unknown", json.dumps(
                {"flow_inline": {"id": "w", "stages": []},
                 "draft_id": "wall-no-such-draft"}).encode(),
             {"error": "unknown draft_id 'wall-no-such-draft' — no card "
              "doc at drafts/wall-no-such-draft.json; compose the card "
              "first: POST /v1/flows/drafts",
              "code": "draft_unknown", "loc": "draft_id",
              "expected": "existing card doc",
              "got": "wall-no-such-draft"}),
            ("retired knob", json.dumps(
                {"flow_inline": {"id": "w", "stages": []},
                 "draft_id": DID, "pipe": "x"}).encode(),
             {"error": "request body carries retired pipe-carry key(s) "
              "['pipe'] — the 2026-08-10 stowaway wire: no gateway ever "
              "stashed it (flow_doc was never emitted). The revive rail "
              "is the draft (draft_id) + the run registry; card bodies "
              "carry params only",
              "code": "invalid_request"}),
            ("ambiguous doors", json.dumps(
                {"flow_inline": {"id": "w", "stages": []},
                 "draft_id": DID, "model": "x"}).encode(),
             {"error": "ambiguous request: names ['flow_inline', "
              "'model'] — provide exactly one of flow, flow_inline, "
              "model",
              "code": "invalid_request"}),
            ("inline top key", json.dumps(
                {"flow_inline": {"id": "w",
                                "stages": [{"id": "gen", "engine": "comfyui",
                                            "params": {"workflow": WF}}],
                                "yaml": 1},
                 "draft_id": DID}).encode(),
             {"error": "flow body carries unknown keys ['yaml'] — "
              "allowed: ['description', 'id', 'stages']",
              "code": "invalid_request"}),
        ]
        for name, body, want in cases:
            st, raw = http(ts_port, "/v1/flows/start", body)
            check("refuse %s status" % name, st == 400,
                  "ts=%r" % (st,))
            try:
                doc = json.loads(raw.decode() or "{}")
            except ValueError:
                doc = {}
            check("refuse %s body" % name, doc == want,
                  "ts=%r" % (raw[:160],))
        st, raw = http(ts_port, "/v1/flows/start", b"{bad")
        try:
            d_shape = json.loads(raw.decode() or "{}")
        except ValueError:
            d_shape = {}
        check("bad JSON shape",
              st == 400 and
              str(d_shape.get("error", "")).startswith("bad JSON: ") and
              d_shape.get("code") == "bad_json",
              raw[:120].decode("utf8", "replace"))
        for path, want_st, want in [
                ("/v1/flows/status/wall-no-such-run", 404,
                 {"error": "unknown run_id", "code": "invalid_request"}),
                ("/v1/flows/stop/wall-no-such-run", 400,
                 {"error": "unknown run_id 'wall-no-such-run'",
                  "code": "run_unknown", "loc": "run_id"})]:
            method = "GET" if "/status/" in path else "POST"
            st, raw = http(ts_port, path, b"" if method == "POST" else None,
                           method=method)
            try:
                doc = json.loads(raw.decode() or "{}")
            except ValueError:
                doc = {}
            check("refuse %s" % path,
                  st == want_st and doc == want,
                  "ts=%r %r" % (st, raw[:160]))
        st, _raw = http(ts_port, "/v1/flows/start", None, method="GET")
        check("method mismatch 404", st == 404, "ts=%r" % (st,))

        # ── Phase C: engine-behavior pins (node harness vs literals) ──
        # The harness drives the TS port of the comfyui execute lane
        # (packages/gateway/src/engine/comfyui.ts: executeSingle /
        # executeFlow over the stub); the keeper engine libs
        # (packages/engines/comfyui/compose/native.py, mergegraph.py)
        # are engine libs, not the gateway oracle — untouched, and no
        # in-process py comparison remains.
        STUB.mode = "never"
        wdir = tempfile.mkdtemp(prefix="wall-eng-")
        with STUB.lock:
            base_int, base_del = STUB.interrupts, len(STUB.queue_deletes)
        got_ts = node_engine("single-timeout", wdir + "/ts", stub_url)
        check("deadline text",
              got_ts.get("error") ==
              "ComfyError: ComfyUI run exceeded 2s (interrupt delivered)",
              "ts=%r" % (got_ts,))
        with STUB.lock:
            n_int = STUB.interrupts - base_int
            n_del = len(STUB.queue_deletes) - base_del
        check("deadline interrupts witnessed", n_int >= 1 and n_del >= 1,
              "interrupts=%d deletes=%d" % (n_int, n_del))

        got_ts = node_engine("single-stop", wdir + "/ts-stop", stub_url)
        check("stop text",
              got_ts.get("error") ==
              "ComfyError: stopped (interrupt delivered)",
              "ts=%r" % (got_ts,))

        STUB.mode = "node-errors"
        got_ts = node_engine("single-node-errors", wdir + "/ts-ne",
                             stub_url)
        want_ne = ("ComfyError: ComfyUI validation refused the graph: " +
                   json.dumps(NODE_ERRORS))
        check("node_errors text",
              got_ts.get("error") == want_ne,
              "ts=%r" % (got_ts,))
        got_ts = node_engine("flow-merged-node-errors", wdir + "/ts-mne",
                             stub_url)
        want_mne = ("ComfyError: ComfyUI validation refused the merged "
                    "graph: " + json.dumps(NODE_ERRORS))
        check("merged node_errors text",
              got_ts.get("error") == want_mne,
              "ts=%r" % (got_ts,))

        STUB.mode = "prompt-400"
        got_ts = node_engine("single-prompt400", wdir + "/ts-p400",
                             stub_url)
        want_p400 = ("ComfyError: POST /prompt 400: "
                     "{'error': 'queue full'}")
        check("prompt-400 text",
              got_ts.get("error") == want_p400,
              "ts=%r" % (got_ts,))

        STUB.mode = "error-status"
        got_ts = node_engine("single-history-error", wdir + "/ts-herr",
                             stub_url)
        want_herr = ("ComfyError: ComfyUI run failed: " +
                     '{"node_id": "1", "exception_message": "boom"}')
        check("history error text",
              got_ts.get("error") == want_herr,
              "ts=%r" % (got_ts,))

        # ── Phase B: happy-path lifecycle (TS vs goldens) ──
        STUB.mode = "normal"
        with STUB.lock:
            STUB.prompts.clear()
        st, raw = http(ts_port, "/v1/flows/start", start_body())
        check("start 202", st == 202, "ts=%r" % ((st, raw[:120]),))
        doc = json.loads(raw.decode())
        check("202 receipt shape",
              set(doc) == {"run_id", "status"} and
              doc["status"] == "queued",
              "ts=%r" % (doc,))
        ts_run = doc["run_id"]
        roots = [(str(ts_root), ts_run)]
        check("202 receipt golden",
              normalize(raw.decode(), roots) == golden("receipt-202.json"),
              "%r" % (raw[:160],))
        st, doc = wait_status(ts_port, ts_run)
        check("terminal completed",
              st == 200 and doc.get("status") == "completed",
              "ts=%r" % (doc.get("status"),))
        check("terminal body golden",
              normalize(json.dumps(doc, sort_keys=True), roots) ==
              golden("terminal-completed.json"),
              "%s" % (normalize(json.dumps(doc, sort_keys=True),
                                roots)[:400],))
        with STUB.lock:
            graphs = [p.get("prompt", {}) for p in STUB.prompts]
        check("one submit", len(graphs) == 1, repr(len(graphs)))
        if len(graphs) == 1:
            check("submitted graph namespaced",
                  "gen::1" in graphs[0], "%r" % (graphs,))
        st, raw = http(ts_port, "/v1/flows/status/" + ts_run +
                       "?include_log=TRUE", None, method="GET")
        check("include_log golden",
              st == 200 and
              normalize(raw.decode(), roots) == golden("include-log.json"),
              "%r" % (raw[:300],))
        rel = "gen/out.png"
        pb = ts_root / "output" / ts_run / rel
        check("harvested bytes",
              pb.is_file() and pb.read_bytes() == b"PNG-BYTES",
              "%s" % (pb.is_file(),))

        # ── Phase D: stop-door lifecycle (TS vs goldens) ──
        STUB.mode = "never"
        with STUB.lock:
            base_int, base_del = STUB.interrupts, len(STUB.queue_deletes)
        st, raw = http(ts_port, "/v1/flows/start", start_body())
        ts_run2 = json.loads(raw.decode())["run_id"]
        end = time.time() + 30
        while time.time() < end:
            s2, r2 = http(ts_port, "/v1/flows/status/" + ts_run2)
            try:
                if json.loads(r2.decode()).get("status") == "running":
                    break
            except ValueError:
                pass
            time.sleep(0.2)
        st, raw = http(ts_port, "/v1/flows/stop/" + ts_run2, b"")
        roots2 = [(str(ts_root), ts_run2)]
        check("stop receipt golden",
              st == 200 and
              normalize(raw.decode(), roots2) == golden("stop-receipt.json"),
              "%r %r" % (st, raw[:160]))
        st, doc = wait_status(ts_port, ts_run2, ("stopped",))
        check("terminal stopped",
              st == 200 and doc.get("status") == "stopped",
              "ts=%r" % (doc.get("status"),))
        check("stopped body golden",
              normalize(json.dumps(doc, sort_keys=True), roots2) ==
              golden("stopped.json"),
              "%s" % (normalize(json.dumps(doc, sort_keys=True),
                                roots2)[:500],))
        check("stopped stage error",
              doc["stages"][0].get("error") ==
              "ComfyError: stopped (interrupt delivered)"
              and doc.get("error") == "",
              "%r" % (doc["stages"][0].get("error"),))
        with STUB.lock:
            grew_int = STUB.interrupts - base_int
            grew_del = len(STUB.queue_deletes) - base_del
        check("stop interrupts witnessed",
              grew_int >= 1 and grew_del >= 1,
              "interrupts=%d deletes=%d" % (grew_int, grew_del))

        # ── Phase E: engine-down shape (TS-only) ──
        assert STUB.server is not None
        STUB.server.shutdown()
        STUB.server.server_close()
        st, raw = http(ts_port, "/v1/flows/start", start_body())
        ts_run3 = json.loads(raw.decode())["run_id"]
        st, doc = wait_status(ts_port, ts_run3, ("failed",))
        failed = (st == 200 and doc.get("status") == "failed" and
                  doc["stages"] and
                  doc["stages"][0].get("status") == "failed" and
                  "refused" in str(doc["stages"][0].get("error", ""))
                  .lower())
        check("engine-down failed shape", failed,
              "%r" % ({k: doc.get(k) for k in ("status", "error")},))
        print("PASS %d FAIL %d" % (PASS, FAIL))
        return 1 if FAIL else 0
    finally:
        if ts_proc is not None:
            reap_gateway(ts_proc)
        shutil.rmtree(ts_root, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())

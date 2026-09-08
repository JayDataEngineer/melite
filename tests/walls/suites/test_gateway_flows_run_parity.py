#!/usr/bin/env python3
"""test_gateway_flows_run_parity.py — P4 flows-run TS parity wall.

Proves the TypeScript engine-IO half (packages/gateway/src/engine/
comfyui.ts via doors/flowsRun.ts + the ctx.ts seam) answers
byte-identical to the py gateway (py/gateway.py _h_flows_start /
_h_flows_status / _h_flows_stop over Gateway.submit/status/stop, and
the comfyui execute lane packages/engines/comfyui/compose/native.py +
mergegraph.py):

  Phase A — door refusal parity (dual-served py vs TS, byte-equal):
    bad-JSON shape, non-object body, non-bool test flag,
    draft required / malformed / unknown (CARD BIRTH LAW),
    retired pipe-carry knob (_strict_body), ambiguous doors,
    flow_inline unknown top key, unknown-run status 404, unknown-run
    stop 400, method-mismatch 404.
  Phase B — happy-path parity (dual-served, run_id + root
    normalized): 202 {run_id, status} receipt, the SUBMITTED engine
    graph (namespaced gen::1 on both — the merged single-graph
    path), terminal status bodies (stages incl. merged/url/gallery/
    result_outputs, artifacts, error "", queue_position 0,
    skipped_stages []), ?include_log=TRUE tail, harvested artifact
    bytes.
  Phase C — engine-behavior agreement (py native.execute /
    mergegraph.execute_flow in-process vs a node harness driving
    engine/comfyui.ts, same stub): polling cadence/deadline mapping
    ("ComfyUI run exceeded 2s (interrupt delivered)", byte-equal),
    stop ("stopped (interrupt delivered)", byte-equal, interrupt +
    queue-delete witnessed on the stub for BOTH), node_errors text
    ("ComfyUI validation refused the graph: ...", byte-equal),
    merged node_errors ("... the merged graph: ...", byte-equal),
    prompt-400 text ("POST /prompt 400: ...", byte-equal),
    history error-status text ("ComfyUI run failed: ...",
    byte-equal).
  Phase D — stop-door parity (dual-served, never-completing stub):
    200 {run_id, status: stopping} receipts (normalized
    byte-equal), terminal "stopped" bodies (normalized byte-equal:
    stage error "ComfyError: stopped (interrupt delivered)", run
    error ""), interrupt witnessed per side.
  Phase E — engine-down parity (stub socket closed): both runs fail;
    status failed + stage failed + "refused" in the error (shape
    parity — urllib vs node:http errno prose differs by platform).

The stub is a PYTHON stdlib ThreadingHTTPServer living in THIS
process (hermetic wall discipline: no live engine in walls, ever):
scripted /prompt + /history/<id> (per-prompt poll counts, so the py
and TS runs interleave safely) + /view + /interrupt + /queue
delete-recording + a 101 /ws tap answer (the TS preview ships no WS
tap; py's tap must see a handshake-shaped answer and stay harmless).

Py runs as a REAL scratch gateway (boot_scratch_gateway: own
MELITE_STATE_ROOT, COMFYUI_URL=stub); TS runs as the real server.ts
boot (own MELITE_STATE_ROOT, same COMFYUI_URL). Draft docs are
written to both roots under the SAME draft id.

KNOWN divergences (asserted as shape, not bytes):
  - run_id values are random per side (normalized to <RID>).
  - absolute artifact paths carry the side's root (normalized).
  - bad-JSON error TEXT embeds the host parser's message (CPython
    JSONDecodeError vs V8 SyntaxError) — status + code + prefix.
  - engine-down error TEXT (urllib "Connection refused" vs
    node:http ECONNREFUSED) — failed shape + "refused" substring.
  - float formatting (py 2.0 vs JSON 2) — no served body carries a
    float.

Polling/timeout mapping decisions under test (py cites):
  - cadence 250ms (native.py:378); history GET timeout 30s (383).
  - entry-absent + past-deadline -> interrupt + "ComfyUI run
    exceeded %.0fs (interrupt delivered)" (native 387-393); the
    %.0f is round-half-even (formatTimeout0f in engine/comfyui.ts).
  - status_str error -> execution_error message detail else the
    whole status dict, "ComfyUI run failed: ..." (394-401).
  - not-completed + past-deadline -> interrupt + exceeded (402-408).
  - stop flag -> interrupt + "stopped (interrupt delivered)"
    (380-382); the gateway stop-gates on flag-set AND "stop" in the
    lowercased error (gateway.py:1774, _try_merged ~1565-1580).
  - single-stage pure-comfyui runs take the MERGED path
    (gateway.py:1631 _try_merged): ONE submit of the namespaced
    graph, "the merged graph" node_errors text (mergegraph 306),
    "merged run exceeded" deadline text with floor max(budget,2400)
    (318-327), per-stage harvest into <run>/<stage>/ with
    prefix-stripped keys (370-386), terminal stage rows
    {id,name,index,status,outputs,expected,merged,url,gallery,
    result_outputs}.

Run: python3 tests/walls/suites/test_gateway_flows_run_parity.py
"""

import asyncio
import json
import os
import shutil
import socket
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
sys.path.insert(0, str(REPO / "py"))
sys.path.insert(0, str(REPO / "packages" / "engines" / "comfyui" / "compose"))

PASS = FAIL = 0
DID = "wall-flows-draft-1"
TS_SERVER = REPO / "packages" / "gateway" / "src" / "server.ts"
ENGINE_TS = REPO / "packages" / "gateway" / "src" / "engine" / "comfyui.ts"
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


# ── the stub ComfyUI ─────────────────────────────────────────────

class Stub:
    """Scripted engine: mode switches the scripted shape; every
    request is recorded under a lock (py + TS interleave)."""

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
            # a handshake-shaped answer: py's tap must stay harmless.
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


class FakeNode:
    def __init__(self, params: dict, outputs: dict) -> None:
        self.params = params
        self.outputs = outputs


# ── the wall ─────────────────────────────────────────────────────

def main() -> int:
    stub_url = boot_stub()
    py_root = Path(tempfile.mkdtemp(prefix="wall-flows-py-"))
    ts_root = Path(tempfile.mkdtemp(prefix="wall-flows-ts-"))
    py_proc = ts_proc = None
    try:
        for root in (py_root, ts_root):
            (root / "drafts").mkdir(parents=True)
            (root / "drafts" / (DID + ".json")).write_text(
                json.dumps({"draft_id": DID}))
        py_port, py_proc = boot_scratch_gateway(env=dict(
            os.environ, MELITE_STATE_ROOT=str(py_root),
            COMFYUI_URL=stub_url))
        ts_port, ts_proc = boot_ts(dict(
            os.environ, MELITE_STATE_ROOT=str(ts_root),
            COMFYUI_URL=stub_url))

        # ── Phase A: refusal parity (byte-equal) ──
        ro_a = start_body()
        ro_b = start_body().replace(b'"width": 64', b'"width": 65')
        cases = [
            ("bad JSON", b"{bad", None),
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
            a = http(py_port, "/v1/flows/start", body)
            b = http(ts_port, "/v1/flows/start", body)
            check("refuse %s status" % name, a[0] == b[0] == 400,
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
                check("refuse %s body" % name,
                      a[1] == b[1] and da == want and db == want,
                      "py=%r ts=%r" % (a[1][:160], b[1][:160]))
        st, raw = http(py_port, "/v1/flows/start", b"{bad")
        try:
            d_shape = json.loads(raw.decode() or "{}")
        except ValueError:
            d_shape = {}
        check("bad JSON shape",
              st == 400 and
              str(d_shape.get("error", "")).startswith("bad JSON: ") and
              d_shape.get("code") == "bad_json",
              raw[:120].decode("utf8", "replace"))
        st2, raw2 = http(ts_port, "/v1/flows/start", b"{bad")
        try:
            d_shape2 = json.loads(raw2.decode() or "{}")
        except ValueError:
            d_shape2 = {}
        check("bad JSON shape ts",
              st2 == 400 and
              str(d_shape2.get("error", "")).startswith("bad JSON: ") and
              d_shape2.get("code") == "bad_json",
              raw2[:120].decode("utf8", "replace"))
        for path, want_st, want in [
                ("/v1/flows/status/wall-no-such-run", 404,
                 {"error": "unknown run_id", "code": "invalid_request"}),
                ("/v1/flows/stop/wall-no-such-run", 400,
                 {"error": "unknown run_id 'wall-no-such-run'",
                  "code": "run_unknown", "loc": "run_id"})]:
            method = "GET" if "/status/" in path else "POST"
            a = http(py_port, path, b"" if method == "POST" else None,
                     method=method)
            b = http(ts_port, path, b"" if method == "POST" else None,
                     method=method)
            try:
                da = json.loads(a[1].decode() or "{}")
            except ValueError:
                da = {}
            try:
                db = json.loads(b[1].decode() or "{}")
            except ValueError:
                db = {}
            check("refuse %s" % path,
                  a[0] == b[0] == want_st and da == want and db == want,
                  "py=%r ts=%r" % (a, b))
        a = http(py_port, "/v1/flows/start", None, method="GET")
        b = http(ts_port, "/v1/flows/start", None, method="GET")
        check("method mismatch 404",
              a[0] == b[0] == 404 and a[1] == b[1],
              "py=%r ts=%r" % (a, b))

        # ── Phase C: engine-behavior agreement (stub modes) ──
        import native
        import mergegraph
        os.environ["COMFYUI_URL"] = stub_url

        async def py_single(params: dict, workdir: str,
                            stop_after: float | None = None) -> dict:
            ev = asyncio.Event()
            if stop_after is not None:
                async def _stop() -> None:
                    await asyncio.sleep(stop_after)
                    ev.set()
                asyncio.create_task(_stop())
            try:
                res = await native.execute(
                    FakeNode(params, {"default": "image"}), workdir, {},
                    ev)
                return {"ok": True, "result": res}
            except Exception as e:
                return {"ok": False,
                        "error": "%s: %s" % (type(e).__name__, e)}

        async def py_merged(params: dict, workdir: str) -> dict:
            ev = asyncio.Event()
            rows = [{"stage_id": "gen", "node_id": "gen", "node_type":
                     "comfyui", "params": params,
                     "workflow": params.get("workflow", {}),
                     "outputs": {"default": "image"},
                     "output_nodes": {}, "input_names": {}}]
            try:
                res = await mergegraph.execute_flow(rows, workdir, ev,
                                                    None, {})
                return {"ok": True, "result": res}
            except Exception as e:
                return {"ok": False,
                        "error": "%s: %s" % (type(e).__name__, e)}

        STUB.mode = "never"
        wdir = tempfile.mkdtemp(prefix="wall-eng-")
        got_py = asyncio.run(py_single({"workflow": WF, "timeout_s": 2},
                                       wdir + "/py"))
        got_ts = node_engine("single-timeout", wdir + "/ts", stub_url)
        check("deadline text",
              got_py.get("error") == got_ts.get("error") ==
              "ComfyError: ComfyUI run exceeded 2s (interrupt delivered)",
              "py=%r ts=%r" % (got_py, got_ts))
        with STUB.lock:
            n_int, n_del = STUB.interrupts, len(STUB.queue_deletes)
        check("deadline interrupts witnessed", n_int >= 2 and n_del >= 2,
              "interrupts=%d deletes=%d" % (n_int, n_del))

        got_py = asyncio.run(py_single({"workflow": WF, "timeout_s": 60},
                                       wdir + "/py-stop", 0.7))
        got_ts = node_engine("single-stop", wdir + "/ts-stop", stub_url)
        check("stop text",
              got_py.get("error") == got_ts.get("error") ==
              "ComfyError: stopped (interrupt delivered)",
              "py=%r ts=%r" % (got_py, got_ts))

        STUB.mode = "node-errors"
        got_py = asyncio.run(py_single({"workflow": WF, "timeout_s": 60},
                                       wdir + "/py-ne"))
        got_ts = node_engine("single-node-errors", wdir + "/ts-ne",
                             stub_url)
        want_ne = ("ComfyError: ComfyUI validation refused the graph: " +
                   json.dumps(NODE_ERRORS))
        check("node_errors text",
              got_py.get("error") == got_ts.get("error") == want_ne,
              "py=%r ts=%r" % (got_py, got_ts))
        got_py = asyncio.run(py_merged({"workflow": WF, "timeout_s": 60},
                                       wdir + "/py-mne"))
        got_ts = node_engine("flow-merged-node-errors", wdir + "/ts-mne",
                             stub_url)
        want_mne = ("ComfyError: ComfyUI validation refused the merged "
                    "graph: " + json.dumps(NODE_ERRORS))
        check("merged node_errors text",
              got_py.get("error") == got_ts.get("error") == want_mne,
              "py=%r ts=%r" % (got_py, got_ts))

        STUB.mode = "prompt-400"
        got_py = asyncio.run(py_single({"workflow": WF, "timeout_s": 60},
                                       wdir + "/py-p400"))
        got_ts = node_engine("single-prompt400", wdir + "/ts-p400",
                             stub_url)
        want_p400 = ("ComfyError: POST /prompt 400: "
                     "{'error': 'queue full'}")
        check("prompt-400 text",
              got_py.get("error") == got_ts.get("error") == want_p400,
              "py=%r ts=%r" % (got_py, got_ts))

        STUB.mode = "error-status"
        got_py = asyncio.run(py_single({"workflow": WF, "timeout_s": 60},
                                       wdir + "/py-herr"))
        got_ts = node_engine("single-history-error", wdir + "/ts-herr",
                             stub_url)
        want_herr = ("ComfyError: ComfyUI run failed: " +
                     '{"node_id": "1", "exception_message": "boom"}')
        check("history error text",
              got_py.get("error") == got_ts.get("error") == want_herr,
              "py=%r ts=%r" % (got_py, got_ts))

        # ── Phase B: happy-path parity (normalized byte-equal) ──
        STUB.mode = "normal"
        with STUB.lock:
            STUB.prompts.clear()
        a = http(py_port, "/v1/flows/start", start_body())
        b = http(ts_port, "/v1/flows/start", start_body())
        check("start 202", a[0] == b[0] == 202, "py=%r ts=%r" % (a, b))
        da = json.loads(a[1].decode())
        db = json.loads(b[1].decode())
        check("202 receipt shape",
              set(da) == set(db) == {"run_id", "status"} and
              da["status"] == db["status"] == "queued",
              "py=%r ts=%r" % (da, db))
        py_run, ts_run = da["run_id"], db["run_id"]
        roots = [(str(py_root), py_run), (str(ts_root), ts_run)]
        check("202 receipts agree",
              normalize(a[1].decode(), roots) ==
              normalize(b[1].decode(), roots), "%r vs %r" % (a[1], b[1]))
        sta, doca = wait_status(py_port, py_run)
        stb, docb = wait_status(ts_port, ts_run)
        check("terminal completed",
              sta == stb == 200 and doca.get("status") ==
              docb.get("status") == "completed",
              "py=%r ts=%r" % (doca.get("status"), docb.get("status")))
        na = normalize(json.dumps(doca, sort_keys=True), roots)
        nb = normalize(json.dumps(docb, sort_keys=True), roots)
        check("terminal bodies agree", na == nb,
              "py=%s ts=%s" % (na[:400], nb[:400]))
        with STUB.lock:
            graphs = [p.get("prompt", {}) for p in STUB.prompts]
        check("one submit each", len(graphs) == 2, repr(len(graphs)))
        if len(graphs) == 2:
            ga = json.dumps(graphs[0], sort_keys=True)
            gb = json.dumps(graphs[1], sort_keys=True)
            check("submitted graph namespaced+equal",
                  ga == gb and "gen::1" in graphs[0],
                  "%r" % (graphs,))
        la = http(py_port, "/v1/flows/status/" + py_run +
                  "?include_log=TRUE", None, method="GET")
        lb = http(ts_port, "/v1/flows/status/" + ts_run +
                  "?include_log=TRUE", None, method="GET")
        check("include_log agrees",
              la[0] == lb[0] == 200 and
              normalize(la[1].decode(), roots) ==
              normalize(lb[1].decode(), roots),
              "%r vs %r" % (la[1][:300], lb[1][:300]))
        rel = "gen/out.png"
        pa = py_root / "output" / py_run / rel
        pb = ts_root / "output" / ts_run / rel
        check("harvested bytes agree",
              pa.is_file() and pb.is_file() and
              pa.read_bytes() == pb.read_bytes() == b"PNG-BYTES",
              "%s %s" % (pa.is_file(), pb.is_file()))

        # ── Phase D: stop-door parity (never-completing stub) ──
        STUB.mode = "never"
        with STUB.lock:
            base_int, base_del = STUB.interrupts, len(STUB.queue_deletes)
        a = http(py_port, "/v1/flows/start", start_body())
        b = http(ts_port, "/v1/flows/start", start_body())
        py_run2 = json.loads(a[1].decode())["run_id"]
        ts_run2 = json.loads(b[1].decode())["run_id"]
        for port, rid in ((py_port, py_run2), (ts_port, ts_run2)):
            end = time.time() + 30
            while time.time() < end:
                st, raw = http(port, "/v1/flows/status/" + rid)
                try:
                    if json.loads(raw.decode()).get("status") == \
                            "running":
                        break
                except ValueError:
                    pass
                time.sleep(0.2)
        sa = http(py_port, "/v1/flows/stop/" + py_run2, b"")
        sb = http(ts_port, "/v1/flows/stop/" + ts_run2, b"")
        roots2 = [(str(py_root), py_run2), (str(ts_root), ts_run2)]
        check("stop receipts agree",
              sa[0] == sb[0] == 200 and
              normalize(sa[1].decode(), roots2) ==
              normalize(sb[1].decode(), roots2),
              "%r vs %r" % (sa, sb))
        sta, doca = wait_status(py_port, py_run2, ("stopped",))
        stb, docb = wait_status(ts_port, ts_run2, ("stopped",))
        check("terminal stopped",
              sta == stb == 200 and doca.get("status") ==
              docb.get("status") == "stopped",
              "py=%r ts=%r" % (doca.get("status"), docb.get("status")))
        na = normalize(json.dumps(doca, sort_keys=True), roots2)
        nb = normalize(json.dumps(docb, sort_keys=True), roots2)
        check("stopped bodies agree", na == nb,
              "py=%s ts=%s" % (na[:500], nb[:500]))
        check("stopped stage error",
              doca["stages"][0].get("error") ==
              docb["stages"][0].get("error") ==
              "ComfyError: stopped (interrupt delivered)"
              and doca.get("error") == docb.get("error") == "",
              "%r vs %r" % (doca["stages"][0].get("error"),
                             docb["stages"][0].get("error")))
        with STUB.lock:
            grew_int = STUB.interrupts - base_int
            grew_del = len(STUB.queue_deletes) - base_del
        check("stop interrupts witnessed",
              grew_int >= 2 and grew_del >= 2,
              "interrupts=%d deletes=%d" % (grew_int, grew_del))

        # ── Phase E: engine-down parity (shape) ──
        assert STUB.server is not None
        STUB.server.shutdown()
        STUB.server.server_close()
        a = http(py_port, "/v1/flows/start", start_body())
        b = http(ts_port, "/v1/flows/start", start_body())
        py_run3 = json.loads(a[1].decode())["run_id"]
        ts_run3 = json.loads(b[1].decode())["run_id"]
        sta, doca = wait_status(py_port, py_run3, ("failed",))
        stb, docb = wait_status(ts_port, ts_run3, ("failed",))
        for side, st, doc in (("py", sta, doca), ("ts", stb, docb)):
            failed = (st == 200 and doc.get("status") == "failed" and
                      doc["stages"] and
                      doc["stages"][0].get("status") == "failed" and
                      "refused" in str(doc["stages"][0].get("error", ""))
                      .lower())
            check("engine-down %s failed shape" % side, failed,
                  "%r" % ({k: doc.get(k) for k in
                           ("status", "error")},))
        print("PASS %d FAIL %d" % (PASS, FAIL))
        return 1 if FAIL else 0
    finally:
        for proc in (py_proc, ts_proc):
            if proc is not None:
                reap_gateway(proc)
        shutil.rmtree(py_root, ignore_errors=True)
        shutil.rmtree(ts_root, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())

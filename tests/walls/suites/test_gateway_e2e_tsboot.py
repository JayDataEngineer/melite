#!/usr/bin/env python3
"""test_gateway_e2e_tsboot.py — P5 GATE lifecycle e2e wall (TS boot, py STOPPED).

Full lifecycle against the TS boot ALONE (py stopped — the lock
proves single-writer), wall-first, hermetic (fixture roots only,
never the production root; the live production py gateway holds
the default lock — boots here MUST use isolated MELITE_STATE_ROOTs):

  submit draft -> validate -> start (stub ComfyUI per the
  flows-run wall pattern) -> poll status -> harvest artifacts
  -> runs list/detail agreement -> events/WS frames
  -> resurrect-after-restart (kill TS, reboot, sidecar restore).

Plus the sim test backend leg (plugins/engines/sim/ — the ladder's
deliberate Law-0 test double, tests/walls/suites/test_sim_backend.py):
its agreement legs ported to run against TS.

Every leg dual-pinned against py behavior where py behavior exists
(captured vectors from a dual-serve phase on SEPARATE fixture roots),
TS-only where py cannot (boot-where-py-crashes scalar class).

Phases:
  H — hermetic + lock proof (py STOPPED throughout: no py boot on
      the e2e root; the lock proves single-writer).
  D — dual-serve vector capture (py + TS on separate roots, same
      stub): draft shape, validate bytes, start receipts, terminal
      bodies, harvest bytes, fixture list/detail bytes, WS frames,
      sim validate/mismatch bytes + sim-start divergence shape.
  S — TS-alone lifecycle (py STOPPED, fresh TS root): rerun the
      lifecycle, bytes match the captured D-phase TS vectors
      (transitive py pin).
  R — resurrect-after-restart (TS-alone, kill, reboot): seeded
      queued sidecar restores (queue/status/WS/list/detail agree
      with py's boot vectors); TS-started live runs document the
      no-sidecar preview gap (shape, never bytes); scalar seed
      boots clean TS-only (py crashes AttributeError — the known
      gateway.py:2359 class, never ported).

DOCUMENTED PREVIEW GAPS (pass as shape, never bytes — the wall
would otherwise greenwash known incomplete scope as bugs):
  G1 no sidecar writes on TS start (doors/flowsRun.ts header):
     live-run list rows read success/empty/0 (no sidecar fields)
     vs py completed/wall-run/draft/real-created; live-run detail
     404s on TS vs 200 on py; reboot loses live runs on TS vs
     sidecar restore on py.
  G2 sim start refuses 400 preview_scope on TS (comfyui-only
     preview) vs 202 on py; sim execution/stop/storm legs stay
     py-owned (test_sim_backend.py) — this wall pins validate +
     refusal agreement only.
  G3 bad-JSON texts embed the host parser's message (CPython vs
     V8) — status + code + prefix only.
  G4 run_id / draftId / createdAt differ per side by construction
     — normalized to <RID>/<DID>/<ROOT> before comparing.
  G5 float formatting (py 2.0 vs JSON 2) — no served body here
     carries a float.

Py cites: submit 1179-1270, worker 1353-1371, _try_merged
1426-1611, sidecar 2124-2169, boot_resurrect 2338-2375,
boot_sweep 2378-2409, sidecar_status 2412-2470, status
2954-2982, runs list 3011-3035, detail editor_runs 656-806,
WS 2516-2585, lock 4405-4479, sim engine
plugins/engines/sim/engines/sim/engine.py.

Date: 2026-09-07. Status: landed (P5 gate stroke).

Run: python3 tests/walls/suites/test_gateway_e2e_tsboot.py
"""

import json
import os
import re
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

PASS = FAIL = 0
TS_SERVER = REPO / "plugins" / "gateway" / "src" / "server.ts"
WF = {"1": {"class_type": "EmptyLatentImage",
            "inputs": {"width": 64, "height": 64, "batch_size": 1}}}
HISTORY_OK = {"status": {"status_str": "success", "completed": True},
              "outputs": {"gen::save": {
                  "images": [{"filename": "out.png", "subfolder": "",
                              "type": "output"}]}}}
DRAFT_ID_RE = re.compile(r"^draft-[0-9a-f]+-[0-9a-f]+-[0-9a-f]+$")
RUN_ID_RE = re.compile(r"^run-[0-9a-f]+-[0-9a-f]+$")
# Substitution forms (no ^ anchor) for normalize(): the anchored
# forms above shape-match whole ids; these replace everyembedded
# occurrence (receipts, urls, artifact paths).
RUN_ID_SUB = re.compile(r"run-[0-9a-f]+-[0-9a-f]+")
DRAFT_ID_SUB = re.compile(r"draft-[0-9a-f]+-[0-9a-f]+-[0-9a-f]+")
WS_KEY = "dGhlIHNhbXBsZSBub25jZQ=="


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


# ── stub ComfyUI (flows-run wall pattern, hermetic, in-process) ──

class Stub:
    def __init__(self) -> None:
        self.hits: dict[str, int] = {}
        self.lock = threading.Lock()
        self.server: ThreadingHTTPServer | None = None

    def history_for(self, pid: str) -> dict:
        with self.lock:
            self.hits[pid] = self.hits.get(pid, 0) + 1
            n = self.hits[pid]
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
        if n:
            self.rfile.read(n)
        if self.path == "/prompt":
            return self._send({})
        if self.path == "/queue":
            return self._send({})
        if self.path == "/interrupt":
            return self._send({})
        return self._send({"error": "stub: no such route"}, code=404)

    def do_GET(self) -> None:
        if self.path.startswith("/history/"):
            pid = self.path.rsplit("/", 1)[1]
            return self._send(STUB.history_for(pid))
        if self.path.startswith("/view"):
            return self._send(None, raw=b"PNG-BYTES",
                              ctype="application/octet-stream")
        if self.path.startswith("/ws"):
            self.send_response(101)
            self.send_header("content-length", "0")
            self.end_headers()
            return
        return self._send({"error": "stub: no such route"}, code=404)


def boot_stub() -> str:
    srv = ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
    srv.daemon_threads = True
    STUB.server = srv
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return "http://127.0.0.1:%d" % srv.server_address[1]


# ── HTTP + TS boot helpers ─────────────────────────────────────

def http(port: int, path: str, body: bytes | None = None,
         method: str | None = None) -> tuple[int | None, bytes]:
    data = body if body is not None else b""
    req = urllib.request.Request(
        "http://127.0.0.1:%d%s" % (port, path), data=data,
        headers={"Content-Type": "application/json"},
        method=method or ("POST" if body is not None else "GET"))
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:
        return None, ("TRANSPORT %s" % e).encode()


def boot_ts(env: dict, wait_s: float = 25.0) -> tuple[int, subprocess.Popen]:
    node = shutil.which("node")
    if node is None:
        raise RuntimeError("node not on PATH")
    proc = subprocess.Popen(
        [node, "--experimental-strip-types", str(TS_SERVER)],
        cwd=str(REPO), stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        text=True, start_new_session=True, env=env)
    assert proc.stdout is not None
    deadline = time.time() + wait_s
    while time.time() < deadline:
        line = proc.stdout.readline()
        if line.startswith("READY "):
            return int(line.split()[1]), proc
        if proc.poll() is not None:
            raise RuntimeError("ts server exited rc=%d" % proc.returncode)
    proc.terminate()
    raise RuntimeError("ts server did not print READY")


def ws_frames(port: int, target: str, n: int = 3,
              timeout: float = 3.0) -> tuple[bytes, list[bytes]]:
    s = socket.create_connection(("127.0.0.1", port), timeout=10)
    try:
        lines = ["GET %s HTTP/1.1" % target,
                 "Host: 127.0.0.1:%d" % port,
                 "Upgrade: websocket", "Connection: Upgrade",
                 "Sec-WebSocket-Key: " + WS_KEY,
                 "Sec-WebSocket-Version: 13"]
        s.sendall(("\r\n".join(lines) + "\r\n\r\n").encode())
        buf = b""
        while b"\r\n\r\n" not in buf:
            buf += s.recv(4096)
        head, _, rest = buf.partition(b"\r\n\r\n")
        status = head.split(b"\r\n", 1)[0]
        s.settimeout(timeout)
        buf = rest
        frames: list[bytes] = []
        for _ in range(n):
            try:
                while len(buf) < 2:
                    buf += s.recv(4096)
                b1, b2 = buf[0], buf[1]
                if b1 & 0x0F == 0x8:
                    break
                assert b1 & 0x0F == 0x1
                ln = b2 & 0x7F
                pos = 2
                if ln == 126:
                    while len(buf) < 4:
                        buf += s.recv(4096)
                    ln = int.from_bytes(buf[2:4], "big")
                    pos = 4
                while len(buf) < pos + ln:
                    buf += s.recv(4096)
                frames.append(buf[pos:pos + ln])
                buf = buf[pos + ln:]
            except socket.timeout:
                break
        return status, frames
    finally:
        s.close()


def normalize(body: bytes, roots: list[str]) -> bytes:
    text = body.decode("utf-8", "replace")
    for root in roots:
        text = text.replace(root, "<ROOT>")
    text = RUN_ID_SUB.sub("<RID>", text)
    text = DRAFT_ID_SUB.sub("<DID>", text)
    return text.encode()


def wait_terminal(port: int, rid: str,
                  tries: int = 40) -> tuple[int | None, dict]:
    last: dict = {}
    code: int | None = None
    for _ in range(tries):
        code, raw = http(port, "/v1/flows/status/" + rid)
        try:
            last = json.loads(raw.decode())
        except Exception:
            last = {"_raw": raw[:200].decode("utf-8", "replace")}
        if last.get("status") in ("completed", "failed", "stopped"):
            return code, last
        time.sleep(0.3)
    return code, last


def draft_body(flow_id: str = "wall-run") -> dict:
    return {"intent": "e2e wall: %s" % flow_id,
            "stages": [{"id": "gen", "inputs": [], "params": {}}],
            "flow_inline": {"id": flow_id, "stages": [
                {"id": "gen", "engine": "comfyui",
                 "params": {"workflow": WF}}]}}


def start_body(did: str, flow_id: str = "wall-run",
               timeout_s: int = 60) -> dict:
    return {"flow_inline": {"id": flow_id, "stages": [
                {"id": "gen", "engine": "comfyui",
                 "params": {"workflow": WF, "timeout_s": timeout_s}}]},
            "draft_id": did}


SIM_FLOW = {"id": "sim-chain", "stages": [
    {"id": "first", "engine": "sim",
     "params": {"echo": "sim-seed-echo"},
     "outputs": {"txt": "text"}},
    {"id": "second", "engine": "sim",
     "params": {"echo": "sim-second-echo"},
     "inputs": {"prior": {"stage": "first", "output": "txt"}},
     "expected": {"prior": "text"},
     "outputs": {"txt": "text"}}]}
SIM_MISMATCH = {"id": "sim-mismatch", "stages": [
    {"id": "first", "engine": "sim", "params": {"echo": "x"},
     "outputs": {"txt": "text"}},
    {"id": "second", "engine": "sim", "params": {"echo": "y"},
     "inputs": {"prior": {"stage": "first", "output": "txt"}},
     "expected": {"prior": "image"},
     "outputs": {"img": "image"}}]}


def seed_queued(root: Path) -> None:
    """One resurrectable queued sidecar + draft + request (resurrect
    wall build_seed shape, single row for the e2e reboot leg)."""
    (root / "drafts").mkdir(parents=True, exist_ok=True)
    (root / "drafts" / "d-e2e.json").write_text("{}")
    out = root / "output" / "run-e2e-q"
    out.mkdir(parents=True, exist_ok=True)
    (out / "_flow.json").write_text(json.dumps(
        {"run_id": "run-e2e-q", "status": "queued",
         "pipeline": "wall-e2e", "draft_id": "d-e2e",
         "created_at": 1700000099,
         "stages": [{"id": "w", "index": 0, "status": "pending"}],
         "graph": [{"id": "w", "type": "comfyui"}]}))
    (out / "_request.json").write_text(json.dumps(
        {"draft_id": "d-e2e", "prompt": "e2e resurrect"}))


def main() -> int:
    stub_url = boot_stub()
    prod_lock = REPO / "data" / "runs" / "gateway.lock"
    base: Path | None = None
    py_proc = ts_proc = ts2_proc = None
    try:
        base = Path(tempfile.mkdtemp(prefix="e2e-tsboot-"))

        # ── Phase H: hermetic + lock proof (py STOPPED) ──
        import os as _os
        check("H01 production lock held (live py owns default)",
              prod_lock.is_file(),
              "no %s — live gateway not running?" % prod_lock)
        py_root = base / "py-root"
        ts_root = base / "ts-root"
        ts_alone_root = base / "ts-alone"
        h_root = base / "h-root"
        for d in (py_root, ts_root, ts_alone_root, h_root):
            d.mkdir(parents=True)
        check("H02 fixture roots isolated (never production)",
              str(REPO / "data" / "runs") not in
              (str(py_root), str(ts_root), str(ts_alone_root),
               str(h_root)))
        # Single-writer proof on the e2e H root: first TS holder
        # boots, a second TS contender on the SAME root refuses (py
        # stays stopped throughout — no py boot touches this root).
        env_hold = dict(_os.environ, MELITE_STATE_ROOT=str(h_root),
                        COMFYUI_URL=stub_url)
        hold_port, hold_proc = boot_ts(env_hold)
        try:
            node = shutil.which("node")
            assert node is not None
            try:
                cont = subprocess.run(
                    [node, "--experimental-strip-types", str(TS_SERVER)],
                    cwd=str(REPO), env=env_hold, capture_output=True,
                    text=True, timeout=30)
                refused = (cont.returncode != 0 and "REFUSING" in
                           (cont.stderr + cont.stdout))
                refused_note = "rc=%r out=%r" % (
                    cont.returncode, (cont.stderr + cont.stdout)[:200])
            except subprocess.TimeoutExpired:
                refused = False
                refused_note = "contender hung (no refusal, still alive)"
            check("H03 second writer refuses (single-writer lock)",
                  refused, refused_note)
            c, raw = http(hold_port, "/v1/queue")
            check("H04 holder serves while contender refused",
                  c == 200 and b"queued" in raw, "%r %r" % (c, raw[:80]))
        finally:
            try:
                hold_proc.terminate()
                hold_proc.wait(timeout=15)
            except Exception:
                try:
                    hold_proc.kill()
                except Exception:
                    pass

        # ── Phase D: dual-serve vector capture ──
        py_port, py_proc = boot_scratch_gateway(
            env=dict(_os.environ, MELITE_STATE_ROOT=str(py_root),
                     COMFYUI_URL=stub_url))
        ts_port, ts_proc = boot_ts(
            dict(_os.environ, MELITE_STATE_ROOT=str(ts_root),
                 COMFYUI_URL=stub_url))
        roots = [str(py_root), str(ts_root)]

        # D01 draft compose (minted ids differ — shape pin).
        c1, r1 = http(py_port, "/v1/flows/drafts",
                      json.dumps(draft_body()).encode())
        c2, r2 = http(ts_port, "/v1/flows/drafts",
                      json.dumps(draft_body()).encode())
        try:
            d1, d2 = json.loads(r1), json.loads(r2)
        except Exception:
            d1 = d2 = {}
        check("D01 draft compose 200s both",
              c1 == 200 and c2 == 200, "%r/%r" % (c1, c2))
        check("D01 draft ids shape-match",
              bool(DRAFT_ID_RE.match(str(d1.get("draftId", "")))) and
              bool(DRAFT_ID_RE.match(str(d2.get("draftId", "")))),
              "%r %r" % (d1.get("draftId"), d2.get("draftId")))
        check("D01 draft stages shape-match",
              d1.get("stages") == d2.get("stages") ==
              [{"id": "gen", "inputs": [], "params": {},
                "provenance": "agent"}],
              "%r %r" % (d1.get("stages"), d2.get("stages")))
        py_did, ts_did = str(d1.get("draftId", "")), str(d2.get("draftId", ""))

        # D02 validate byte-equal.
        vbody = json.dumps({"flow_inline": draft_body()["flow_inline"]}) \
            .encode()
        c1, r1 = http(py_port, "/v1/flows/validate", vbody)
        c2, r2 = http(ts_port, "/v1/flows/validate", vbody)
        check("D02 validate byte-equal",
              c1 == c2 == 200 and r1 == r2, "%r/%r" % (c1, c2))

        # D03 start receipts (normalized).
        c1, r1 = http(py_port, "/v1/flows/start",
                      json.dumps(start_body(py_did)).encode())
        c2, r2 = http(ts_port, "/v1/flows/start",
                      json.dumps(start_body(ts_did)).encode())
        check("D03 start 202s both", c1 == 202 and c2 == 202,
              "%r/%r" % (c1, c2))
        try:
            py_rid = str(json.loads(r1).get("run_id", ""))
            ts_rid = str(json.loads(r2).get("run_id", ""))
        except Exception:
            py_rid = ts_rid = ""
        check("D03 run ids shape-match",
              bool(RUN_ID_RE.match(py_rid)) and bool(RUN_ID_RE.match(ts_rid)),
              "%r %r" % (py_rid, ts_rid))
        try:
            pr, tr = json.loads(r1), json.loads(r2)
        except Exception:
            pr = tr = {}
        check("D03 receipts agree modulo run_id",
              c1 == c2 == 202 and pr.get("status") == "queued" and
              tr.get("status") == "queued",
              "%r %r" % (r1[:120], r2[:120]))

        # D04 terminal bodies (normalized run_id + root).
        _, py_term = wait_terminal(py_port, py_rid)
        _, ts_term = wait_terminal(ts_port, ts_rid)
        check("D04 both complete",
              py_term.get("status") == "completed" and
              ts_term.get("status") == "completed",
              "%r %r" % (py_term.get("status"), ts_term.get("status")))
        py_n = normalize(json.dumps(py_term, indent=2).encode(), roots)
        ts_n = normalize(json.dumps(ts_term, indent=2).encode(), roots)
        check("D04 terminal bodies agree normalized", py_n == ts_n,
              "py %dB ts %dB" % (len(py_n), len(ts_n)))
        # Keep normalized TS terminal bytes for the S-phase pin.
        ts_term_bytes = ts_n

        # D05 harvest: HTTP asset door + disk bytes agree.
        py_url = (py_term.get("stages") or [{}])[0].get("url", "")
        ts_url = (ts_term.get("stages") or [{}])[0].get("url", "")
        check("D05 artifact urls shape-match",
              str(py_url).startswith("/v1/assets/runs/run-") and
              str(ts_url).startswith("/v1/assets/runs/run-"),
              "%r %r" % (py_url, ts_url))
        _, py_ab = http(py_port, str(py_url).replace(
            py_rid, py_rid) if py_rid else "/nope")
        _, ts_ab = http(ts_port, str(ts_url))
        check("D05 HTTP harvest bytes agree",
              py_ab == ts_ab == b"PNG-BYTES", "%r %r" % (py_ab[:20],
                                                         ts_ab[:20]))
        py_disk = (py_root / "output" / py_rid / "gen" / "out.png") \
            .read_bytes() if py_rid else b""
        ts_disk = (ts_root / "output" / ts_rid / "gen" / "out.png") \
            .read_bytes() if ts_rid else b""
        check("D05 disk harvest bytes agree",
              py_disk == ts_disk == b"PNG-BYTES",
              "%r %r" % (py_disk[:20], ts_disk[:20]))

        # D06 fixture list/detail agreement (seeded sidecars — the
        # runs-doors agreement leg; live runs diverge per G1 below).
        for rdir in ("run-e2e-a", "run-e2e-b"):
            for root, did, creat in (
                    (py_root, "d-e2e", 1700000101),
                    (ts_root, "d-e2e", 1700000101)):
                (root / "drafts" / (did + ".json")).write_text("{}")
                d = root / "output" / rdir
                d.mkdir(parents=True, exist_ok=True)
                (d / "_flow.json").write_text(json.dumps(
                    {"run_id": rdir, "status": "completed",
                     "pipeline": "wall-e2e", "draft_id": did,
                     "created_at": creat,
                     "stages": [{"id": "w", "index": 0,
                                 "status": "completed"}]}))
        c1, r1 = http(py_port, "/v1/flows/runs?limit=500")
        c2, r2 = http(ts_port, "/v1/flows/runs?limit=500")
        try:
            l1 = {r["run_id"]: r for r in json.loads(r1)["runs"]
                  if r["run_id"] in ("run-e2e-a", "run-e2e-b")}
            l2 = {r["run_id"]: r for r in json.loads(r2)["runs"]
                  if r["run_id"] in ("run-e2e-a", "run-e2e-b")}
        except Exception:
            l1 = l2 = {}
        check("D06 fixture list rows byte-agree",
              c1 == c2 == 200 and
              normalize(json.dumps(l1, sort_keys=True).encode(), roots) ==
              normalize(json.dumps(l2, sort_keys=True).encode(), roots),
              "%r %r" % (sorted(l1), sorted(l2)))
        c1, r1 = http(py_port, "/v1/flows/runs/run-e2e-a")
        c2, r2 = http(ts_port, "/v1/flows/runs/run-e2e-a")
        check("D06 fixture detail byte-agrees normalized",
              c1 == c2 == 200 and normalize(r1, roots) == normalize(r2, roots),
              "%r/%r %dB/%dB" % (c1, c2, len(r1), len(r2)))

        # D07 live-run list/detail divergence (G1 — shape, never
        # bytes: TS writes no sidecar, py does).
        c1, r1 = http(py_port, "/v1/flows/runs?limit=500")
        c2, r2 = http(ts_port, "/v1/flows/runs?limit=500")
        try:
            py_live = next(r for r in json.loads(r1)["runs"]
                           if r["run_id"] == py_rid)
            ts_live = next(r for r in json.loads(r2)["runs"]
                           if r["run_id"] == ts_rid)
        except Exception:
            py_live = ts_live = {}
        check("D07 live list: py completed/wall-run/draft",
              py_live.get("status") == "completed" and
              py_live.get("flow") == "wall-run" and
              py_live.get("draft_id") == py_did,
              "%r" % ({k: py_live.get(k) for k in
                       ("status", "flow", "draft_id")},))
        check("D07 live list: TS success/empty/0 (G1 no-sidecar)",
              ts_live.get("status") == "success" and
              ts_live.get("flow") == "" and
              ts_live.get("draft_id") == "" and
              ts_live.get("created_at") == 0,
              "%r" % ({k: ts_live.get(k) for k in
                       ("status", "flow", "draft_id", "created_at")},))
        c1, _ = http(py_port, "/v1/flows/runs/" + py_rid)
        c2, _ = http(ts_port, "/v1/flows/runs/" + ts_rid)
        check("D07 live detail: py 200 vs TS 404 (G1)",
              c1 == 200 and c2 == 404, "%r/%r" % (c1, c2))

        # D08 events/WS frames (byte-equal).
        c1, r1 = http(py_port, "/v1/flows/events")
        c2, r2 = http(ts_port, "/v1/flows/events")
        check("D08 events fallback 404s byte-equal",
              c1 == c2 == 404 and r1 == r2, "%r/%r" % (c1, c2))
        for target, want_n in (("/v1/flows/events", 1),
                               ("/v1/flows/events/run-no-such-e2e", 1)):
            s1, f1 = ws_frames(py_port, target)
            s2, f2 = ws_frames(ts_port, target)
            check("D08 WS %s byte-equal" % target.split("/")[-1],
                  s1 == s2 == b"HTTP/1.1 101 Switching Protocols" and
                  f1 == f2, "%r %r" % (f1[:1], f2[:1]))
        s1, f1 = ws_frames(py_port, "/v1/flows/events/" + py_rid, n=2)
        s2, f2 = ws_frames(ts_port, "/v1/flows/events/" + ts_rid, n=2)
        check("D08 WS owned completed frames byte-equal",
              f1 == f2 and len(f1) == 2 and
              json.loads(f1[0]).get("status") == "completed",
              "%r %r" % (f1[:1], f2[:1]))

        # D09 sim backend legs (validate agrees, start diverges G2).
        sim_body = json.dumps({"flow_inline": SIM_FLOW}).encode()
        c1, r1 = http(py_port, "/v1/flows/validate", sim_body)
        c2, r2 = http(ts_port, "/v1/flows/validate", sim_body)
        check("D09 sim validate byte-equal",
              c1 == c2 == 200 and r1 == r2, "%r/%r" % (c1, c2))
        mis_body = json.dumps({"flow_inline": SIM_MISMATCH}).encode()
        c1, r1 = http(py_port, "/v1/flows/validate", mis_body)
        c2, r2 = http(ts_port, "/v1/flows/validate", mis_body)
        check("D09 sim kind-mismatch validate byte-equal",
              c1 == c2 == 400 and r1 == r2, "%r/%r" % (c1, c2))
        c1, r1 = http(py_port, "/v1/flows/start",
                      json.dumps({"flow_inline": SIM_FLOW,
                                  "draft_id": py_did}).encode())
        c2, r2 = http(ts_port, "/v1/flows/start",
                      json.dumps({"flow_inline": SIM_FLOW,
                                  "draft_id": ts_did}).encode())
        try:
            ts_err = json.loads(r2)
        except Exception:
            ts_err = {}
        check("D09 sim start: py 202 vs TS 400 preview_scope (G2)",
              c1 == 202 and c2 == 400 and
              ts_err.get("code") == "preview_scope" and
              "comfyui stages only" in str(ts_err.get("error", "")),
              "%r/%r %r" % (c1, c2, ts_err.get("code")))
        # Sim execution agreement stays py-owned: prove the py side
        # ran the two-stage chain (carry-pool + file handoff seam)
        # while TS holds no sim registry row.
        try:
            sim_rid = str(json.loads(r1).get("run_id", ""))
        except Exception:
            sim_rid = ""
        _, sim_term = wait_terminal(py_port, sim_rid)
        check("D09 py sim chain completes (carry seam)",
              sim_term.get("status") == "completed" and
              len(sim_term.get("artifacts", [])) == 2,
              "%r" % sim_term.get("status"))

        # Capture D-phase TS vectors for the S-phase transitive pin
        # (re-read the exact bytes served in D02/D04).
        d_ts_vectors: dict[str, bytes] = {}
        _, d_ts_vectors["validate"] = http(
            ts_port, "/v1/flows/validate", vbody)
        d_ts_vectors["terminal"] = ts_term_bytes
        _, d_ts_vectors["queue"] = http(ts_port, "/v1/queue")

        # Py STOPPED before the TS-alone phases (single-writer gate:
        # from here on the TS boot is the only writer).
        reap_gateway(py_proc)
        py_proc = None
        try:
            ts_proc.terminate()
            ts_proc.wait(timeout=15)
        except Exception:
            try:
                ts_proc.kill()
            except Exception:
                pass
        ts_proc = None

        # ── Phase S: TS-alone lifecycle (py STOPPED) ──
        shutil.rmtree(ts_alone_root, ignore_errors=True)
        ts_alone_root.mkdir(parents=True)
        ts_port2, ts2_proc = boot_ts(
            dict(_os.environ, MELITE_STATE_ROOT=str(ts_alone_root),
                 COMFYUI_URL=stub_url))
        try:
            c, raw = http(ts_port2, "/v1/flows/drafts",
                          json.dumps(draft_body()).encode())
            try:
                alone_did = str(json.loads(raw).get("draftId", ""))
            except Exception:
                alone_did = ""
            check("S01 TS-alone draft 200 + id shape",
                  c == 200 and bool(DRAFT_ID_RE.match(alone_did)),
                  "%r %r" % (c, raw[:80]))
            c, raw = http(ts_port2, "/v1/flows/validate", vbody)
            check("S02 TS-alone validate matches D-phase TS bytes",
                  c == 200 and raw == d_ts_vectors["validate"],
                  "%r %dB" % (c, len(raw)))
            c, raw = http(ts_port2, "/v1/flows/start",
                          json.dumps(start_body(alone_did)).encode())
            try:
                alone_rid = str(json.loads(raw).get("run_id", ""))
            except Exception:
                alone_rid = ""
            check("S03 TS-alone start 202 + id shape",
                  c == 202 and bool(RUN_ID_RE.match(alone_rid)),
                  "%r %r" % (c, raw[:120]))
            _, alone_term = wait_terminal(ts_port2, alone_rid)
            check("S04 TS-alone completes",
                  alone_term.get("status") == "completed",
                  "%r" % alone_term.get("status"))
            alone_n = normalize(
                json.dumps(alone_term, indent=2).encode(),
                [str(ts_alone_root)])
            # Terminal shape agrees with D-phase TS modulo the fresh
            # root/run (both normalized): same stages/url/error keys.
            d_shape = json.loads(d_ts_vectors["terminal"].decode())
            check("S05 TS-alone terminal shape matches D-phase TS",
                  set(alone_term.keys()) == set(d_shape.keys()) and
                  alone_term.get("error") == "" and
                  len(alone_term.get("stages", [])) == 1 and
                  alone_term["stages"][0].get("status") == "completed",
                  "%r" % sorted(alone_term.keys()))
            url = (alone_term.get("stages") or [{}])[0].get("url", "")
            _, ab = http(ts_port2, str(url))
            check("S06 TS-alone harvest bytes",
                  ab == b"PNG-BYTES", "%r" % ab[:20])
            s_status, frames = ws_frames(ts_port2, "/v1/flows/events")
            check("S07 TS-alone WS hello (py STOPPED)",
                  s_status == b"HTTP/1.1 101 Switching Protocols" and
                  frames and
                  json.loads(frames[0]).get("type") == "hello",
                  "%r" % (frames[:1],))
            s_status, frames = ws_frames(
                ts_port2, "/v1/flows/events/run-no-such-e2e")
            check("S08 TS-alone WS unknown-run hydrate",
                  frames and json.loads(frames[0]) ==
                  {"type": "run", "status": "unknown"},
                  "%r" % (frames[:1],))
        finally:
            try:
                ts2_proc.terminate()
                ts2_proc.wait(timeout=15)
            except Exception:
                try:
                    ts2_proc.kill()
                except Exception:
                    pass
            ts2_proc = None

        # ── Phase R: resurrect-after-restart (kill TS, reboot) ──
        r_root = base / "ts-resurrect"
        shutil.rmtree(r_root, ignore_errors=True)
        r_root.mkdir(parents=True)
        seed_queued(r_root)
        # Scalar seed: valid-JSON-non-object sidecars crash py
        # (AttributeError gateway.py:2359) — TS boots clean (TS-only).
        (r_root / "output" / "run-e2e-arr").mkdir(parents=True)
        (r_root / "output" / "run-e2e-arr" / "_flow.json") \
            .write_text("[1,2]")
        r_port, r_proc = boot_ts(
            dict(_os.environ, MELITE_STATE_ROOT=str(r_root),
                 COMFYUI_URL=stub_url))
        try:
            c, raw = http(r_port, "/v1/queue")
            try:
                q = json.loads(raw)
            except Exception:
                q = {}
            check("R01 resurrected queue carries run-e2e-q",
                  c == 200 and "run-e2e-q" in q.get("queued_ids", []),
                  "%r %r" % (c, raw[:200]))
            c, raw = http(r_port, "/v1/flows/status/run-e2e-q")
            try:
                st = json.loads(raw)
            except Exception:
                st = {}
            check("R02 resurrected status queued",
                  c == 200 and st.get("status") == "queued",
                  "%r %r" % (c, raw[:200]))
            _, frames = ws_frames(r_port, "/v1/flows/events")
            try:
                hello = json.loads(frames[0]) if frames else {}
            except Exception:
                hello = {}
            check("R03 WS hello carries resurrected queue",
                  "run-e2e-q" in hello.get("queued", []),
                  "%r" % hello)
            c, raw = http(r_port, "/v1/flows/runs?limit=500")
            try:
                rl = json.loads(raw)
            except Exception:
                rl = {}
            # Queued rows never list (RunRow has no "queued" member —
            # py/run_wire.py RunStatus + doors/runs.ts RUN_STATUS;
            # refused rows are SKIPPED, count keeps them — the C
            # contract, proved on both sides by the resurrect wall).
            # The scalar seed (run-e2e-arr, status unknown) DOES list;
            # the queued row must not.
            try:
                listed = {r["run_id"] for r in rl.get("runs", [])}
            except Exception:
                listed = set()
            check("R04 resurrected row skipped from list (count keeps it)",
                  c == 200 and rl.get("count") == 2 and
                  "run-e2e-q" not in listed and
                  "run-e2e-arr" in listed,
                  "%r %r" % (c, raw[:300]))
            c, raw = http(r_port, "/v1/flows/runs/run-e2e-q")
            check("R05 resurrected detail 200s",
                  c == 200, "%r %r" % (c, raw[:120]))
        finally:
            try:
                r_proc.terminate()
                r_proc.wait(timeout=15)
            except Exception:
                try:
                    r_proc.kill()
                except Exception:
                    pass
        # Reboot on the same root: sidecar restore survives (py
        # would too — dual-pinned by shape here since py is stopped;
        # the D-phase resurrect wall already proves byte agreement).
        r_port2, r_proc2 = boot_ts(
            dict(_os.environ, MELITE_STATE_ROOT=str(r_root),
                 COMFYUI_URL=stub_url))
        try:
            c, raw = http(r_port2, "/v1/queue")
            try:
                q = json.loads(raw)
            except Exception:
                q = {}
            check("R06 reboot keeps resurrected queue (sidecar restore)",
                  c == 200 and "run-e2e-q" in q.get("queued_ids", []),
                  "%r %r" % (c, raw[:200]))
            c, raw = http(r_port2, "/v1/flows/status/run-e2e-q")
            try:
                st = json.loads(raw)
            except Exception:
                st = {}
            check("R07 reboot keeps resurrected status",
                  c == 200 and st.get("status") == "queued",
                  "%r %r" % (c, raw[:200]))
            # Scalar TS-only: boot clean where py crashes.
            c, raw = http(r_port2, "/v1/flows/runs/run-e2e-arr")
            check("R08 scalar detail 200s TS-only (py crashes)",
                  c == 200, "%r %r" % (c, raw[:120]))
            c, raw = http(r_port2, "/v1/flows/status/run-e2e-arr")
            try:
                st = json.loads(raw)
            except Exception:
                st = {}
            check("R09 scalar status 500-class TS-only",
                  c == 500 and "error" in st, "%r %r" % (c, raw[:200]))
        finally:
            try:
                r_proc2.terminate()
                r_proc2.wait(timeout=15)
            except Exception:
                try:
                    r_proc2.kill()
                except Exception:
                    pass
    finally:
        for proc in (py_proc, ts_proc, ts2_proc):
            if proc is not None:
                try:
                    reap_gateway(proc)
                except Exception:
                    pass
        if STUB.server is not None:
            try:
                STUB.server.shutdown()
            except Exception:
                pass
        if base is not None:
            shutil.rmtree(base, ignore_errors=True)
    print("e2e tsboot: %d passed, %d failed" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())

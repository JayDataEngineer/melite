#!/usr/bin/env python3
"""test_gateway_streaming_tsboot.py — P6 streaming battery flipped to the TS boot.

Ladder P6 (WS absolute last — battery C): the WS codec + upgrade
handler already landed (plugins/gateway/src/doors/runs.ts); this
stroke runs the FULL streaming battery against the TS boot ALONE
(py STOPPED throughout Phase T — TS is the writer).

Battery C legs (py cites — every vector below is captured live from
a py scratch gateway in Phase V, then py is REAPED before any TS
assertion runs):
  hello / hydrate / stage frames (gateway.py 2530-2553), reconnect
  === fresh subscribe + fresh hydrate — no cursor, no replay
  (runs.ts: "reconnect === fresh subscribe + fresh hydrate"),
  hold-silence / no-heartbeat (the door sends nothing unsolicited —
  the runs-parity wall's 1s hold window), terminal patches (terminal
  hydrate appends per-stage id+status+truthy-extras patches),
  ?token= auth (2189-2240: header Bearer OR ?token= on WS; pre-accept
  close becomes `403 Forbidden` empty at upgrade — probed raw
  2026-09-07), close-echo posture (client masked close -> server
  close echo, the _monitor_client/hold-loop posture).

Where the battery needs lifecycle events, they are driven through
the TS doors: POST /v1/flows/start on the stub ComfyUI -> live
stage frames -> terminal (the flows-run wall's stub shape, minimal
subset: /prompt, /history/<id>, /view, /queue, /interrupt).

Method:
  Phase V — stub + py scratch boot (own MELITE_STATE_ROOT, no
    token): capture the byte vectors over a RAW socket (handshake +
    RFC 6455 client parser — the accept-key pins live-server
    conformance, battery-C discipline): hello, unknown-run hydrate
    (path + query forms), the LIVE sequence of one stub run
    (hydrate + stage frames + terminal run frame + close), the
    terminal-hydrate pair (run frame + stage patch, then hold),
    close-echo bytes, pong bytes. Then a second py boot WITH the
    token captures the auth matrix (403-empty no-token/wrong-token,
    ?token= hello, header hello). Py is then REAPED (py stopped).
  Phase T — TS server.ts boot alone (own MELITE_STATE_ROOT, same
    stub COMFYUI_URL, py stopped): every leg re-runs against the TS
    boot; frame bytes must equal the py-captured vectors.
  Phase U — codec units (no server): a node harness imports
    doors/runs.ts directly and re-derives hello/run/stage-patch
    bytes, the truthy-extras omission rule, the RFC accept key, and
    the server frame encodings.

Legs (name — assertion):
  U1-U4 codec bytes (hello / unknown-run / terminal-run / stage
    patch vs py socket vectors)
  U5  patch omissions (falsy progress/activity omitted — py `if
    st.get(...)` 2548-2551, NOT merely-present)
  U6  accept key == RFC 6455 section 1.3 vector
  U7  server text-frame headers (short + 16-bit forms)
  U8  close-frame bytes (1000)
  H1  upgrade answers 101 + correct accept key (RFC example key)
  H2  bare-door hello bytes == vector, then hold-silence (no 2nd
    frame in 1s — no heartbeat)
  H3  unknown-run hydrate, path form, bytes == vector + silence
  H4  unknown-run hydrate, query form, bytes == vector + silence
  H5  reconnect === fresh (hello + unknown twice, byte-identical)
  H6  terminal hydrate: stub start -> terminal -> connect -> run
    frame + stage patch bytes == vectors, then hold (NO close —
    py holds here too: the close rides the LIVE terminal event,
    2573-2577, never the hydrate)
  L1  LIVE stage frames: start -> immediate connect -> a stage
    frame arrives (py vector shapes)
  L2  LIVE terminal: the terminal run frame arrives and the socket
    closes (battery C: "terminal run frame closes the socket")
  A1  token ON, no token anywhere -> 403 + empty body
  A2  token ON, wrong bearer -> 403 + empty body
  A3  token ON, ?token= -> hello bytes == vector
  A4  token ON, header bearer -> hello bytes == vector
  C1  close-echo: masked client close -> server close bytes ==
    vector, then EOF
  C2  text ignored: masked text -> silence (the monitor posture —
    only the disconnect matters)
  C3  ping -> pong bytes == vector
  F1  non-upgrade GET == py fallback bytes (404 invalid_request —
    never no_such_route, py 3005-3008 + R4.2)

No goldens: every byte assertion compares TS bytes against vectors
captured from the live py gateway seconds earlier in the same run
(or the RFC's own vectors for the handshake codec).

Run: python3 tests/walls/suites/test_gateway_streaming_tsboot.py
"""

import base64
import hashlib
import json
import os
import shutil
import socket
import struct
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
DID = "wall-stream-draft-1"
TOKEN = "wall-stream-token-%d" % os.getpid()
TS_SERVER = REPO / "plugins" / "gateway" / "src" / "server.ts"
RUNS_TS = REPO / "plugins" / "gateway" / "src" / "doors" / "runs.ts"
WF = {"1": {"class_type": "EmptyLatentImage",
            "inputs": {"width": 64, "height": 64, "batch_size": 1}}}
HISTORY_OK = {"status": {"status_str": "success", "completed": True},
              "outputs": {"gen::save": {
                  "images": [{"filename": "out.png", "subfolder": "",
                              "type": "output"}]}}}

VEC: dict[str, bytes] = {}   # py-captured vectors (Phase V)
VEC_META: dict[str, str] = {}


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


# ── the stub ComfyUI (flows-run wall shape, minimal subset) ───────

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
        if self.path in ("/queue", "/interrupt"):
            return self._send({})
        return self._send({"error": "stub: no such route"}, code=404)

    def do_GET(self) -> None:
        if self.path.startswith("/history/"):
            pid = self.path.rsplit("/", 1)[1]
            return self._send(STUB.history_for(pid))
        if self.path.startswith("/view"):
            return self._send(None, raw=b"PNG-BYTES",
                              ctype="application/octet-stream")
        return self._send({"error": "stub: no such route"}, code=404)


def boot_stub() -> str:
    srv = ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
    srv.daemon_threads = True
    STUB.server = srv
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return "http://127.0.0.1:%d" % srv.server_address[1]


# ── raw HTTP + WS primitives (battery-C discipline: raw socket) ───

WS_KEY = "dGhlIHNhbXBsZSBub25jZQ=="  # RFC 6455 example key
WS_ACCEPT_WANT = "s3pPLMBiTxaQ9kYGzzhZRbK+xOo="


def http(port: int, path: str, body: bytes | None = None,
         method: str | None = None,
         headers: dict | None = None) -> tuple[int | None, bytes]:
    req = urllib.request.Request(
        "http://127.0.0.1:%d%s" % (port, path),
        data=body,
        method=method or ("POST" if body is not None else "GET"),
        headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:
        return None, ("TRANSPORT " + str(e)).encode()


def ws_handshake(port: int, target: str,
                 headers: dict | None = None
                 ) -> tuple[socket.socket, bytes, dict, bytes]:
    """Raw upgrade; returns (socket, status line, headers, leftover)."""
    s = socket.create_connection(("127.0.0.1", port), timeout=10)
    lines = ["GET %s HTTP/1.1" % target, "Host: 127.0.0.1:%d" % port,
             "Upgrade: websocket", "Connection: Upgrade",
             "Sec-WebSocket-Key: " + WS_KEY, "Sec-WebSocket-Version: 13"]
    for k, v in (headers or {}).items():
        lines.append("%s: %s" % (k, v))
    s.sendall(("\r\n".join(lines) + "\r\n\r\n").encode())
    buf = b""
    while b"\r\n\r\n" not in buf:
        chunk = s.recv(4096)
        if not chunk:
            break
        buf += chunk
    head, _, rest = buf.partition(b"\r\n\r\n")
    rows = head.split(b"\r\n")
    status = rows[0] if rows else b""
    hdrs: dict = {}
    for row in rows[1:]:
        k, _, v = row.partition(b":")
        hdrs[k.strip().lower()] = v.strip()
    return s, status, hdrs, rest


def ws_read_any(s: socket.socket, rest: bytes,
                timeout: float = 10.0
                ) -> tuple[int, bytes, bytes]:
    """Read ONE server frame; returns (opcode, payload, leftover).
    Raises socket.timeout on silence, ConnectionError on EOF,
    AssertionError on masked."""
    s.settimeout(timeout)
    buf = rest

    def _more(n: int) -> None:
        nonlocal buf
        while len(buf) < n:
            chunk = s.recv(4096)
            if not chunk:
                raise ConnectionError("server closed (EOF)")
            buf += chunk

    _more(2)
    b1, b2 = buf[0], buf[1]
    if b2 & 0x80:
        raise AssertionError("server frame masked")
    ln = b2 & 0x7F
    pos = 2
    if ln == 126:
        _more(4)
        ln = struct.unpack(">H", buf[2:4])[0]
        pos = 4
    elif ln == 127:
        _more(10)
        ln = struct.unpack(">Q", buf[2:10])[0]
        pos = 10
    _more(pos + ln)
    return b1 & 0x0F, bytes(buf[pos:pos + ln]), buf[pos + ln:]


def ws_send_masked(s: socket.socket, opcode: int, payload: bytes) -> None:
    mask = b"\x11\x22\x33\x44"
    n = len(payload)
    hdr = bytes([0x80 | opcode])
    if n < 126:
        hdr += bytes([0x80 | n])
    elif n < 65536:
        hdr += bytes([0x80 | 126]) + struct.pack(">H", n)
    else:
        hdr += bytes([0x80 | 127]) + struct.pack(">Q", n)
    enc = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
    s.sendall(hdr + mask + enc)


def ws_close(s: socket.socket) -> None:
    try:
        ws_send_masked(s, 0x8, b"")
    except OSError:
        pass
    try:
        s.close()
    except OSError:
        pass


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


def scrub_env(base: dict, stub_url: str, root: Path,
              token: str | None) -> dict:
    env = dict(base)
    env["MELITE_STATE_ROOT"] = str(root)
    env["COMFYUI_URL"] = stub_url
    env.pop("DSH_GATEWAY_TOKEN", None)
    env.pop("GATEWAY_PORT", None)
    if token is not None:
        env["DSH_GATEWAY_TOKEN"] = token
    return env


def start_body() -> bytes:
    return json.dumps({
        "flow_inline": {"id": "wall-run", "stages": [
            {"id": "gen", "engine": "comfyui",
             "params": {"workflow": WF, "timeout_s": 60}}]},
        "draft_id": DID}).encode()


def wait_status(port: int, run_id: str, deadline: float = 60.0
                ) -> tuple[int | None, dict]:
    end = time.time() + deadline
    last: tuple[int | None, dict] = (None, {})
    while time.time() < end:
        st, raw = http(port, "/v1/flows/status/" + run_id)
        try:
            doc = json.loads(raw.decode() or "{}")
        except ValueError:
            doc = {}
        last = (st, doc if isinstance(doc, dict) else {})
        if st == 200 and last[1].get("status") in (
                "completed", "failed", "stopped"):
            return last
        time.sleep(0.2)
    return last


def collect_until_close(port: int, target: str, timeout: float = 20.0,
                        headers: dict | None = None
                        ) -> tuple[bytes, list[tuple[int, bytes]], bool]:
    """Connect, read data frames until the server closes or timeout.
    Returns (status, [(opcode, payload)], saw_close)."""
    s, status, _, rest = ws_handshake(port, target, headers)
    frames: list[tuple[int, bytes]] = []
    saw_close = False
    end = time.time() + timeout
    try:
        while time.time() < end:
            try:
                op, pay, rest = ws_read_any(s, rest, timeout=1.0)
            except socket.timeout:
                continue
            except ConnectionError:
                saw_close = True  # EOF: the server went away
                break
            if op == 0x8:
                saw_close = True
                frames.append((op, pay))
                break
            if op == 0x1:
                frames.append((op, pay))
                try:
                    doc = json.loads(pay.decode())
                except ValueError:
                    doc = {}
                if (isinstance(doc, dict) and doc.get("type") == "run"
                        and doc.get("status") in (
                            "completed", "failed", "stopped", "unknown")):
                    # terminal hydrate holds (no close rides the
                    # hydrate) — keep reading briefly to prove the
                    # posture, then stop.
                    try:
                        op2, pay2, rest = ws_read_any(s, rest, timeout=2.0)
                        frames.append((op2, pay2))
                        if op2 == 0x8:
                            saw_close = True
                    except socket.timeout:
                        pass
                    except ConnectionError:
                        saw_close = True
                    break
    finally:
        ws_close(s)
    return status, frames, saw_close


# ── the node codec harness (drives doors/runs.ts in-process) ─────

HARNESS = """\
import { helloFrame, runFrame, stageHydratePatch, wsAccept,
  wsEncodeClose, wsEncodeText, wsFrameBytes } from %s;
const op = process.argv[2] ?? "";
const hex = (u) => Buffer.from(u).toString("hex");
let out = null;
if (op === "hello") out = wsFrameBytes(helloFrame(0, [], null));
else if (op === "unknown") out = wsFrameBytes(runFrame("unknown"));
else if (op === "terminal-run") out = wsFrameBytes(runFrame("completed"));
else if (op === "patch-full") out = wsFrameBytes(stageHydratePatch(
  { id: "gen", status: "completed",
    progress: { value: 10, max: 10 }, activity: "sampling 10/10" }));
else if (op === "patch-bare") out = wsFrameBytes(stageHydratePatch(
  { id: "gen", status: "completed" }));
else if (op === "patch-falsy") out = wsFrameBytes(stageHydratePatch(
  { id: "gen", status: "completed", progress: {}, activity: "" }));
else if (op === "patch-zero") out = wsFrameBytes(stageHydratePatch(
  { id: "gen", status: "running", progress: 0 }));
else if (op === "accept") out = wsAccept("dGhlIHNhbXBsZSBub25jZQ==");
else if (op === "enc-short") out = hex(wsEncodeText(Buffer.from("Hi", "utf8")));
else if (op === "enc-16bit") out = hex(wsEncodeText(Buffer.alloc(300, 0x41)));
else if (op === "close") out = hex(wsEncodeClose(1000));
else throw new Error("unknown op " + op);
console.log(out);
"""


def node_codec(op: str) -> str:
    path = Path(tempfile.gettempdir()) / ("wall-stream-codec-%d.mts" % os.getpid())
    if not path.is_file():
        path.write_text(HARNESS % json.dumps(RUNS_TS.as_uri()))
    proc = subprocess.run(
        [shutil.which("node") or "node", "--experimental-strip-types",
         "--no-warnings", str(path), op],
        cwd=str(REPO), capture_output=True, text=True, timeout=60)
    line = (proc.stdout or "").strip().splitlines()
    if not line:
        raise RuntimeError("codec harness no output rc=%d %s"
                           % (proc.returncode, (proc.stderr or "")[-300:]))
    return line[-1]


def main() -> int:
    stub_url = boot_stub()
    py_root = Path(tempfile.mkdtemp(prefix="wall-stream-py-"))
    ts_root = Path(tempfile.mkdtemp(prefix="wall-stream-ts-"))
    py_proc = ts_proc = None
    try:
        for root in (py_root, ts_root):
            (root / "drafts").mkdir(parents=True)
            (root / "drafts" / (DID + ".json")).write_text(
                json.dumps({"draft_id": DID}))

        # ══════════════════════════════════════════════════════
        # Phase V — capture the py vectors (py is then REAPED)
        # ══════════════════════════════════════════════════════
        py_port, py_proc = boot_scratch_gateway(env=scrub_env(
            os.environ, stub_url, py_root, None))

        s, status, hdrs, rest = ws_handshake(py_port, "/v1/flows/events")
        assert status == b"HTTP/1.1 101 Switching Protocols", status
        op, pay, rest = ws_read_any(s, rest)
        assert op == 0x1
        VEC["hello"] = pay
        try:
            ws_read_any(s, rest, timeout=1.0)
            raise SystemExit("py sent a 2nd hello frame (heartbeat?)")
        except socket.timeout:
            pass
        except ConnectionError:
            raise SystemExit("py closed after hello (hold expected)")
        ws_close(s)

        s, status, _, rest = ws_handshake(py_port, "/v1/flows/events/run-ghost")
        op, pay, rest = ws_read_any(s, rest)
        VEC["unknown-path"] = pay
        ws_close(s)
        s, status, _, rest = ws_handshake(
            py_port, "/v1/flows/events?run_id=run-ghost")
        op, pay, rest = ws_read_any(s, rest)
        VEC["unknown-query"] = pay
        ws_close(s)

        # non-upgrade fallback bytes (HTTP GET on the WS path)
        st, raw = http(py_port, "/v1/flows/events/run-ghost")
        VEC["fallback-status"] = str(st).encode()
        VEC["fallback"] = raw

        # close-echo + pong vectors
        s, status, _, rest = ws_handshake(py_port, "/v1/flows/events/run-ghost")
        op, pay, rest = ws_read_any(s, rest)
        ws_send_masked(s, 0x9, b"ping-1")
        op, pay, rest = ws_read_any(s, rest)
        assert op == 0xA, "py did not pong: %r" % op
        VEC["pong"] = b"\x8a" + bytes([len(pay)]) + pay
        # NOTE: raw pong bytes are re-framed here (opcode+len+payload)
        # because ws_read_any strips framing — the vector is the
        # re-framed wire bytes per RFC 6455 section 5.2.
        ws_send_masked(s, 0x8, b"")
        op, pay, rest = ws_read_any(s, rest)
        assert op == 0x8, "py did not echo close: %r" % op
        VEC["close-echo"] = b"\x88" + bytes([len(pay)]) + pay
        s.close()

        # the LIVE sequence on py: start on the stub, connect at
        # once, read to the terminal close.
        st, raw = http(py_port, "/v1/flows/start", start_body())
        assert st == 202, raw[:200]
        py_run = json.loads(raw.decode())["run_id"]
        status, frames, saw_close = collect_until_close(
            py_port, "/v1/flows/events/" + py_run, timeout=25.0)
        VEC_META["live-frames"] = json.dumps(
            [(op, p.decode("utf8", "replace")[:200]) for op, p in frames])
        live_data = [p for op, p in frames if op == 0x1]
        assert live_data, "py sent no data frames: %s" % VEC_META["live-frames"]
        VEC["live-hydrate"] = live_data[0]
        stage_vecs = [p for p in live_data[1:]
                      if json.loads(p.decode()).get("type") == "stage"]
        assert stage_vecs, "py sent no live stage frames: %s" \
            % VEC_META["live-frames"]
        VEC["live-stage"] = stage_vecs[0]
        term_vecs = [p for p in live_data
                     if json.loads(p.decode()).get("type") == "run"
                     and json.loads(p.decode()).get("status")
                     in ("completed", "failed", "stopped")]
        assert term_vecs, "py sent no terminal run frame: %s" \
            % VEC_META["live-frames"]
        VEC["live-terminal"] = term_vecs[-1]
        VEC_META["live-closed"] = str(saw_close)
        assert saw_close, "py did not close after terminal: %s" \
            % VEC_META["live-frames"]

        # terminal hydrate (connect AFTER terminal): run frame +
        # stage patches, then HOLD (no close rides the hydrate).
        st, term_doc = wait_status(py_port, py_run)
        assert st == 200 and term_doc.get("status") == "completed", \
            (st, str(term_doc)[:200])
        status, frames, saw_close = collect_until_close(
            py_port, "/v1/flows/events/" + py_run, timeout=10.0)
        hyd_data = [p for op, p in frames if op == 0x1]
        assert len(hyd_data) >= 2, hyd_data
        VEC["terminal-run"] = hyd_data[0]
        VEC["terminal-patch"] = hyd_data[1]
        assert not saw_close, "py closed after terminal hydrate (hold expected)"
        print("vectors captured: %s (live-closed=%s)"
              % (sorted(VEC), VEC_META["live-closed"]))

        # auth matrix vectors (second py boot, token ON)
        reap_gateway(py_proc)
        py_proc = None
        py_port, py_proc = boot_scratch_gateway(env=scrub_env(
            os.environ, stub_url, py_root, TOKEN))
        s, status, _, rest = ws_handshake(py_port, "/v1/flows/events")
        body = rest
        s.settimeout(2.0)
        try:
            while True:
                chunk = s.recv(4096)
                if not chunk:
                    break
                body += chunk
        except socket.timeout:
            pass
        s.close()
        VEC["deny-status"] = status
        VEC["deny-body"] = body
        s, status, _, rest = ws_handshake(
            py_port, "/v1/flows/events?token=" + TOKEN)
        assert status == b"HTTP/1.1 101 Switching Protocols", status
        op, pay, rest = ws_read_any(s, rest)
        VEC["hello-token"] = pay
        ws_close(s)
        s, status, _, rest = ws_handshake(
            py_port, "/v1/flows/events",
            {"Authorization": "Bearer " + TOKEN})
        op, pay, rest = ws_read_any(s, rest)
        VEC["hello-header"] = pay
        ws_close(s)
        # py STOPPED from here on — the battery runs TS-alone.
        reap_gateway(py_proc)
        py_proc = None
        time.sleep(0.5)

        # ══════════════════════════════════════════════════════
        # Phase U — codec units (no server)
        # ══════════════════════════════════════════════════════
        check("U1 hello bytes", node_codec("hello").encode() == VEC["hello"],
              "%r" % node_codec("hello").encode()[:80])
        check("U2 unknown bytes",
              node_codec("unknown").encode() == VEC["unknown-path"]
              == VEC["unknown-query"],
              "path=%r query=%r" % (VEC["unknown-path"][:60],
                                    VEC["unknown-query"][:60]))
        check("U3 terminal-run bytes",
              node_codec("terminal-run").encode() == VEC["terminal-run"],
              "%r vs %r" % (node_codec("terminal-run")[:80],
                             VEC["terminal-run"][:80]))
        check("U4 stage-patch bytes",
              node_codec("patch-bare").encode() == VEC["terminal-patch"],
              "%r vs %r" % (node_codec("patch-bare")[:120],
                             VEC["terminal-patch"][:120]))
        full = node_codec("patch-full")
        falsy = node_codec("patch-falsy")
        zero = node_codec("patch-zero")
        check("U5a truthy extras ride",
              json.loads(full) == {"type": "stage", "stage": "gen",
                                   "status": "completed",
                                   "progress": {"value": 10, "max": 10},
                                   "activity": "sampling 10/10"}, full[:160])
        check("U5b falsy extras omitted",
              json.loads(falsy) == {"type": "stage", "stage": "gen",
                                    "status": "completed"}, falsy[:160])
        check("U5c zero progress omitted",
              json.loads(zero) == {"type": "stage", "stage": "gen",
                                   "status": "running"}, zero[:160])
        check("U6 accept key", node_codec("accept") == WS_ACCEPT_WANT,
              node_codec("accept"))
        check("U7a short text frame", node_codec("enc-short") == "81024869",
              node_codec("enc-short"))
        enc16 = node_codec("enc-16bit")
        check("U7b 16-bit text frame",
              enc16 == "817e012c" + "41" * 300, enc16[:32])
        check("U8 close frame", node_codec("close") == "880203e8",
              node_codec("close"))

        # ══════════════════════════════════════════════════════
        # Phase T — the battery vs the TS boot alone (py stopped)
        # ══════════════════════════════════════════════════════
        ts_port, ts_proc = boot_ts(scrub_env(
            os.environ, stub_url, ts_root, None))

        def ts_ws(target: str, headers: dict | None = None,
                  ) -> tuple[socket.socket, bytes, dict, bytes]:
            return ws_handshake(ts_port, target, headers)

        # H1: 101 + accept key
        s, status, hdrs, rest = ts_ws("/v1/flows/events")
        want_accept = base64.b64encode(hashlib.sha1(
            (WS_KEY + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()
        ).digest())
        check("H1 101 + accept",
              status == b"HTTP/1.1 101 Switching Protocols"
              and hdrs.get(b"sec-websocket-accept") == want_accept,
              "%r %r" % (status, hdrs.get(b"sec-websocket-accept")))
        op, pay, rest = ws_read_any(s, rest)
        check("H2 hello bytes", op == 0x1 and pay == VEC["hello"],
              pay[:120])
        try:
            ws_read_any(s, b"", timeout=1.0)
            check("H2 hold-silence", False, "2nd frame arrived")
        except socket.timeout:
            check("H2 hold-silence", True)
        except ConnectionError:
            check("H2 hold-silence", False, "server closed the hold")
        ws_close(s)

        s, status, _, rest = ts_ws("/v1/flows/events/run-ghost")
        op, pay, rest = ws_read_any(s, rest)
        check("H3 unknown path bytes",
              op == 0x1 and pay == VEC["unknown-path"], pay[:120])
        try:
            ws_read_any(s, b"", timeout=1.0)
            check("H3 hold-silence", False, "2nd frame arrived")
        except socket.timeout:
            check("H3 hold-silence", True)
        except ConnectionError:
            check("H3 hold-silence", False, "server closed the hold")
        ws_close(s)

        s, status, _, rest = ts_ws("/v1/flows/events?run_id=run-ghost")
        op, pay, rest = ws_read_any(s, rest)
        check("H4 unknown query bytes",
              op == 0x1 and pay == VEC["unknown-query"], pay[:120])
        ws_close(s)

        # H5: reconnect === fresh
        s, status, _, rest = ts_ws("/v1/flows/events")
        op, pay1, _ = ws_read_any(s, rest)
        ws_close(s)
        time.sleep(0.2)
        s, status, _, rest = ts_ws("/v1/flows/events")
        op, pay2, _ = ws_read_any(s, rest)
        ws_close(s)
        check("H5a reconnect hello identical",
              pay1 == pay2 == VEC["hello"], "%r/%r" % (pay1[:60], pay2[:60]))
        s, status, _, rest = ts_ws("/v1/flows/events/run-ghost")
        op, pay1, _ = ws_read_any(s, rest)
        ws_close(s)
        time.sleep(0.2)
        s, status, _, rest = ts_ws("/v1/flows/events/run-ghost")
        op, pay2, _ = ws_read_any(s, rest)
        ws_close(s)
        check("H5b reconnect unknown identical",
              pay1 == pay2 == VEC["unknown-path"],
              "%r/%r" % (pay1[:60], pay2[:60]))

        # F1: non-upgrade fallback bytes
        st, raw = http(ts_port, "/v1/flows/events/run-ghost")
        check("F1 fallback bytes",
              str(st).encode() == VEC["fallback-status"] and raw == VEC["fallback"],
              "status=%r body=%r" % (st, raw[:120]))

        # C1/C2/C3: close-echo / text-ignored / ping-pong
        s, status, _, rest = ts_ws("/v1/flows/events/run-ghost")
        op, pay, rest = ws_read_any(s, rest)
        ws_send_masked(s, 0x9, b"ping-1")
        op, pay, rest = ws_read_any(s, rest, timeout=3.0)
        pong_wire = b"\x8a" + bytes([len(pay)]) + pay if op == 0xA else b""
        check("C3 pong bytes", op == 0xA and pong_wire == VEC["pong"],
              "op=%r pay=%r" % (op, pay[:40]))
        ws_send_masked(s, 0x1, b"client-text-ignored")
        try:
            ws_read_any(s, b"", timeout=1.0)
            check("C2 text ignored", False, "frame arrived for text")
        except socket.timeout:
            check("C2 text ignored", True)
        except ConnectionError:
            check("C2 text ignored", False, "server closed on text")
        ws_send_masked(s, 0x8, b"")
        try:
            op, pay, rest = ws_read_any(s, b"", timeout=3.0)
            wire = b"\x88" + bytes([len(pay)]) + pay if op == 0x8 else b""
            check("C1 close-echo bytes",
                  op == 0x8 and wire == VEC["close-echo"],
                  "op=%r pay=%r" % (op, pay[:40]))
        except socket.timeout:
            check("C1 close-echo bytes", False, "no close echo")
        except ConnectionError:
            check("C1 close-echo bytes", False, "EOF without close echo")
        s.close()

        # H6: lifecycle through the TS doors, then terminal hydrate
        st, raw = http(ts_port, "/v1/flows/start", start_body())
        check("H6 start 202", st == 202, raw[:160])
        ts_run = json.loads(raw.decode())["run_id"]
        st, term_doc = wait_status(ts_port, ts_run)
        check("H6 terminal reached",
              st == 200 and term_doc.get("status") == "completed",
              "%r %s" % (st, str(term_doc)[:160]))
        check("H6 status parity",
              term_doc.get("status") == "completed",
              "%r (py was completed)" % term_doc.get("status"))
        s, status, _, rest = ts_ws("/v1/flows/events/" + ts_run)
        check("H6 upgrade 101",
              status == b"HTTP/1.1 101 Switching Protocols", status)
        op, pay, rest = ws_read_any(s, rest)
        check("H6a terminal run bytes",
              op == 0x1 and pay == VEC["terminal-run"], pay[:120])
        op, pay, rest = ws_read_any(s, rest)
        check("H6b terminal patch bytes",
              op == 0x1 and pay == VEC["terminal-patch"], pay[:160])
        try:
            ws_read_any(s, b"", timeout=1.0)
            check("H6c hydrate holds", False, "socket closed after hydrate")
        except socket.timeout:
            check("H6c hydrate holds", True)
        except ConnectionError:
            check("H6c hydrate holds", False, "server closed after hydrate")
        ws_close(s)

        # L1/L2: the LIVE battery — start, connect at once, expect
        # stage frames then the terminal run frame + close.
        st, raw = http(ts_port, "/v1/flows/start", start_body())
        ts_live = json.loads(raw.decode())["run_id"] if st == 202 else ""
        check("L0 live start 202", st == 202, raw[:160])
        status, frames, saw_close = collect_until_close(
            ts_port, "/v1/flows/events/" + ts_live, timeout=15.0)
        live_data = [p for op, p in frames if op == 0x1]
        live_stages = []
        for p in live_data:
            try:
                doc = json.loads(p.decode())
            except ValueError:
                continue
            if isinstance(doc, dict) and doc.get("type") == "stage":
                live_stages.append(p)
        check("L1 live stage frame arrives", len(live_stages) > 0,
              "hydrate=%r stages=%d py-stage-vector=%r" % (
                  live_data[0][:120] if live_data else b"",
                  len(live_stages), VEC["live-stage"][:120]))
        live_terms = [p for p in live_data
                      if json.loads(p.decode()).get("type") == "run"
                      and json.loads(p.decode()).get("status")
                      in ("completed", "failed", "stopped")]
        check("L2a live terminal frame arrives", len(live_terms) > 0,
              "frames=%d py-terminal-vector=%r saw_close=%s" % (
                  len(live_data), VEC["live-terminal"][:120], saw_close))
        check("L2b socket closes after terminal", saw_close,
              "socket held (py closed: %s)" % VEC_META.get("live-closed"))

        # ══════════════════════════════════════════════════════
        # Phase T-auth — TS boot WITH the token (py still stopped)
        # ══════════════════════════════════════════════════════
        reap_gateway(ts_proc)
        ts_proc = None
        time.sleep(0.5)
        ts_port, ts_proc = boot_ts(scrub_env(
            os.environ, stub_url, ts_root, TOKEN))

        s, status, _, rest = ts_ws("/v1/flows/events")
        body = rest
        s.settimeout(2.0)
        try:
            while True:
                chunk = s.recv(4096)
                if not chunk:
                    break
                body += chunk
        except socket.timeout:
            pass
        s.close()
        check("A1 deny 403-empty",
              status == VEC["deny-status"] == b"HTTP/1.1 403 Forbidden"
              and body == VEC["deny-body"] == b"",
              "%r body=%dB" % (status, len(body)))

        s, status, _, rest = ts_ws(
            "/v1/flows/events", {"Authorization": "Bearer wrong"})
        body = rest
        s.settimeout(2.0)
        try:
            while True:
                chunk = s.recv(4096)
                if not chunk:
                    break
                body += chunk
        except socket.timeout:
            pass
        s.close()
        check("A2 wrong bearer 403-empty",
              status == b"HTTP/1.1 403 Forbidden" and body == b"",
              "%r body=%dB" % (status, len(body)))

        s, status, _, rest = ts_ws("/v1/flows/events?token=" + TOKEN)
        check("A3 ?token= upgrades",
              status == b"HTTP/1.1 101 Switching Protocols", status)
        op, pay, rest = ws_read_any(s, rest)
        check("A3 ?token= hello bytes",
              op == 0x1 and pay == VEC["hello-token"] == VEC["hello"],
              pay[:120])
        ws_close(s)

        s, status, _, rest = ts_ws("/v1/flows/events",
                                   {"Authorization": "Bearer " + TOKEN})
        op, pay, rest = ws_read_any(s, rest)
        check("A4 header hello bytes",
              op == 0x1 and pay == VEC["hello-header"] == VEC["hello"],
              pay[:120])
        ws_close(s)
    finally:
        for proc in (py_proc, ts_proc):
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
        shutil.rmtree(py_root, ignore_errors=True)
        shutil.rmtree(ts_root, ignore_errors=True)
    print("streaming tsboot: %d passed, %d failed" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())

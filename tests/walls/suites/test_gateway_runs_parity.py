#!/usr/bin/env python3
"""test_gateway_runs_parity.py — runs-lane read doors + events-stream parity wall.

Proves the TypeScript port (packages/gateway/src/doors/runs.ts over the
ROUTES mirror, ctx.ts dispatch arms, server.ts upgrade seam) serves the
runs read doors + the events-stream door byte-identical to the py gateway:

  GET /v1/queue                      (_h_queue — empty snapshot)
  GET /v1/flows/runs[?limit=]        (_h_runs_list — sidecar rows)
  GET /v1/flows/runs/{id}            (_h_run_detail — restore shape)
  GET /v1/flows/status/{id}[?include_log=]
      (_h_flows_status — live MISS -> sidecarStatus fallback;
       the live-HIT path is the flows-run lane's 45/0, not this wall)
  GET /v1/flows/events[/{id}][?run_id=]
      (non-upgrade -> _h_ws_fallback 404; Upgrade -> WS frames)
  WS  /v1/flows/events[/{id}][?run_id=]
      (hello / unknown-run hydrate frames, then hold — no cursor,
       no replay: reconnect === fresh subscribe + fresh hydrate)

Method: build ONE fixture tree at wall runtime, copytree it per server
(never shared — the py boot SWEEPS stale sidecars at startup and every
stale read rewrites; the TS shell never writes), boot py via
boot_scratch_gateway + the TS server (ephemeral port, QUEUE LANE LAW),
SYNC py's boot-swept stale files onto the TS tree (both sides then
serve the same swept bytes), then dual-serve every shape:

  - queue + runs list incl. the ?limit matrix (int/underscore/plus/
    space/garbage/blank/multi-first-wins) with the D7 TIE-AWARE list
    compare (created==0 non-media ties order nondeterministically on
    EACH side — stable-sort tie groups by run_id before comparing;
    non-tie order bugs still surface);
  - detail rows incl. card-wins vs sidecar-span, injection, legacy
    404, underscore-pipeline serve, valid-JSON-non-object 200s;
  - status rows incl. log_tail variants, zombie/never-executed
    boot-swept bytes, legacy/unknown 404s, unparseable envelope;
  - read-time sweep reports (run-rtR/run-rtQ written to BOTH trees
    post-boot, read TS-then-py EXACTLY once each — py's read mutates
    after composing, so order is load-bearing and documented);
  - scripted lifecycle queued->running->completed->failed over the
    DETAIL door (no sweep, no registry — order-free on both trees);
  - valid-JSON-non-object STATUS reads 500 on BOTH (py AttributeError
    vs TS Error — texts differ honestly; the wall pins status 500 +
    envelope keys + route, never the traceback);
  - non-upgrade events 404s (invalid_request, never no_such_route),
    method mismatch (no_such_route), unknown-run detail/status 404s;
  - WS frame bytes (hello incl. py's own empty-queue hello, unknown
    hydrate path/query forms, reconnect-identical) + hold-silence;
  - auth-gate parity with the token ON (401 shapes, wrong token,
    /v1/health exempt, bearer 200s, WS 403 vs ?token=/header frames).

No goldens anywhere: every assertion compares py-vs-ts bytes (or the
documented envelope-key/tie subsets). D1-D8 divergences from the
doors/runs.ts header are the contract — fixtures stay inside them
(valid UTF-8, NaN-free, ASCII limits, distinct created_at except the
deliberate D7 tie trio run-badjson/run-arr/run-num, the last two
created post-boot).

Direct-call differential (route() vs runs.ts imports, 51/51 incl. the
read-time sweep texts and the THREW/AttributeError-vs-Error pair for
scalar sidecars): /tmp/mk_runs_fixtures.py + /tmp/diff_runs_ts.mjs
(prep harness, not shipped — the wall below re-proves the HTTP layer).

Run: python3 tests/walls/suites/test_gateway_runs_parity.py
"""

import base64
import hashlib
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
TOKEN = "wall-runs-token-%d" % os.getpid()

TS_SERVER = REPO / "packages" / "gateway" / "src" / "server.ts"

PARITY_HEADERS = ("content-type", "content-length")

PNG = b"\x89PNG\r\n\x1a\n" + bytes(range(32))
JPG = b"\xff\xd8\xff\xe0" + bytes(range(32))
GLB = b"glTF" + bytes(range(32))

# created_at per run (distinct except the deliberate D7 tie trio:
# run-badjson/run-arr/run-num all read created 0 — unparseable or
# valid-JSON-non-object sidecars carry no created field).
CREATED = {
    "run-done1": 1700000001, "run-fail2": 1700000002,
    "run-modelm": 1700000003, "run-staleR": 1700000004,
    "run-staleQ": 1700000005, "run-underx": 1700000006,
    "run-tricky": 1700000007, "run-nest": 1700000008,
}
MEDIA_RUNS = {"run-nest", "run-tricky", "run-modelm", "run-done1",
              "run-legacy"}

STALE_R = {
    "run_id": "run-staleR", "status": "running", "pipeline": "anny",
    "created_at": 1700000004,
    "stages": [{"id": "w", "index": 0, "status": "running",
                "progress": {"value": 3, "max": 10}}],
}
STALE_Q = {
    "run_id": "run-staleQ", "status": "queued", "pipeline": "anny",
    "created_at": 1700000005,
}


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def build_fixture(root) -> None:
    out = root / "output"
    (root / "drafts").mkdir(parents=True)
    (root / "drafts" / "d1.json").write_text("{}")
    d1 = out / "run-done1"
    d1.mkdir(parents=True)
    (d1 / "_flow.json").write_text(json.dumps({
        "run_id": "run-done1", "status": "completed", "pipeline": "anny",
        "prompt": "a \"quoted\" h\u00e9llo\nw\u00f6rld \u2603",
        "seed": 7, "draft_id": "d1", "created_at": 1700000001,
        "durationSec": 42,
        "stages": [
            {"id": "s1", "index": 0, "status": "completed",
             "progress": {"value": 10, "max": 10},
             "activity": {"phase": "done", "message": "ok"}},
            {"id": "s2", "index": 1, "status": "failed",
             "error": "kaput"},
        ],
        "artifacts": [], "error": "",
    }))
    (d1 / "card.json").write_text(json.dumps({"stages": [
        {"id": "gen", "index": 0, "status": "completed",
         "threshold": 1.0, "ratio": 0.5},
        {"id": "up", "index": 1, "status": "completed"},
    ]}))
    (d1 / "_request.json").write_text(
        json.dumps({"prompt": "req-prompt", "seed": 9}))
    for i in range(1, 5):
        (d1 / ("img%d.png" % i)).write_bytes(PNG)
    (d1 / "sub").mkdir()
    (d1 / "sub" / "nested.jpg").write_bytes(JPG)
    (d1 / "_poster.jpg").write_bytes(JPG)
    d2 = out / "run-fail2"
    d2.mkdir(parents=True)
    (d2 / "_flow.json").write_text(json.dumps({
        "run_id": "run-fail2", "status": "error", "pipeline": "anny",
        "prompt": "plain prompt", "seed": 3, "draft_id": "gone",
        "created_at": 1700000002,
        "stages": [{"id": "only", "index": 0, "status": "failed",
                    "error": "stage blew up"}],
        "error": "boom happened",
    }))
    (d2 / "notes.txt").write_text("not media\n")
    dm = out / "run-modelm"
    dm.mkdir(parents=True)
    (dm / "_flow.json").write_text(json.dumps({
        "run_id": "run-modelm", "status": "completed", "pipeline": "anny",
        "created_at": 1700000003,
    }))
    (dm / "n.glb").write_bytes(GLB)
    dsr = out / "run-staleR"
    dsr.mkdir(parents=True)
    (dsr / "_flow.json").write_text(json.dumps(STALE_R))
    dsq = out / "run-staleQ"
    dsq.mkdir(parents=True)
    (dsq / "_flow.json").write_text(json.dumps(STALE_Q))
    du = out / "run-underx"
    du.mkdir(parents=True)
    (du / "_flow.json").write_text(json.dumps({
        "status": "completed", "pipeline": "_hidden",
        "created_at": 1700000006,
    }))
    dl = out / "run-legacy"
    dl.mkdir(parents=True)
    (dl / "c.png").write_bytes(PNG)
    de = out / "run-emptys"
    de.mkdir(parents=True)
    (de / "_flow.json").write_text(json.dumps({
        "status": "", "pipeline": "anny", "created_at": 1700000000,
    }))
    db = out / "run-badjson"
    db.mkdir(parents=True)
    (db / "_flow.json").write_text("{oops")
    dt = out / "run-tricky"
    dt.mkdir(parents=True)
    (dt / "_flow.json").write_text(json.dumps({
        "status": "completed", "pipeline": "anny",
        "created_at": 1700000007,
    }))
    (dt / "_top.png").write_bytes(PNG)
    (dt / "keep.wav").write_bytes(b"WAV" + bytes(range(16)))
    (dt / "sub").mkdir()
    (dt / "sub" / "_skip.png").write_bytes(PNG)
    (dt / "sub" / "vid.mp4").write_bytes(b"MP4" + bytes(range(16)))
    (dt / "sub" / "deep").mkdir()
    (dt / "sub" / "deep" / "y.png").write_bytes(PNG)
    (dt / "sub" / "bundle.mp4").mkdir()
    (dt / "sub" / "bundle.mp4" / "z.png").write_bytes(PNG)
    dn = out / "run-nest"
    dn.mkdir(parents=True)
    (dn / "_flow.json").write_text(json.dumps({
        "status": "completed", "pipeline": "anny",
        "created_at": 1700000008,
    }))
    (dn / "sub").mkdir()
    (dn / "sub" / "only.png").write_bytes(PNG)
    # NOTE: valid-JSON-non-object sidecars (run-arr "[1,2]", run-num
    # "5") are NOT built here — py's boot_resurrect doc.get() crashes
    # on them at startup (a booted py gateway cannot start with one
    # present; read-time doors handle them fine). The wall creates
    # them on BOTH trees post-boot, just before their vectors.


def http(port: int, path: str, method: str = "GET",
         headers: dict | None = None) -> tuple[int | None, bytes, dict]:
    """Raw bytes + lowercased headers (no JSON parse — byte-equality)."""
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


def auth() -> dict:
    return {"Authorization": "Bearer " + TOKEN}


def parity_headers(h: dict) -> dict:
    return {k: h.get(k) for k in PARITY_HEADERS if h.get(k) is not None}


def dual(py_port: int, ts_port: int, path: str, name: str,
         method: str = "GET", headers: dict | None = None) -> None:
    """One dual-served shape: status + body bytes + parity headers."""
    hdrs = dict(headers) if headers is not None else auth()
    ps, pb, ph = http(py_port, path, method, hdrs)
    ts, tb, th = http(ts_port, path, method, hdrs)
    if ps is None or ts is None:
        check(name, False, "transport py=%r ts=%r" % (pb[:80], tb[:80]))
        return
    ok = ps == ts and pb == tb and parity_headers(ph) == parity_headers(th)
    note = ""
    if not ok:
        note = ("status %r/%r py %dB ts %dB ph %r th %r"
                % (ts, ps, len(pb), len(tb),
                   parity_headers(ph), parity_headers(th)))
        for i, (a, b) in enumerate(zip(pb, tb)):
            if a != b:
                note += " first-div @%d %r/%r" % (i, pb[max(0, i - 40):i + 40],
                                                 tb[max(0, i - 40):i + 40])
                break
        else:
            if len(pb) != len(tb):
                note += " len-div"
    check(name, ok, note)


def dual_list(py_port: int, ts_port: int, path: str, name: str) -> None:
    """Runs-list compare with the D7 tie rule: tie groups (equal
    (media-segment, created)) order nondeterministically per side, so
    stable-sort each side by (segment, -created, run_id) first.
    Non-tie order bugs still surface (unique keys = identity); row
    bytes stay byte-exact."""
    _, pb, _ = http(py_port, path, headers=auth())
    _, tb, _ = http(ts_port, path, headers=auth())
    try:
        [REDACTED 2026-11-05] = json.loads(pb)
        td = json.loads(tb)
    except Exception as e:
        check(name, False, "unparseable list %r" % e)
        return
    if [REDACTED 2026-11-05].get("count") != td.get("count"):
        check(name, False, "count %r/%r" % (td.get("count"),
                                            [REDACTED 2026-11-05].get("count")))
        return
    key = lambda r: (0 if r["run_id"] in MEDIA_RUNS else 1,
                     -r["created_at"], r["run_id"])
    pr = sorted([REDACTED 2026-11-05]["runs"], key=key)
    tr = sorted(td["runs"], key=key)
    if len(pr) != len(tr):
        check(name, False, "rows %d/%d" % (len(tr), len(pr)))
        return
    for i, (a, b) in enumerate(zip(pr, tr)):
        ab = json.dumps(a, indent=2, ensure_ascii=False)
        bb = json.dumps(b, indent=2, ensure_ascii=False)
        if ab != bb:
            check(name, False, "row %d (%s/%s)" % (i, b.get("run_id"),
                                                  a.get("run_id")))
            return
    check(name, True)


def dual_500(py_port: int, ts_port: int, path: str, name: str) -> None:
    """500-class parity (valid-JSON-non-object sidecars): py raises
    AttributeError, TS throws Error — texts differ honestly. Pin
    status 500 + envelope keys + the route field, never bytes."""
    ps, pb, _ = http(py_port, path, headers=auth())
    ts, tb, _ = http(ts_port, path, headers=auth())
    try:
        [REDACTED 2026-11-05] = json.loads(pb)
        td = json.loads(tb)
    except Exception as e:
        check(name, False, "unparseable 500 %r" % e)
        return
    ok = (ps == 500 and ts == 500
          and set([REDACTED 2026-11-05].keys()) == {"error", "type", "traceback", "route"}
          and set(td.keys()) == {"error", "type", "traceback", "route"}
          and [REDACTED 2026-11-05]["route"] == td["route"] == "GET " + path)
    check(name, ok, "status %r/%r keys %r/%r" % (
        ts, ps, sorted(td.keys()), sorted([REDACTED 2026-11-05].keys())))


WS_KEY = "dGhlIHNhbXBsZSBub25jZQ=="  # RFC 6455 example key


def ws_handshake(port: int, target: str,
                 headers: dict | None = None
                 ) -> tuple[socket.socket, bytes, bytes]:
    """Raw upgrade; returns (socket, status line, header block)."""
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
    status = head.split(b"\r\n", 1)[0]
    return s, status, rest


def ws_read_frame(s: socket.socket, rest: bytes,
                  timeout: float = 10.0) -> tuple[bytes, bytes]:
    """Read ONE server frame; returns (payload, leftover). Server
    frames are unmasked; control frames raise (the wall pins data)."""
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
        mask = b"\x00\x00\x00\x00"
        s.sendall(b"\x88\x80" + mask)  # masked empty close
    except OSError:
        pass
    try:
        s.close()
    except OSError:
        pass


def dual_ws(py_port: int, ts_port: int, target: str, name: str,
            want: bytes, headers: dict | None = None) -> None:
    """One WS door: 101 both, first-frame bytes equal to `want` on
    both, then hold-silence (no second frame within the window —
    the no-heartbeat/no-replay contract)."""
    for port, side in ((py_port, "py"), (ts_port, "ts")):
        s = None
        try:
            s, status, rest = ws_handshake(port, target, headers)
            if status != b"HTTP/1.1 101 Switching Protocols":
                check(name, False, "%s status %r" % (side, status))
                return
            frame, _ = ws_read_frame(s, rest)
            if frame != want:
                check(name, False, "%s frame %r" % (side, frame[:120]))
                return
            try:
                ws_read_frame(s, b"", timeout=1.0)
                check(name, False, "%s second frame arrived" % side)
                return
            except socket.timeout:
                pass  # hold-silence: exactly the contract
        except Exception as e:
            check(name, False, "%s transport %r" % (side, e))
            return
        finally:
            if s is not None:
                ws_close(s)
    check(name, True)


def dual_ws_403(py_port: int, ts_port: int, target: str, name: str,
                headers: dict | None = None) -> None:
    """Auth-on WS refusal: 403 + empty body on both (uvicorn turns
    py's pre-accept close into the 403; the TS door writes it)."""
    for port, side in ((py_port, "py"), (ts_port, "ts")):
        s = None
        try:
            s, status, rest = ws_handshake(port, target, headers)
            body = rest
            s.settimeout(1.0)
            try:
                while True:
                    chunk = s.recv(4096)
                    if not chunk:
                        break
                    body += chunk
            except socket.timeout:
                pass
            if status != b"HTTP/1.1 403 Forbidden" or body != b"":
                check(name, False, "%s %r body %dB" % (side, status,
                                                      len(body)))
                return
        except Exception as e:
            check(name, False, "%s transport %r" % (side, e))
            return
        finally:
            if s is not None:
                try:
                    s.close()
                except OSError:
                    pass
    check(name, True)


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


def sync_swept(py_root, ts_root, run_id: str) -> None:
    """Copy py's boot-swept sidecar onto the TS tree: the boot sweep
    owns stale files before any read, so both servers must serve the
    SAME swept bytes (the wall compares bytes, never goldens)."""
    data = (py_root / "output" / run_id / "_flow.json").read_bytes()
    (ts_root / "output" / run_id / "_flow.json").write_bytes(data)


def main() -> int:
    base = None
    py_proc = ts_proc = None
    try:
        base = tempfile.mkdtemp(prefix="wall-runs-")
        from pathlib import Path as _P
        base_p = _P(base)
        seed = base_p / "seed"
        build_fixture(seed)
        py_root = base_p / "py-root"
        ts_root = base_p / "ts-root"
        shutil.copytree(seed, py_root)
        shutil.copytree(seed, ts_root)

        py_env = dict(os.environ, MELITE_STATE_ROOT=str(py_root),
                      DSH_GATEWAY_TOKEN=TOKEN)
        ts_env = dict(os.environ, MELITE_STATE_ROOT=str(ts_root),
                      DSH_GATEWAY_TOKEN=TOKEN)
        py_port, py_proc = boot_scratch_gateway(env=py_env)
        ts_port, ts_proc = boot_ts(ts_env)

        # Boot sweep owns stale files first: sync py's swept bytes
        # onto the TS tree before any stale vector runs.
        sync_swept(py_root, ts_root, "run-staleR")
        sync_swept(py_root, ts_root, "run-staleQ")

        # ── queue ──
        dual(py_port, ts_port, "/v1/queue", "queue")

        # ── runs list + limit matrix (tie-aware) ──
        dual_list(py_port, ts_port, "/v1/flows/runs", "runs")
        for q, n in (("?limit=2", "limit-2"), ("?limit=0", "limit-0"),
                     ("?limit=999", "limit-999"),
                     ("?limit=-5", "limit-neg"),
                     ("?limit=1_0", "limit-underscore"),
                     ("?limit=+3", "limit-plus"),
                     ("?limit=%203%20", "limit-space"),
                     ("?limit=&limit=3", "limit-multiblank"),
                     ("?limit=2&limit=3", "limit-multi-first")):
            dual_list(py_port, ts_port, "/v1/flows/runs" + q, n)
        for q, n in (("?limit=abc", "limit-abc"),
                     ("?limit=12x", "limit-12x"),
                     ("?limit=", "limit-blank")):
            dual(py_port, ts_port, "/v1/flows/runs" + q, n)

        # ── detail ──
        for rid in ("run-done1", "run-fail2", "run-staleR", "run-underx",
                    "run-legacy", "run-badjson", "run-tricky", "run-nest"):
            dual(py_port, ts_port, "/v1/flows/runs/" + rid,
                 "detail-" + rid)
        dual(py_port, ts_port, "/v1/flows/runs/run-nope",
             "detail-unknown")

        # ── status (boot-swept stale reads — same bytes both trees) ──
        dual(py_port, ts_port, "/v1/flows/status/run-done1",
             "status-done1")
        for q, n in (("?include_log=1", "log-1"),
                     ("?include_log=true", "log-true"),
                     ("?include_log=YES", "log-YES"),
                     ("?include_log=0", "log-0")):
            dual(py_port, ts_port, "/v1/flows/status/run-done1" + q,
                 "status-done1-" + n)
        dual(py_port, ts_port, "/v1/flows/status/run-fail2",
             "status-fail2")
        dual(py_port, ts_port, "/v1/flows/status/run-fail2?include_log=1",
             "status-fail2-log")
        dual(py_port, ts_port, "/v1/flows/status/run-staleR",
             "status-staleR")
        dual(py_port, ts_port,
             "/v1/flows/status/run-staleR?include_log=1",
             "status-staleR-log")
        dual(py_port, ts_port, "/v1/flows/status/run-staleQ",
             "status-staleQ")
        dual(py_port, ts_port,
             "/v1/flows/status/run-staleQ?include_log=yes",
             "status-staleQ-log")
        dual(py_port, ts_port, "/v1/flows/status/run-legacy",
             "status-legacy")
        dual(py_port, ts_port, "/v1/flows/status/run-badjson",
             "status-badjson")
        dual(py_port, ts_port, "/v1/flows/status/run-nope",
             "status-unknown")

        # ── read-time sweep reports: fresh stale pair on BOTH trees,
        # read TS-then-py EXACTLY once each. Order is load-bearing:
        # the TS shell never writes (pristine read), py composes the
        # same report bytes then mutates (never re-read after).
        for rid, doc in (("run-rtR", {"run_id": "run-rtR",
                                      "status": "running",
                                      "pipeline": "anny",
                                      "stages": [{"id": "w", "index": 0,
                                                  "status": "running"}]}),
                         ("run-rtQ", {"run_id": "run-rtQ",
                                      "status": "queued",
                                      "pipeline": "anny"})):
            for root in (py_root, ts_root):
                d = root / "output" / rid
                d.mkdir(exist_ok=True)
                (d / "_flow.json").write_text(json.dumps(doc))
            tps, tpb, _ = http(ts_port, "/v1/flows/status/" + rid,
                               headers=auth())
            pps, ppb, _ = http(py_port, "/v1/flows/status/" + rid,
                               headers=auth())
            check("readtime-" + rid,
                  tps == pps == 200 and tpb == ppb,
                  "status %r/%r %dB/%dB" % (tps, pps, len(tpb), len(ppb)))
            # Remove the pair: py's read MUTATED its copy (swept file)
            # while the TS copy stays pristine (D1) — leaving them
            # would poison every later list vector (count + row
            # bytes), so the pair lives exactly one read each.
            for root in (py_root, ts_root):
                shutil.rmtree(root / "output" / rid, ignore_errors=True)

        # ── scripted lifecycle queued->running->completed->failed
        # over the DETAIL door (no sweep, no registry — order-free).
        cyc = py_root / "output" / "run-cycle"
        cyc_ts = ts_root / "output" / "run-cycle"
        cyc.mkdir(exist_ok=True)
        cyc_ts.mkdir(exist_ok=True)
        states = [
            ("queued", {"run_id": "run-cycle", "status": "queued",
                        "pipeline": "anny", "created_at": 1700000009}),
            ("running", {"run_id": "run-cycle", "status": "running",
                         "pipeline": "anny", "created_at": 1700000009,
                         "stages": [{"id": "w", "index": 0,
                                     "status": "running",
                                     "progress": {"value": 1,
                                                  "max": 4}}]}),
            ("completed", {"run_id": "run-cycle", "status": "completed",
                           "pipeline": "anny", "created_at": 1700000009,
                           "durationSec": 9,
                           "stages": [{"id": "w", "index": 0,
                                       "status": "completed"}]}),
            ("failed", {"run_id": "run-cycle", "status": "error",
                        "pipeline": "anny", "created_at": 1700000009,
                        "error": "late failure"}),
        ]
        for step, doc in states:
            text = json.dumps(doc)
            (cyc / "_flow.json").write_text(text)
            (cyc_ts / "_flow.json").write_text(text)
            dual(py_port, ts_port, "/v1/flows/runs/run-cycle",
                 "cycle-" + step)

        # ── valid-JSON-non-object sidecars, created on BOTH trees
        # post-boot (boot_resurrect cannot start with them present —
        # see build_fixture). List/detail serve unknown rows (200);
        # STATUS 500-classes on both (500 + keys + route, never
        # bytes). A closing full-list pins their rows + count 15.
        for rid, text in (("run-arr", "[1,2]"), ("run-num", "5")):
            for root in (py_root, ts_root):
                d = root / "output" / rid
                d.mkdir(exist_ok=True)
                (d / "_flow.json").write_text(text)
            dual(py_port, ts_port, "/v1/flows/runs/" + rid,
                 "detail-" + rid)
        dual_500(py_port, ts_port, "/v1/flows/status/run-arr",
                 "status-500-arr")
        dual_500(py_port, ts_port, "/v1/flows/status/run-num",
                 "status-500-num")
        dual_list(py_port, ts_port, "/v1/flows/runs", "runs-with-nonobj")

        # ── events fallback + mismatch ──
        dual(py_port, ts_port, "/v1/flows/events", "events-fallback")
        dual(py_port, ts_port, "/v1/flows/events/run-done1",
             "events-fallback-id")
        dual(py_port, ts_port, "/v1/flows/events?run_id=run-done1",
             "events-fallback-q")
        dual(py_port, ts_port, "/v1/flows/events", "events-post",
             method="POST")
        dual(py_port, ts_port, "/v1/flows/runs", "runs-post",
             method="POST")

        # ── WS frames (token ON: header form here; ?token= below) ──
        hello = b'{"type":"hello","channel":"*","queue_depth":0,' \
                b'"queued":[],"active":null}'
        unknown = b'{"type":"run","status":"unknown"}'
        hdr = {"Authorization": "Bearer " + TOKEN}
        dual_ws(py_port, ts_port, "/v1/flows/events", "ws-hello", hello,
                hdr)
        dual_ws(py_port, ts_port, "/v1/flows/events/run-done1",
                "ws-unknown-path", unknown, hdr)
        dual_ws(py_port, ts_port, "/v1/flows/events?run_id=run-done1",
                "ws-unknown-query", unknown, hdr)
        # reconnect === fresh subscribe + fresh hydrate (no cursor,
        # no replay): same bytes twice on each side.
        dual_ws(py_port, ts_port, "/v1/flows/events", "ws-reconnect",
                hello, hdr)
        dual_ws(py_port, ts_port, "/v1/flows/events/run-staleR",
                "ws-unknown-stale", unknown, hdr)
        # ?token= form (the browser door — no headers possible).
        dual_ws(py_port, ts_port, "/v1/flows/events?token=" + TOKEN,
                "ws-hello-token", hello)
        # refusal: no token anywhere -> 403 + empty body.
        dual_ws_403(py_port, ts_port, "/v1/flows/events", "ws-403")
        dual_ws_403(py_port, ts_port, "/v1/flows/events/run-done1",
                    "ws-403-id")
        dual_ws_403(py_port, ts_port, "/v1/flows/events", "ws-403-wrong",
                    {"Authorization": "Bearer wrong"})

        # ── HTTP auth: 401 shapes + exempt health + bearer 200s ──
        dual(py_port, ts_port, "/v1/queue", "auth-401-queue", headers={})
        dual(py_port, ts_port, "/v1/flows/runs", "auth-401-runs",
             headers={})
        dual(py_port, ts_port, "/v1/flows/status/run-done1",
             "auth-401-status", headers={})
        dual(py_port, ts_port, "/v1/flows/runs/run-done1",
             "auth-401-detail", headers={})
        dual(py_port, ts_port, "/v1/queue", "auth-401-wrong",
             headers={"Authorization": "Bearer wrong"})
        dual(py_port, ts_port, "/v1/health", "auth-health-exempt",
             headers={})
        # query token does NOT count on the HTTP path (_adapt passes
        # "" as query_token — wall pins the refusal).
        dual(py_port, ts_port, "/v1/queue?token=" + TOKEN,
             "auth-query-refused", headers={})
    finally:
        for proc in (py_proc, ts_proc):
            if proc is not None:
                try:
                    reap_gateway(proc)
                except Exception:
                    pass
        if base is not None:
            shutil.rmtree(base, ignore_errors=True)
    print("runs parity: %d passed, %d failed" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())

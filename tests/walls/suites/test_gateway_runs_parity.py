#!/usr/bin/env python3
"""test_gateway_runs_parity.py — runs-lane read doors + events-stream wall (TS-ONLY).

Pins the TypeScript gateway (packages/gateway/src/doors/runs.ts over the
ROUTES mirror, ctx.ts dispatch arms, the queue.ts boot sweep, server.ts
upgrade seam) serving the runs read doors + the events-stream door:

  GET /v1/queue                      (hQueue — empty snapshot)
  GET /v1/flows/runs[?limit=]        (hRunsList — sidecar rows)
  GET /v1/flows/runs/{id}            (hRunDetail — restore shape)
  GET /v1/flows/status/{id}[?include_log=]
      (hFlowsStatus — boot-swept stale files serve their swept bytes;
       post-boot stale sidecars serve the composed read-time report;
       the live-HIT path is the flows-run lane's, not this wall)
  GET /v1/flows/events[/{id}][?run_id=]
      (non-upgrade -> wsFallback404 404; Upgrade -> WS frames)
  WS  /v1/flows/events[/{id}][?run_id=]
      (hello / unknown-run hydrate frames, then hold — no cursor,
       no replay: reconnect === fresh subscribe + fresh hydrate)

Method: build ONE fixture tree at wall runtime, boot ONE TS server on
it (ephemeral port, QUEUE LANE LAW). The boot sweep owns stale files
before traffic (packages/gateway/src/queue/queue.ts bootSweep), so no
sidecar sync is needed — there is no second server. Every shape is
served once and pinned:

  - queue + runs list incl. the ?limit matrix (int/underscore/plus/
    space/garbage/blank/multi-first-wins) with the D7 TIE-AWARE list
    compare (created==0 non-media ties order nondeterministically per
    readdir — stable-sort tie groups by run_id before comparing;
    non-tie order bugs still surface) against the frozen goldens;
  - detail rows incl. card-wins vs sidecar-span, injection, legacy
    404, underscore-pipeline serve, valid-JSON-non-object 200s;
  - status rows incl. log_tail variants, zombie/never-executed
    boot-swept bytes, legacy/unknown 404s, unparseable envelope;
  - read-time sweep reports (run-rtR/run-rtQ written post-boot, read
    TWICE each — the TS read door composes the report WITHOUT the
    write, so every read is pristine; both reads pin the same golden
    and idempotence follows transitively);
  - scripted lifecycle queued->running->completed->failed over the
    DETAIL door (no sweep, no registry — order-free);
  - valid-JSON-non-object STATUS reads pin 500 + envelope keys +
    route literally (the 500 texts embed the host stack and differ
    honestly — never bytes);
  - non-upgrade events 404s (invalid_request, never no_such_route),
    method mismatch (no_such_route), unknown-run detail/status 404s;
  - WS frame bytes (empty-queue hello, unknown hydrate path/query
    forms, reconnect-identical) + hold-silence;
  - auth-gate pins with the token ON (401 shapes, wrong token,
    /v1/health exempt, bearer 200s on every golden leg, WS 403 vs
    ?token=/header frames, query-token refused on HTTP).

Goldens live in golden_ts/test_gateway_runs_parity/ (causes.md there):
literals where the expectation is a shape, frozen bytes where it is
bytes. D1-D8 divergences from the doors/runs.ts header are the
contract — fixtures stay inside them (valid UTF-8, NaN-free, ASCII
limits, distinct created_at except the deliberate D7 tie trio
run-badjson/run-arr/run-num, the last two created post-boot).

ORACLE DEATH 2026-09-08: re-derived TS-ONLY from the dual-serve wall
per the operator order "we do not need parity, we need to migrate,
not keep the old machinery". The second-server legs, the boot-swept
sidecar sync, and the unshipped direct-call differential prep harness
are retired with this stroke; the HTTP wall below is the contract now.
TS cites: packages/gateway/src/doors/runs.ts (queue/list/detail/
status/fallback frames), packages/gateway/src/ctx.ts + core/errors.ts
(auth gate + envelopes), packages/gateway/src/queue/queue.ts (boot
sweep notes), apps/gateway/src/main.ts (TS entry).

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

Run: python3 tests/walls/suites/test_gateway_runs_parity.py
"""

import json
import os
import shutil
import socket
import sys
import tempfile
import urllib.error
import urllib.request

from _anchor import REPO, boot_scratch_gateway, reap_gateway

sys.dont_write_bytecode = True

PASS = FAIL = 0
TOKEN = "wall-runs-token-%d" % os.getpid()

GOLDEN_DIR = (REPO / "tests" / "walls" / "suites" / "golden_ts" /
              "test_gateway_runs_parity")

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
    # "5") are NOT built here — they land post-boot, just before
    # their vectors, so the wall pins the pre/post transition
    # explicitly (list count 11 -> 14, detail 200s, STATUS 500s).


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


def golden(name: str) -> bytes:
    return (GOLDEN_DIR / name).read_bytes()


def pin(ts_port: int, path: str, name: str, golden_name: str,
        expect: int = 200, method: str = "GET",
        headers: dict | None = None) -> None:
    """One TS-served shape: status literal + body bytes == golden."""
    hdrs = dict(headers) if headers is not None else auth()
    st, body, hd = http(ts_port, path, method, hdrs)
    if st is None:
        check(name, False, "transport %r" % (body[:80],))
        return
    want = golden(golden_name)
    ctype = hd.get("content-type", "")
    ok = st == expect and body == want and ctype == "application/json"
    note = ""
    if not ok:
        note = ("status %r want %r %dB/%dB ctype %r"
                % (st, expect, len(body), len(want), ctype))
        for i, (a, b) in enumerate(zip(body, want)):
            if a != b:
                note += " first-div @%d %r/%r" % (i, body[max(0, i - 40):i + 40],
                                                 want[max(0, i - 40):i + 40])
                break
        else:
            if len(body) != len(want):
                note += " len-div"
    check(name, ok, note)


def pin_list(ts_port: int, path: str, name: str,
             golden_name: str) -> None:
    """Runs-list pin with the D7 tie rule: tie groups (equal
    (media-segment, created)) order nondeterministically per readdir,
    so stable-sort each side by (segment, -created, run_id) first
    (the golden is stored pre-sorted; sorting is idempotent).
    Non-tie order bugs still surface (unique keys = identity); row
    bytes stay byte-exact."""
    _, body, _ = http(ts_port, path, headers=auth())
    try:
        td = json.loads(body)
        gd = json.loads(golden(golden_name))
    except Exception as e:
        check(name, False, "unparseable list %r" % e)
        return
    if td.get("count") != gd.get("count"):
        check(name, False, "count %r want %r" % (td.get("count"),
                                                gd.get("count")))
        return
    key = lambda r: (0 if r["run_id"] in MEDIA_RUNS else 1,
                     -r["created_at"], r["run_id"])
    tr = sorted(td["runs"], key=key)
    gr = sorted(gd["runs"], key=key)
    if len(tr) != len(gr):
        check(name, False, "rows %d want %d" % (len(tr), len(gr)))
        return
    for i, (a, b) in enumerate(zip(tr, gr)):
        ab = json.dumps(a, indent=2, ensure_ascii=False)
        bb = json.dumps(b, indent=2, ensure_ascii=False)
        if ab != bb:
            check(name, False, "row %d (%s want %s)" % (i, a.get("run_id"),
                                                       b.get("run_id")))
            return
    check(name, True)


def pin_500(ts_port: int, path: str, name: str) -> None:
    """500-class pin (valid-JSON-non-object sidecars): the 500 texts
    embed the host stack and differ honestly across runtimes. Pin
    status 500 + envelope keys + the route field, never bytes
    (packages/gateway/src/core/errors.ts 500 envelope)."""
    st, body, _ = http(ts_port, path, headers=auth())
    try:
        td = json.loads(body)
    except Exception as e:
        check(name, False, "unparseable 500 %r" % e)
        return
    ok = (st == 500
          and set(td.keys()) == {"error", "type", "traceback", "route"}
          and td["route"] == "GET " + path)
    check(name, ok, "status %r keys %r" % (st, sorted(td.keys())))


def pin_401(ts_port: int, path: str, name: str,
            headers: dict | None = None) -> None:
    """Auth-refusal shape pin (packages/gateway/src/core/errors.ts
    authCheck: the gate answers BEFORE dispatcher normalization, so
    the 401 carries no code)."""
    st, body, hd = http(ts_port, path, headers={} if headers is None
                        else headers)
    try:
        td = json.loads(body)
    except Exception as e:
        check(name, False, "unparseable 401 %r" % e)
        return
    ok = (st == 401
          and str(td.get("error", "")).startswith("unauthorized:")
          and "code" not in td
          and hd.get("www-authenticate") == "Bearer")
    check(name, ok, "status %r body %r" % (st, body[:100]))


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


def pin_ws(ts_port: int, target: str, name: str, golden_name: str,
           headers: dict | None = None) -> None:
    """One WS door: 101, first-frame bytes equal the golden, then
    hold-silence (no second frame within the window — the
    no-heartbeat/no-replay contract, packages/gateway/src/doors/
    runs.ts stream-framing decision)."""
    s = None
    try:
        s, status, rest = ws_handshake(ts_port, target, headers)
        if status != b"HTTP/1.1 101 Switching Protocols":
            check(name, False, "status %r" % (status,))
            return
        frame, _ = ws_read_frame(s, rest)
        if frame != golden(golden_name):
            check(name, False, "frame %r" % (frame[:120],))
            return
        try:
            ws_read_frame(s, b"", timeout=1.0)
            check(name, False, "second frame arrived")
            return
        except socket.timeout:
            pass  # hold-silence: exactly the contract
    except Exception as e:
        check(name, False, "transport %r" % (e,))
        return
    finally:
        if s is not None:
            ws_close(s)
    check(name, True)


def pin_ws_403(ts_port: int, target: str, name: str,
               headers: dict | None = None) -> None:
    """Auth-on WS refusal: 403 + empty body (the TS door writes it)."""
    s = None
    try:
        s, status, rest = ws_handshake(ts_port, target, headers)
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
            check(name, False, "%r body %dB" % (status, len(body)))
            return
    except Exception as e:
        check(name, False, "transport %r" % (e,))
        return
    finally:
        if s is not None:
            try:
                s.close()
            except OSError:
                pass
    check(name, True)


def main() -> int:
    base = None
    ts_proc = None
    try:
        base = tempfile.mkdtemp(prefix="wall-runs-")
        from pathlib import Path as _P
        base_p = _P(base)
        ts_root = base_p / "ts-root"
        build_fixture(ts_root)

        # SINGLE TS boot on the one root (apps/gateway/src/main.ts,
        # node --experimental-strip-types, via the shared helper).
        # The boot sweep owns stale files before traffic — with no
        # second server there is nothing to sync.
        ts_env = dict(os.environ, MELITE_STATE_ROOT=str(ts_root),
                      DSH_GATEWAY_TOKEN=TOKEN)
        ts_port, ts_proc = boot_scratch_gateway(env=ts_env)

        # ── queue ──
        pin(ts_port, "/v1/queue", "queue", "queue.json")

        # ── runs list + limit matrix (tie-aware) ──
        pin_list(ts_port, "/v1/flows/runs", "runs", "runs.json")
        for q, n in (("?limit=2", "limit-2"), ("?limit=0", "limit-0"),
                     ("?limit=999", "limit-999"),
                     ("?limit=-5", "limit-neg"),
                     ("?limit=1_0", "limit-underscore"),
                     ("?limit=+3", "limit-plus"),
                     ("?limit=%203%20", "limit-space"),
                     ("?limit=&limit=3", "limit-multiblank"),
                     ("?limit=2&limit=3", "limit-multi-first")):
            pin_list(ts_port, "/v1/flows/runs" + q, n, n + ".json")
        for q, n in (("?limit=abc", "limit-abc"),
                     ("?limit=12x", "limit-12x"),
                     ("?limit=", "limit-blank")):
            pin(ts_port, "/v1/flows/runs" + q, n, n + ".json",
                expect=200 if n == "limit-blank" else 400)

        # ── detail ──
        for rid in ("run-done1", "run-fail2", "run-staleR", "run-underx",
                    "run-legacy", "run-badjson", "run-tricky", "run-nest"):
            pin(ts_port, "/v1/flows/runs/" + rid, "detail-" + rid,
                "detail-" + rid + ".json",
                expect=404 if rid == "run-legacy" else 200)
        pin(ts_port, "/v1/flows/runs/run-nope", "detail-unknown",
            "detail-run-nope.json", expect=404)

        # ── status (boot-swept stale reads serve the swept bytes) ──
        pin(ts_port, "/v1/flows/status/run-done1", "status-done1",
            "status-run-done1.json")
        for q, n in (("?include_log=1", "log-1"),
                     ("?include_log=true", "log-true"),
                     ("?include_log=YES", "log-YES"),
                     ("?include_log=0", "log-0")):
            pin(ts_port, "/v1/flows/status/run-done1" + q,
                "status-done1-" + n, "status-run-done1-" + n + ".json")
        pin(ts_port, "/v1/flows/status/run-fail2", "status-fail2",
            "status-run-fail2.json")
        pin(ts_port, "/v1/flows/status/run-fail2?include_log=1",
            "status-fail2-log", "status-run-fail2-log-1.json")
        pin(ts_port, "/v1/flows/status/run-staleR", "status-staleR",
            "status-run-staleR.json")
        pin(ts_port, "/v1/flows/status/run-staleR?include_log=1",
            "status-staleR-log", "status-run-staleR-log-1.json")
        pin(ts_port, "/v1/flows/status/run-staleQ", "status-staleQ",
            "status-run-staleQ.json")
        pin(ts_port, "/v1/flows/status/run-staleQ?include_log=yes",
            "status-staleQ-log", "status-run-staleQ-log-yes.json")
        pin(ts_port, "/v1/flows/status/run-legacy", "status-legacy",
            "status-run-legacy.json", expect=404)
        pin(ts_port, "/v1/flows/status/run-badjson", "status-badjson",
            "status-run-badjson.json")
        pin(ts_port, "/v1/flows/status/run-nope", "status-unknown",
            "status-run-nope.json", expect=404)

        # ── read-time sweep reports: fresh stale pair written post-boot,
        # read TWICE each. TS-ONLY semantics (packages/gateway/src/doors/
        # runs.ts D1): the read door composes the report WITHOUT the
        # write, so every read is pristine — both reads pin the same
        # golden and idempotence follows transitively (no TS-vs-TS leg).
        for rid, doc in (("run-rtR", {"run_id": "run-rtR",
                                      "status": "running",
                                      "pipeline": "anny",
                                      "stages": [{"id": "w", "index": 0,
                                                  "status": "running"}]}),
                         ("run-rtQ", {"run_id": "run-rtQ",
                                      "status": "queued",
                                      "pipeline": "anny"})):
            d = ts_root / "output" / rid
            d.mkdir(exist_ok=True)
            (d / "_flow.json").write_text(json.dumps(doc))
            pin(ts_port, "/v1/flows/status/" + rid,
                "readtime-" + rid, "readtime-" + rid + ".json")
            pin(ts_port, "/v1/flows/status/" + rid,
                "readtime-" + rid + "-repeat",
                "readtime-" + rid + ".json")
            # Remove the pair: leaving it would poison every later list
            # vector (count + row bytes), so the pair lives exactly two
            # pristine reads.
            shutil.rmtree(ts_root / "output" / rid, ignore_errors=True)

        # ── scripted lifecycle queued->running->completed->failed
        # over the DETAIL door (no sweep, no registry — order-free).
        cyc = ts_root / "output" / "run-cycle"
        cyc.mkdir(exist_ok=True)
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
            (cyc / "_flow.json").write_text(json.dumps(doc))
            pin(ts_port, "/v1/flows/runs/run-cycle", "cycle-" + step,
                "cycle-" + step + ".json")

        # ── valid-JSON-non-object sidecars, created post-boot (see
        # build_fixture). List/detail serve unknown rows (200 vs
        # goldens); STATUS 500-pins stay shape-only (500 + keys +
        # route, never bytes). A closing full-list pins their rows +
        # count 14.
        for rid, text in (("run-arr", "[1,2]"), ("run-num", "5")):
            d = ts_root / "output" / rid
            d.mkdir(exist_ok=True)
            (d / "_flow.json").write_text(text)
            pin(ts_port, "/v1/flows/runs/" + rid, "detail-" + rid,
                "detail-" + rid + ".json")
        pin_500(ts_port, "/v1/flows/status/run-arr", "status-500-arr")
        pin_500(ts_port, "/v1/flows/status/run-num", "status-500-num")
        pin_list(ts_port, "/v1/flows/runs", "runs-with-nonobj",
                 "runs-with-nonobj.json")

        # ── events fallback + mismatch ──
        pin(ts_port, "/v1/flows/events", "events-fallback",
            "events-fallback.json", expect=404)
        pin(ts_port, "/v1/flows/events/run-done1", "events-fallback-id",
            "events-fallback-id.json", expect=404)
        pin(ts_port, "/v1/flows/events?run_id=run-done1",
            "events-fallback-q", "events-fallback-q.json", expect=404)
        pin(ts_port, "/v1/flows/events", "events-post",
            "events-post.json", expect=404, method="POST")
        pin(ts_port, "/v1/flows/runs", "runs-post", "runs-post.json",
            expect=404, method="POST")

        # ── WS frames (token ON: header form here; ?token= below) ──
        hdr = {"Authorization": "Bearer " + TOKEN}
        pin_ws(ts_port, "/v1/flows/events", "ws-hello", "ws-hello.json",
               hdr)
        pin_ws(ts_port, "/v1/flows/events/run-done1", "ws-unknown-path",
               "ws-unknown.json", hdr)
        pin_ws(ts_port, "/v1/flows/events?run_id=run-done1",
               "ws-unknown-query", "ws-unknown.json", hdr)
        # reconnect === fresh subscribe + fresh hydrate (no cursor,
        # no replay): same golden twice, each leg vs the golden.
        pin_ws(ts_port, "/v1/flows/events", "ws-reconnect",
               "ws-hello.json", hdr)
        pin_ws(ts_port, "/v1/flows/events/run-staleR", "ws-unknown-stale",
               "ws-unknown.json", hdr)
        # ?token= form (the browser door — no headers possible).
        pin_ws(ts_port, "/v1/flows/events?token=" + TOKEN,
               "ws-hello-token", "ws-hello.json")
        # refusal: no token anywhere -> 403 + empty body.
        pin_ws_403(ts_port, "/v1/flows/events", "ws-403")
        pin_ws_403(ts_port, "/v1/flows/events/run-done1", "ws-403-id")
        pin_ws_403(ts_port, "/v1/flows/events", "ws-403-wrong",
                   {"Authorization": "Bearer wrong"})

        # ── HTTP auth on the SAME TS-only boot (token ON from boot):
        # 401 shapes + exempt health + bearer 200s (every golden leg
        # above already sends the bearer header and pins 200s) ──
        pin_401(ts_port, "/v1/queue", "auth-401-queue")
        pin_401(ts_port, "/v1/flows/runs", "auth-401-runs")
        pin_401(ts_port, "/v1/flows/status/run-done1", "auth-401-status")
        pin_401(ts_port, "/v1/flows/runs/run-done1", "auth-401-detail")
        pin_401(ts_port, "/v1/queue", "auth-401-wrong",
                {"Authorization": "Bearer wrong"})
        st, body, _ = http(ts_port, "/v1/health", headers={})
        try:
            hd = json.loads(body)
        except Exception:
            hd = {}
        check("auth-health-exempt", st == 200 and hd.get("status") == "ok",
              "status %r body %r" % (st, body[:80]))
        # query token does NOT count on the HTTP path (ctx.ts authCheck
        # reads the Authorization header only — wall pins the refusal).
        pin_401(ts_port, "/v1/queue?token=" + TOKEN, "auth-query-refused")
    finally:
        if ts_proc is not None:
            try:
                reap_gateway(ts_proc)
            except Exception:
                pass
        if base is not None:
            shutil.rmtree(base, ignore_errors=True)
    print("runs parity (TS-only): %d passed, %d failed" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())

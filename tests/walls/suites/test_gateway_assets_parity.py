#!/usr/bin/env python3
"""test_gateway_assets_parity.py — Phase-3 TS asset READ doors parity wall.

Proves the TypeScript port (plugins/gateway/src/doors/assets.ts over
the ROUTES mirror, static tables from
plugins/gateway/scripts/capture_assets.py) serves the 4 asset READ
doors byte-identical to the py gateway:

  GET /v1/assets            (_h_assets_index — dynamic JSON)
  GET /v1/ledger            (_h_ledger — dynamic JSON)
  GET /v1/assets/runs/*     (_h_asset — REAL byte serve + ranges)
  GET /v1/assets/inputs/*   (_h_asset_input — REAL byte serve)

Method: build a small FIXTURE tree at wall runtime, copy it to two
roots (py / ts — never shared: each boot appends server.boot to
its own journal), boot py via boot_scratch_gateway
(MELITE_STATE_ROOT=py_root) + the TS server (MELITE_STATE_ROOT=
ts_root, ephemeral port, QUEUE LANE LAW), then dual-serve every
shape and assert byte-equality on bodies + header-equality on the
parity set (content-type/length/range/accept-ranges):

  - JSON doors verbatim (limit/run/kind/include_test/event query
    matrix, garbage limits, float 1.0 + ensure_ascii pins);
  - full GETs byte-equal on every fixture file (incl. nested rels,
    `_` sidecars served but not indexed, directory -> empty 200);
  - 14 range shapes (prefix/suffix/open/clamp/oversize-suffix/
    unsatisfiable/malformed/multi/case/hi<lo/-0/empty/absent +
    ranges IGNORED on the inputs door);
  - refusal shapes (404-outside-root, traversal-400 wire string,
    double-encoded inputs 400s, method mismatch, unknown-kind
    no-filter);
  - auth-gate parity with the token OFF (this phase) and ON
    (reboot both: 401 shapes, wrong token, query token refused,
    /v1/health exempt, bearer 200s);
  - the ?include_test=true journal side effect (parsed compare,
    ts ignored) — ledger byte-checks run BEFORE it lands.

The inputs fixture lives in the REAL REPO/data/input (py resolves
the inputs dir from REPO, not MELITE_STATE_ROOT — gateway.py
serve_input_asset(str(REPO), ...)): unique pid-suffixed names,
removed in the finally.

Run: python3 tests/walls/suites/test_gateway_assets_parity.py
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

from _anchor import REPO, boot_scratch_gateway, reap_gateway

sys.dont_write_bytecode = True

PASS = FAIL = 0
TOKEN = "wall-assets-token-%d" % os.getpid()

TS_SERVER = REPO / "plugins" / "gateway" / "src" / "server.ts"
TS_ASSETS = REPO / "plugins" / "gateway" / "src" / "doors" / "assets.ts"
CAPTURE = REPO / "plugins" / "gateway" / "scripts" / "capture_assets.py"
INPUT_DIR = REPO / "data" / "input"

INAME_PNG = "wall-assets-hero-%d.png" % os.getpid()
INAME_WEBP = "wall-assets-hero-%d.webp" % os.getpid()

PARITY_HEADERS = ("content-type", "content-length",
                  "content-range", "accept-ranges")


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


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


def parity_headers(h: dict) -> dict:
    return {k: h.get(k) for k in PARITY_HEADERS if h.get(k) is not None}


def dual(py_port: int, ts_port: int, path: str, name: str,
         method: str = "GET", headers: dict | None = None) -> None:
    """One dual-served shape: status + body bytes + parity headers."""
    ps, pb, ph = http(py_port, path, method, headers)
    ts, tb, th = http(ts_port, path, method, headers)
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
                note += " first-div @%d" % i
                break
        else:
            if len(pb) != len(tb):
                note += " len-div"
    check(name, ok, note)


def build_fixture(root) -> None:
    out = root / "output"
    a1 = out / "run-a1"
    (a1 / "stage1").mkdir(parents=True)
    (a1 / "cover.png").write_bytes(bytes(range(256)) * 4)          # 1024B
    (a1 / "clip.mp4").write_bytes(bytes([i % 251 for i in range(3000)]))
    (a1 / "tone.wav").write_bytes(bytes([(i * 7) % 256 for i in range(500)]))
    (a1 / "mesh.glb").write_bytes(bytes([(i * 13) % 256 for i in range(700)]))
    (a1 / "spec.json").write_bytes(b'{"hello":"world","n":1}')
    (a1 / "blob.bin").write_bytes(bytes([(i * 3) % 256 for i in range(100)]))
    (a1 / "caf\u00e9.png").write_bytes(bytes(range(64)))            # non-ASCII name
    (a1 / "stage1" / "out.png").write_bytes(bytes(range(48)))       # nested rel
    (a1 / "_flow.json").write_text(json.dumps(
        {"run_id": "run-a1", "status": "completed", "model": "anny",
         "created_at": 1700000000}))
    (a1 / "_poster.jpg").write_bytes(bytes(range(32)))              # served, not indexed
    b2 = out / "run-b2"
    b2.mkdir(parents=True)
    (b2 / "t.png").write_bytes(bytes(range(40)))
    (b2 / "_flow.json").write_text(json.dumps(
        {"run_id": "run-b2", "status": "completed", "model": "anny",
         "created_at": 1699999999, "test": True}))
    c3 = out / "run-c3"
    c3.mkdir(parents=True)
    (c3 / "_flow.json").write_text(json.dumps(
        {"run_id": "run-c3", "status": "completed", "model": "krea",
         "created_at": 1699999998}))
    d4 = out / "run-d4"
    d4.mkdir(parents=True)
    (d4 / "f.txt").write_bytes(b"boom!\n\n\n")
    (d4 / "_flow.json").write_text(json.dumps(
        {"run_id": "run-d4", "status": "failed", "model": "anny",
         "created_at": 1699999997, "error": "boom"}))
    (out / "stray.txt").write_text("not a run dir")
    (out / "run-stray").write_bytes(b"a file, not a dir")           # empty-row pin


LEDGER_LINES = [
    '{"ts":1700000001,"event":"run.completed","data":{"run_id":"run-a1","score":1.0,"ratio":0.5}}',
    '{"ts":1700000002,"event":"note","data":{"msg":"h\\u00e9llo\\u2014w\\u00f6rld"}}',
    '{"event":"note", oops-this-line-is-not-json',
    '{"ts":1700000003,"event":"run.completed","data":{}}',
    '{"ts":1700000004,"event":"other","data":{"n":2}}',
]


def write_ledger(root) -> None:
    (root / "output").mkdir(parents=True, exist_ok=True)
    (root / "output" / "_ledger.jsonl").write_text(
        "\n".join(LEDGER_LINES) + "\n", encoding="utf-8")


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


def main() -> int:
    base = None
    py_proc = ts_proc = None
    py_port = ts_port = 0
    try:
        r = subprocess.run(
            [sys.executable, str(CAPTURE), "--check"],
            capture_output=True, text=True, cwd=str(REPO))
        check("capture_assets.py --check fresh",
              r.returncode == 0, (r.stderr or r.stdout)[-200:])

        base = __import__("pathlib").Path(
            tempfile.mkdtemp(prefix="wall-assets-"))
        build_fixture(base)
        write_ledger(base)
        py_root = base / "py-root"
        ts_root = base / "ts-root"
        shutil.copytree(str(base / "output"), str(py_root / "output"))
        shutil.copytree(str(base / "output"), str(ts_root / "output"))

        INPUT_DIR.mkdir(parents=True, exist_ok=True)
        (INPUT_DIR / INAME_PNG).write_bytes(bytes(range(256)))
        (INPUT_DIR / INAME_WEBP).write_bytes(bytes([(i * 11) % 256
                                                    for i in range(128)]))

        py_env = dict(os.environ)
        py_env["MELITE_STATE_ROOT"] = str(py_root)
        py_env.pop("DSH_GATEWAY_TOKEN", None)
        py_port, py_proc = boot_scratch_gateway(env=py_env)
        # Both boots append server.boot to their journals (py main()
        # 4489; the TS P5 boot writes the same row) — rewrite the
        # deterministic fixture after each boot so the byte legs see
        # the fixture alone.
        (py_root / "output" / "_ledger.jsonl").write_text(
            "\n".join(LEDGER_LINES) + "\n", encoding="utf-8")
        ts_env = dict(os.environ)
        ts_env["MELITE_STATE_ROOT"] = str(ts_root)
        ts_env.pop("DSH_GATEWAY_TOKEN", None)
        ts_port, ts_proc = boot_ts(ts_env)
        (ts_root / "output" / "_ledger.jsonl").write_text(
            "\n".join(LEDGER_LINES) + "\n", encoding="utf-8")
        print("py :%d vs ts :%d" % (py_port, ts_port))

        # ── JSON doors ──
        for path in ("/v1/assets",
                     "/v1/assets?limit=1",
                     "/v1/assets?limit=2",
                     "/v1/assets?limit=",
                     "/v1/assets?limit=abc",
                     "/v1/assets?run=run-a1",
                     "/v1/assets?run=nope",
                     "/v1/assets?run=",
                     "/v1/assets?kind=image",
                     "/v1/assets?kind=video",
                     "/v1/assets?kind=audio",
                     "/v1/assets?kind=model",
                     "/v1/assets?kind=document",
                     "/v1/assets?kind=other",
                     "/v1/assets?kind=bogus",
                     "/v1/assets?kind=",
                     "/v1/assets?run=run-a1&kind=image&limit=5",
                     "/v1/assets/",
                     "/v1/ledger",
                     "/v1/ledger?limit=1",
                     "/v1/ledger?limit=0",
                     "/v1/ledger?limit=500",
                     "/v1/ledger?limit=abc",
                     "/v1/ledger?limit=2&event=run.completed",
                     "/v1/ledger?event=run.completed",
                     "/v1/ledger?event=note",
                     "/v1/ledger?event=zzz",
                     "/v1/ledger?event=",
                     "/v1/ledger?event=" + "n" * 70):
            dual(py_port, ts_port, path, "GET %s" % path)

        # ensure_ascii actually escaped (not merely equal).
        _, pb, _ = http(py_port, "/v1/assets")
        _, tb, _ = http(ts_port, "/v1/assets")
        check("index ensure_ascii escapes",
              "caf\\u00e9.png" in pb.decode()
              and "caf\\u00e9.png" in tb.decode()
              and "caf\u00e9.png" not in pb.decode()
              and "caf\u00e9.png" not in tb.decode())
        _, pb, _ = http(py_port, "/v1/ledger")
        check("ledger float 1.0 verbatim",
              b'"score": 1.0' in pb and b'"score": 1.0' in
              http(ts_port, "/v1/ledger")[1])
        check("ledger ensure_ascii escapes",
              "h\\u00e9llo\\u2014w\\u00f6rld" in pb.decode())

        # ── byte doors: full GETs ──
        for path in ("/v1/assets/runs/run-a1/cover.png",
                     "/v1/assets/runs/run-a1/clip.mp4",
                     "/v1/assets/runs/run-a1/tone.wav",
                     "/v1/assets/runs/run-a1/mesh.glb",
                     "/v1/assets/runs/run-a1/spec.json",
                     "/v1/assets/runs/run-a1/blob.bin",
                     "/v1/assets/runs/run-a1/caf%C3%A9.png",
                     "/v1/assets/runs/run-a1/stage1/out.png",
                     "/v1/assets/runs/run-a1/_flow.json",
                     "/v1/assets/runs/run-a1/_poster.jpg",
                     "/v1/assets/runs/run-c3/_flow.json",
                     "/v1/assets/runs/run-d4/f.txt",
                     "/v1/assets/runs/run-a1/stage1",
                     "/v1/assets/runs/run-a1",
                     "/v1/assets/runs/run-a1/cover.png?x=1",
                     "/v1/assets/runs/run-a1/nope.png",
                     "/v1/assets/runs/run-a1/stage1/no/such.bin",
                     "/v1/assets/runs/run-a1/../../x",
                     "/v1/assets/runs/%2e%2e/x",
                     "/v1/assets/runs/run-a1/%zz.png",
                     "/v1/assets/inputs/" + INAME_PNG,
                     "/v1/assets/inputs/" + INAME_WEBP,
                     "/v1/assets/inputs/nope.png",
                     "/v1/assets/inputs/x.bin",
                     "/v1/assets/inputs/a/b.png",
                     "/v1/assets/inputs/%2e%2e/%2e%2e/x.png",
                     "/v1/assets/inputs/a%2Fb.png"):
            dual(py_port, ts_port, path, "GET %s" % path)

        # content-length honesty on a byte door.
        for path in ("/v1/assets/runs/run-a1/cover.png",
                     "/v1/assets/inputs/" + INAME_PNG):
            for port, tag in ((py_port, "py"), (ts_port, "ts")):
                st, body, h = http(port, path)
                check("%s content-length %s" % (tag, path),
                      st == 200 and int(h.get("content-length", "-1"))
                      == len(body))

        # ── range shapes (cover.png is 1024 bytes 0..255 x4) ──
        cov = "/v1/assets/runs/run-a1/cover.png"
        for spec in ("bytes=0-9", "bytes=100-", "bytes=-10",
                     "bytes=1000-9999", "bytes=-99999", "bytes=1023-",
                     "bytes=0-0", "bytes=9999-", "bytes=9999-10000",
                     "bytes=5-3", "bytes=-0", "bytes=", "garbage",
                     "bytes=0-1,3-4", "BYTES=0-9", "bytes = 4-7 ",
                     "items=0-9"):
            dual(py_port, ts_port, cov, "range %r" % spec,
                 headers={"Range": spec})
        # Ranges are ignored where py ignores them.
        dual(py_port, ts_port, cov, "range on 404",
             headers={"Range": "bytes=0-9"})
        ps, pb, ph = http(py_port, "/v1/assets/runs/run-a1/nope.png",
                           headers={"Range": "bytes=0-9"})
        dual(py_port, ts_port, "/v1/assets/inputs/" + INAME_PNG,
             "range ignored on inputs door",
             headers={"Range": "bytes=0-9"})
        _, _, th = http(ts_port, "/v1/assets/inputs/" + INAME_PNG,
                        headers={"Range": "bytes=0-9"})
        _, _, ph = http(py_port, "/v1/assets/inputs/" + INAME_PNG,
                        headers={"Range": "bytes=0-9"})
        check("inputs door sends no accept-ranges",
              "accept-ranges" not in th and "accept-ranges" not in ph)
        _, _, rh = http(ts_port, cov)
        check("200 announces accept-ranges",
              rh.get("accept-ranges") == "bytes")
        st, body, rh = http(ts_port, cov, headers={"Range": "bytes=2-5"})
        check("206 shape (status/len/range)",
              st == 206 and body == bytes((2, 3, 4, 5))
              and rh.get("content-range") == "bytes 2-5/1024"
              and int(rh.get("content-length", "-1")) == 4)
        st, body, _ = http(ts_port, cov,
                            headers={"Range": "bytes=9999-10000"})
        check("unsatisfiable range is py's full-200 (no 416)",
              st == 200 and len(body) == 1024)

        # ── method arms + unknown ──
        dual(py_port, ts_port, "/v1/assets", "POST /v1/assets",
             method="POST")
        dual(py_port, ts_port, cov, "POST byte door", method="POST")
        dual(py_port, ts_port, "/v1/does-not-exist-xyz",
             "unknown path 404")

        # ── include_test LAST (it appends to both journals) ──
        for path in ("/v1/assets?include_test=true",
                     "/v1/assets?include_test=1",
                     "/v1/assets?include_test=True",
                     "/v1/assets?include_test=false",
                     "/v1/assets?include_test="):
            dual(py_port, ts_port, path, "GET %s" % path)
        for port, tag in ((py_port, "py"), (ts_port, "ts")):
            _, body, _ = http(port, "/v1/ledger?limit=500")
            try:
                doc = json.loads(body.decode())
                last = doc["entries"][-1]
                ok = (last["event"] == "assets.include_test"
                      and last["data"] == {"limit": 200})
            except (ValueError, KeyError, IndexError):
                ok = False
            check("%s include_test journal receipt" % tag, ok)

        # ── unit pins (node -e over doors/assets.ts) ──
        node = shutil.which("node")
        probe = (
            "import('" + TS_ASSETS.as_uri() + "').then(m=>{"
            "const o=[];"
            "o.push(m.parseRange('bytes=0-9',1024));"
            "o.push(m.parseRange('bytes=100-',1024));"
            "o.push(m.parseRange('bytes=-10',1024));"
            "o.push(m.parseRange('bytes=-99999',1024));"
            "o.push(m.parseRange('bytes=9999-',1024));"
            "o.push(m.parseRange('bytes=5-3',1024));"
            "o.push(m.parseRange('garbage',1024));"
            "o.push(m.parseRange('bytes=0-1,2-3',1024));"
            "o.push(m.bytesRepr(new TextEncoder().encode('{\"error\":\"bad path\"}')));"
            "o.push(m.pyReprString('abc'));"
            "o.push(m.dumpsPy({s:'h\\u00e9llo',n:5,b:true,z:null}));"
            "o.push(m.dumpsPy(m.parseJson('{\"score\":1.0,\"n\":-3,\"e\":1e-05}')));"
            "o.push(m.contentTypeOf('a.PNG'));"
            "o.push(m.unquotePy('a%2Fb%2e%2e%2525'));"
            "console.log(JSON.stringify(o));})"
        )
        r = subprocess.run(
            [node, "--experimental-strip-types",
             "--input-type=module", "-e", probe],
            cwd=str(REPO), capture_output=True, text=True, timeout=60)
        unit_ok = False
        if r.returncode == 0:
            try:
                got = json.loads(r.stdout.strip().splitlines()[-1])
                unit_ok = (
                    got[0] == {"lo": 0, "hi": 9}
                    and got[1] == {"lo": 100, "hi": 1023}
                    and got[2] == {"lo": 1014, "hi": 1023}
                    and got[3] == {"lo": 0, "hi": 1023}
                    and got[4] is None
                    and got[5] is None
                    and got[6] is None
                    and got[7] is None
                    and got[8] == "b'{\"error\":\"bad path\"}'"
                    and got[9] == "'abc'"
                    and got[10] == ("{\n  \"s\": \"h\\u00e9llo\",\n"
                                    "  \"n\": 5,\n  \"b\": true,\n"
                                    "  \"z\": null\n}")
                    and got[11] == ("{\n  \"score\": 1.0,\n  \"n\": -3,\n"
                                    "  \"e\": 1e-05\n}")
                    and got[12] == "image/png"
                    and got[13] == "a/b..%25")
            except (ValueError, IndexError, KeyError):
                unit_ok = False
        check("assets unit vectors", unit_ok,
              (r.stderr or r.stdout)[-400:])

        # ── auth ON (reboot both with the token) ──
        reap_gateway(py_proc)
        py_proc = None
        if ts_proc is not None:
            ts_proc.terminate()
            try:
                ts_proc.wait(timeout=15)
            except subprocess.TimeoutExpired:
                ts_proc.kill()
            ts_proc = None
        py_env["DSH_GATEWAY_TOKEN"] = TOKEN
        ts_env["DSH_GATEWAY_TOKEN"] = TOKEN
        py_port, py_proc = boot_scratch_gateway(env=py_env)
        (py_root / "output" / "_ledger.jsonl").write_text(
            "\n".join(LEDGER_LINES) + "\n", encoding="utf-8")
        ts_port, ts_proc = boot_ts(ts_env)
        (ts_root / "output" / "_ledger.jsonl").write_text(
            "\n".join(LEDGER_LINES) + "\n", encoding="utf-8")
        print("auth-on py :%d vs ts :%d" % (py_port, ts_port))
        dual(py_port, ts_port, "/v1/assets", "auth off -> 401")
        dual(py_port, ts_port, cov, "auth off byte -> 401")
        dual(py_port, ts_port, "/v1/assets?token=" + TOKEN,
             "query token refused")
        dual(py_port, ts_port, "/v1/health", "health exempt")
        bad = {"Authorization": "Bearer wrong"}
        ps, pb, _ = http(py_port, "/v1/assets", headers=bad)
        ts, tb, _ = http(ts_port, "/v1/assets", headers=bad)
        check("wrong token 401",
              ps == ts == 401 and pb == tb)
        good = {"Authorization": "Bearer " + TOKEN}
        dual(py_port, ts_port, "/v1/assets", "bearer assets",
             headers=good)
        dual(py_port, ts_port, cov, "bearer bytes", headers=good)
        dual(py_port, ts_port, cov, "bearer range",
             headers={**good, "Range": "bytes=0-3"})
    finally:
        if py_proc is not None:
            reap_gateway(py_proc)
        if ts_proc is not None:
            ts_proc.terminate()
            try:
                ts_proc.wait(timeout=15)
            except subprocess.TimeoutExpired:
                ts_proc.kill()
        for name in (INAME_PNG, INAME_WEBP):
            try:
                (INPUT_DIR / name).unlink()
            except OSError:
                pass
        if base is not None:
            shutil.rmtree(str(base), ignore_errors=True)

    print("PASS %d / FAIL %d" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())

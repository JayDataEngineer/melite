#!/usr/bin/env python3
"""test_gateway_assets_parity.py — Phase-3 TS asset READ doors wall, TS-ONLY.

Pins the TypeScript asset doors (packages/gateway-doors/src/doors/assets.ts:
hAssetsIndex over the index view, hLedger over the journal tail,
hAsset as the REAL byte serve + ranges, hAssetInput as the REAL byte
serve over the uploads allowlist; static code tables from
packages/gateway/scripts/capture_assets.py probing the keeper libs)
serving the 4 asset READ doors:

  GET /v1/assets            (hAssetsIndex — dynamic JSON)
  GET /v1/ledger            (hLedger — dynamic JSON)
  GET /v1/assets/runs/*     (hAsset — REAL byte serve + ranges)
  GET /v1/assets/inputs/*   (hAssetInput — REAL byte serve)

Method: build a small FIXTURE tree at wall runtime, copy it to one TS
root (the boot appends server.boot to its journal), boot the TS
server alone via boot_scratch_gateway (MELITE_STATE_ROOT=ts_root,
ephemeral port, QUEUE LANE LAW), then pin every shape TS-only:

  - JSON doors byte-exact against the frozen goldens
    (golden_ts/test_gateway_assets_parity/, causes.md there):
    limit/run/kind/include_test/event query matrix, garbage limits,
    trailing slash, method-mismatch + unknown-path 404s, auth 401 +
    health exemption;
  - full GETs pinned by status + sha256 + length + parity headers
    against bytes.json (incl. nested rels, `_` sidecars served but
    not indexed, directory -> empty 200);
  - 17 range specs pinned against ranges.json (prefix/suffix/open/
    clamp/oversize-suffix/unsatisfiable/malformed/multi/case/hi<lo/
    -0/empty/absent + ranges IGNORED on the inputs door);
  - shape literals where the expectation is a contract, not bytes:
    ensure_ascii escapes, float 1.0 verbatim, content-length
    honesty, 206 shape, unsatisfiable-range TS full-200 (never
    416), accept-ranges announce / inputs-door absence;
  - the ?include_test=true journal side effect (parsed receipt pin)
    — ledger golden legs run BEFORE it lands;
  - node -e unit pins over doors/assets.ts (parseRange/bytesRepr/
    dumpsPy/contentTypeOf/unquotePy — the TS contract);
  - the auth gate with the token OFF (this phase) and ON (reboot
    the TS server alone: 401 shapes, wrong token, query token
    refused, /v1/health exempt, bearer 200s + bearer 206).

The inputs fixture lives in the REAL REPO/data/input (the inputs
door resolves its root from REPO, not MELITE_STATE_ROOT): unique
pid-suffixed names, removed in the finally.

ORACLE DEATH 2026-09-08: re-derived TS-ONLY — the dual-serve
py-vs-TS legs are deleted per the operator order "we do not need
parity, we need to migrate, not keep the old machinery"; the
frozen-golden + shape-literal legs below are the wall now. The
capture_assets.py --check leg stays: the capture tool probes the
keeper libs (never the retired oracle). The node -e unit legs stay:
they exercise the TS door module directly (TS-UNIT, no gateway).

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

Run: python3 tests/walls/suites/test_gateway_assets_parity.py
"""

import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

from _anchor import REPO, boot_scratch_gateway, reap_gateway

sys.dont_write_bytecode = True

PASS = FAIL = 0
TOKEN = "wall-assets-token-%d" % os.getpid()

TS_ASSETS = REPO / "packages" / "gateway-doors" / "src" / "doors" / "assets.ts"
CAPTURE = REPO / "packages" / "gateway" / "scripts" / "capture_assets.py"
INPUT_DIR = REPO / "data" / "input"
GOLDEN_DIR = (REPO / "tests" / "walls" / "suites" / "golden_ts" /
              "test_gateway_assets_parity")

INAME_PNG = "wall-assets-hero-%d.png" % os.getpid()
INAME_WEBP = "wall-assets-hero-%d.webp" % os.getpid()

PARITY_HEADERS = ("content-type", "content-length",
                  "content-range", "accept-ranges")

try:
    BYTES_MANIFEST = json.loads(
        (GOLDEN_DIR / "bytes.json").read_text(encoding="utf-8"))
    RANGES_MANIFEST = json.loads(
        (GOLDEN_DIR / "ranges.json").read_text(encoding="utf-8"))
except OSError:
    BYTES_MANIFEST = {}
    RANGES_MANIFEST = {}


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def golden(name: str) -> bytes:
    return (GOLDEN_DIR / name).read_bytes()


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


def ts_golden(port: int, path: str, name: str, golden_file: str,
              want_status: int, method: str = "GET",
              headers: dict | None = None) -> None:
    """One TS-served shape: status + body bytes vs the frozen golden."""
    st, body, h = http(port, path, method, headers)
    if st is None:
        check(name, False, "transport %r" % (body[:80],))
        return
    try:
        exp = golden(golden_file)
    except OSError as e:
        check(name, False, "golden missing %s: %s" % (golden_file, e))
        return
    ok = st == want_status and body == exp
    note = ""
    if not ok:
        note = ("status %r (want %r) golden %dB ts %dB"
                % (st, want_status, len(exp), len(body)))
        for i, (a, b) in enumerate(zip(exp, body)):
            if a != b:
                note += " first-div @%d" % i
                break
        else:
            if len(exp) != len(body):
                note += " len-div"
    check(name, ok, note)


def ts_bytes(port: int, url_path: str, manifest_key: str,
             name: str) -> None:
    """One TS-served byte door: status + sha256 + len + parity headers
    vs the frozen bytes.json entry (binaries pin by hash, never blobs)."""
    exp = BYTES_MANIFEST.get(manifest_key)
    if exp is None:
        check(name, False, "no bytes.json entry %r" % (manifest_key,))
        return
    st, body, h = http(port, url_path)
    if st is None:
        check(name, False, "transport %r" % (body[:80],))
        return
    got = {"status": st, "sha256": hashlib.sha256(body).hexdigest(),
           "len": len(body), "headers": parity_headers(h)}
    want = {"status": exp["status"], "sha256": exp["sha256"],
            "len": exp["len"], "headers": exp["headers"]}
    check(name, got == want,
          "got %r want %r" % (got, want) if got != want else "")


def ts_range(port: int, cover: str, spec: str, name: str) -> None:
    """One TS-served range shape vs the frozen ranges.json entry."""
    exp = RANGES_MANIFEST.get(spec)
    if exp is None:
        check(name, False, "no ranges.json entry %r" % (spec,))
        return
    st, body, h = http(port, cover, headers={"Range": spec})
    if st is None:
        check(name, False, "transport %r" % (body[:80],))
        return
    got = {"status": st, "sha256": hashlib.sha256(body).hexdigest(),
           "len": len(body), "headers": parity_headers(h)}
    want = {"status": exp["status"], "sha256": exp["sha256"],
            "len": exp["len"], "headers": exp["headers"]}
    check(name, got == want,
          "got %r want %r" % (got, want) if got != want else "")


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


# The JSON-door matrix: (wire path, golden file, frozen status).
# Ledger legs run BEFORE the include_test legs land (the journal
# side effect appends — the goldens below were captured before it).
JSON_MATRIX: tuple = (
    ("/v1/assets", "assets.json", 200),
    ("/v1/assets?limit=1", "assets_limit1.json", 200),
    ("/v1/assets?limit=2", "assets_limit2.json", 200),
    ("/v1/assets?limit=", "assets_limit_empty.json", 200),
    ("/v1/assets?limit=abc", "assets_limit_abc.json", 400),
    ("/v1/assets?run=run-a1", "assets_run_a1.json", 200),
    ("/v1/assets?run=nope", "assets_run_nope.json", 200),
    ("/v1/assets?run=", "assets_run_empty.json", 200),
    ("/v1/assets?kind=image", "assets_kind_image.json", 200),
    ("/v1/assets?kind=video", "assets_kind_video.json", 200),
    ("/v1/assets?kind=audio", "assets_kind_audio.json", 200),
    ("/v1/assets?kind=model", "assets_kind_model.json", 200),
    ("/v1/assets?kind=document", "assets_kind_document.json", 200),
    ("/v1/assets?kind=other", "assets_kind_other.json", 200),
    ("/v1/assets?kind=bogus", "assets_kind_bogus.json", 200),
    ("/v1/assets?kind=", "assets_kind_empty.json", 200),
    ("/v1/assets?run=run-a1&kind=image&limit=5",
     "assets_run_a1_kind_image_limit5.json", 200),
    ("/v1/assets/", "assets_slash.json", 200),
    ("/v1/ledger", "ledger.json", 200),
    ("/v1/ledger?limit=1", "ledger_limit1.json", 200),
    ("/v1/ledger?limit=0", "ledger_limit0.json", 200),
    ("/v1/ledger?limit=500", "ledger_limit500.json", 200),
    ("/v1/ledger?limit=abc", "ledger_limit_abc.json", 200),
    ("/v1/ledger?limit=2&event=run.completed",
     "ledger_limit2_event_run_completed.json", 200),
    ("/v1/ledger?event=run.completed",
     "ledger_event_run_completed.json", 200),
    ("/v1/ledger?event=note", "ledger_event_note.json", 200),
    ("/v1/ledger?event=zzz", "ledger_event_zzz.json", 200),
    ("/v1/ledger?event=", "ledger_event_empty.json", 200),
    ("/v1/ledger?event=" + "n" * 70, "ledger_event_long.json", 200),
)

# include_test legs run LAST (each truthy variant appends one
# assets.include_test row to the journal — the ledger goldens above
# were captured BEFORE any of these land).
INCLUDE_MATRIX: tuple = (
    ("/v1/assets?include_test=true", "include_test_true.json", 200),
    ("/v1/assets?include_test=1", "include_test_1.json", 200),
    ("/v1/assets?include_test=True", "include_test_True.json", 200),
    ("/v1/assets?include_test=false", "include_test_false.json", 200),
    ("/v1/assets?include_test=", "include_test_empty.json", 200),
)

# Full-GET byte doors: (wire path, bytes.json key). The inputs-hero
# slots ride logical keys — the fixture names carry the wall pid,
# the bytes do not.
BYTE_MATRIX: tuple = (
    ("/v1/assets/runs/run-a1/cover.png",
     "/v1/assets/runs/run-a1/cover.png"),
    ("/v1/assets/runs/run-a1/clip.mp4",
     "/v1/assets/runs/run-a1/clip.mp4"),
    ("/v1/assets/runs/run-a1/tone.wav",
     "/v1/assets/runs/run-a1/tone.wav"),
    ("/v1/assets/runs/run-a1/mesh.glb",
     "/v1/assets/runs/run-a1/mesh.glb"),
    ("/v1/assets/runs/run-a1/spec.json",
     "/v1/assets/runs/run-a1/spec.json"),
    ("/v1/assets/runs/run-a1/blob.bin",
     "/v1/assets/runs/run-a1/blob.bin"),
    ("/v1/assets/runs/run-a1/caf%C3%A9.png",
     "/v1/assets/runs/run-a1/caf%C3%A9.png"),
    ("/v1/assets/runs/run-a1/stage1/out.png",
     "/v1/assets/runs/run-a1/stage1/out.png"),
    ("/v1/assets/runs/run-a1/_flow.json",
     "/v1/assets/runs/run-a1/_flow.json"),
    ("/v1/assets/runs/run-a1/_poster.jpg",
     "/v1/assets/runs/run-a1/_poster.jpg"),
    ("/v1/assets/runs/run-c3/_flow.json",
     "/v1/assets/runs/run-c3/_flow.json"),
    ("/v1/assets/runs/run-d4/f.txt",
     "/v1/assets/runs/run-d4/f.txt"),
    ("/v1/assets/runs/run-a1/stage1",
     "/v1/assets/runs/run-a1/stage1"),
    ("/v1/assets/runs/run-a1",
     "/v1/assets/runs/run-a1"),
    ("/v1/assets/runs/run-a1/cover.png?x=1",
     "/v1/assets/runs/run-a1/cover.png?x=1"),
    ("/v1/assets/runs/run-a1/nope.png",
     "/v1/assets/runs/run-a1/nope.png"),
    ("/v1/assets/runs/run-a1/stage1/no/such.bin",
     "/v1/assets/runs/run-a1/stage1/no/such.bin"),
    ("/v1/assets/runs/run-a1/../../x",
     "/v1/assets/runs/run-a1/../../x"),
    ("/v1/assets/runs/%2e%2e/x",
     "/v1/assets/runs/%2e%2e/x"),
    ("/v1/assets/runs/run-a1/%zz.png",
     "/v1/assets/runs/run-a1/%zz.png"),
    ("/v1/assets/inputs/nope.png",
     "/v1/assets/inputs/nope.png"),
    ("/v1/assets/inputs/x.bin",
     "/v1/assets/inputs/x.bin"),
    ("/v1/assets/inputs/a/b.png",
     "/v1/assets/inputs/a/b.png"),
    ("/v1/assets/inputs/%2e%2e/%2e%2e/x.png",
     "/v1/assets/inputs/%2e%2e/%2e%2e/x.png"),
    ("/v1/assets/inputs/a%2Fb.png",
     "/v1/assets/inputs/a%2Fb.png"),
)

# Range specs on cover.png (1024 bytes 0..255 x4), pinned in order.
RANGE_SPECS: tuple = (
    "bytes=0-9", "bytes=100-", "bytes=-10",
    "bytes=1000-9999", "bytes=-99999", "bytes=1023-",
    "bytes=0-0", "bytes=9999-", "bytes=9999-10000",
    "bytes=5-3", "bytes=-0", "bytes=", "garbage",
    "bytes=0-1,3-4", "BYTES=0-9", "bytes = 4-7 ",
    "items=0-9",
)


def main() -> int:
    base = None
    ts_proc = None
    ts_port = 0
    try:
        # Keeper-side freshness pin (the capture tool probes the
        # keeper libs packages/gateway static tables ride on — it
        # never touches the retired serving oracle).
        r = subprocess.run(
            [sys.executable, str(CAPTURE), "--check"],
            capture_output=True, text=True, cwd=str(REPO))
        check("capture_assets.py --check fresh",
              r.returncode == 0, (r.stderr or r.stdout)[-200:])

        base = Path(tempfile.mkdtemp(prefix="wall-assets-"))
        build_fixture(base)
        write_ledger(base)
        ts_root = base / "ts-root"
        shutil.copytree(str(base / "output"), str(ts_root / "output"))

        INPUT_DIR.mkdir(parents=True, exist_ok=True)
        (INPUT_DIR / INAME_PNG).write_bytes(bytes(range(256)))
        (INPUT_DIR / INAME_WEBP).write_bytes(bytes([(i * 11) % 256
                                                    for i in range(128)]))

        ts_env = dict(os.environ)
        ts_env["MELITE_STATE_ROOT"] = str(ts_root)
        ts_env.pop("DSH_GATEWAY_TOKEN", None)
        ts_port, ts_proc = boot_scratch_gateway(env=ts_env)
        # The boot appends server.boot to the journal — rewrite the
        # deterministic fixture after the boot so the byte legs see
        # the fixture alone (ONE TS boot: ONE rewrite).
        (ts_root / "output" / "_ledger.jsonl").write_text(
            "\n".join(LEDGER_LINES) + "\n", encoding="utf-8")
        print("ts :%d" % ts_port)

        # ── JSON doors (TS vs frozen goldens) ──
        for path, slug, want in JSON_MATRIX:
            ts_golden(ts_port, path, "GET %s" % path, slug, want)

        # ensure_ascii actually escaped (not merely golden-equal).
        _, tb, _ = http(ts_port, "/v1/assets")
        check("index ensure_ascii escapes",
              "caf\\u00e9.png" in tb.decode()
              and "caf\u00e9.png" not in tb.decode())
        _, tb, _ = http(ts_port, "/v1/ledger")
        check("ledger float 1.0 verbatim", b'"score": 1.0' in tb)
        check("ledger ensure_ascii escapes",
              "h\\u00e9llo\\u2014w\\u00f6rld" in tb.decode())

        # ── byte doors: full GETs (TS vs golden hashes/bytes) ──
        for url_path, key in BYTE_MATRIX:
            ts_bytes(ts_port, url_path, key, "GET %s" % url_path)
        ts_bytes(ts_port, "/v1/assets/inputs/" + INAME_PNG,
                 "inputs_hero_png",
                 "GET /v1/assets/inputs/<hero-png>")
        ts_bytes(ts_port, "/v1/assets/inputs/" + INAME_WEBP,
                 "inputs_hero_webp",
                 "GET /v1/assets/inputs/<hero-webp>")

        # content-length honesty on a byte door (TS contract literal).
        for path in ("/v1/assets/runs/run-a1/cover.png",
                     "/v1/assets/inputs/" + INAME_PNG):
            st, body, h = http(ts_port, path)
            check("ts content-length %s" % path,
                  st == 200 and int(h.get("content-length", "-1"))
                  == len(body))

        # ── range shapes (cover.png is 1024 bytes 0..255 x4) ──
        cov = "/v1/assets/runs/run-a1/cover.png"
        for spec in RANGE_SPECS:
            ts_range(ts_port, cov, spec, "range %r" % spec)
        # Ranges are ignored on the inputs door (TS contract: always
        # the full 200 triple, no Accept-Ranges).
        exp_ignored = RANGES_MANIFEST.get("inputs_ignored")
        if exp_ignored is None:
            check("range ignored on inputs door", False,
                  "no ranges.json entry 'inputs_ignored'")
        else:
            st, body, h = http(ts_port,
                               "/v1/assets/inputs/" + INAME_PNG,
                               headers={"Range": "bytes=0-9"})
            got = {"status": st,
                   "sha256": hashlib.sha256(body).hexdigest(),
                   "len": len(body), "headers": parity_headers(h)}
            want = {"status": exp_ignored["status"],
                    "sha256": exp_ignored["sha256"],
                    "len": exp_ignored["len"],
                    "headers": exp_ignored["headers"]}
            check("range ignored on inputs door", got == want,
                  "got %r want %r" % (got, want) if got != want else "")
        _, _, th = http(ts_port, "/v1/assets/inputs/" + INAME_PNG,
                        headers={"Range": "bytes=0-9"})
        check("inputs door sends no accept-ranges",
              "accept-ranges" not in th)
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
        check("unsatisfiable range is TS full-200 (no 416)",
              st == 200 and len(body) == 1024)

        # ── method arms + unknown (TS vs frozen goldens) ──
        ts_golden(ts_port, "/v1/assets", "POST /v1/assets",
                  "post_assets.json", 404, method="POST")
        ts_golden(ts_port, cov, "POST byte door",
                  "post_bytes.json", 404, method="POST")
        ts_golden(ts_port, "/v1/does-not-exist-xyz",
                  "unknown path 404", "unknown_404.json", 404)

        # ── include_test LAST (it appends to the journal) ──
        for path, slug, want in INCLUDE_MATRIX:
            ts_golden(ts_port, path, "GET %s" % path, slug, want)
        _, body, _ = http(ts_port, "/v1/ledger?limit=500")
        try:
            doc = json.loads(body.decode())
            last = doc["entries"][-1]
            ok = (last["event"] == "assets.include_test"
                  and last["data"] == {"limit": 200})
        except (ValueError, KeyError, IndexError):
            ok = False
        check("ts include_test journal receipt", ok)

        # ── unit pins (node -e over doors/assets.ts — TS-UNIT, kept:
        # they exercise the TS door module directly, never a server) ──
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

        # ── auth ON (reboot the TS server alone with the token) ──
        reap_gateway(ts_proc)
        ts_proc = None
        ts_env["DSH_GATEWAY_TOKEN"] = TOKEN
        ts_port, ts_proc = boot_scratch_gateway(env=ts_env)
        (ts_root / "output" / "_ledger.jsonl").write_text(
            "\n".join(LEDGER_LINES) + "\n", encoding="utf-8")
        print("auth-on ts :%d" % ts_port)
        ts_golden(ts_port, "/v1/assets", "auth off -> 401",
                  "auth_401.json", 401)
        ts_golden(ts_port, cov, "auth off byte -> 401",
                  "auth_401.json", 401)
        ts_golden(ts_port, "/v1/assets?token=" + TOKEN,
                  "query token refused", "auth_401.json", 401)
        ts_golden(ts_port, "/v1/health", "health exempt",
                  "auth_health.json", 200)
        bad = {"Authorization": "Bearer wrong"}
        st, body, _ = http(ts_port, "/v1/assets", headers=bad)
        try:
            exp401 = golden("auth_401.json")
        except OSError:
            exp401 = b""
        check("wrong token 401",
              st == 401 and body == exp401)
        good = {"Authorization": "Bearer " + TOKEN}
        ts_golden(ts_port, "/v1/assets", "bearer assets",
                  "assets.json", 200, headers=good)
        st, body, h = http(ts_port, cov, headers=good)
        exp_cov = BYTES_MANIFEST.get(
            "/v1/assets/runs/run-a1/cover.png", {})
        check("bearer bytes",
              st == 200
              and hashlib.sha256(body).hexdigest() == exp_cov.get("sha256")
              and len(body) == exp_cov.get("len")
              and parity_headers(h) == exp_cov.get("headers"),
              "status %r len %d" % (st, len(body)))
        st, body, h = http(ts_port, cov,
                           headers={**good, "Range": "bytes=0-3"})
        check("bearer range",
              st == 206 and body == bytes((0, 1, 2, 3))
              and h.get("content-range") == "bytes 0-3/1024"
              and int(h.get("content-length", "-1")) == 4,
              "status %r len %d" % (st, len(body)))
    finally:
        if ts_proc is not None:
            reap_gateway(ts_proc)
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

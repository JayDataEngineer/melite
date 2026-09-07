#!/usr/bin/env python3
"""test_gateway_uploads_parity.py — POST /v1/uploads TS parity wall (P3).

Proves the TypeScript write door (plugins/gateway/src/doors/uploads.ts
via ctx.ts dispatch) answers byte-identical to the py gateway
(py/gateway.py _h_uploads, 3734-3768; strict body 4335-4340; R4.2
normalization 4353-4355; auth gate _adapt 2607-2619):

  small-file byte-equal round-trip (response shape {path, bytes} +
    staged bytes under data/input/), oversize refusal shape, mime
    refusal, malformed/bad-base64 refusals, missing-field refusals,
    bad-JSON shape, content-type-ignored parity (py never consults
    the request content-type — a multipart body refuses as bad
    JSON), traversal NEUTRALIZATION parity (py has NO explicit
    traversal guard: safety is by construction — Path.stem +
    [^A-Za-z0-9_-] sanitization, 3762-3763 — so hostile names 200
    with flat names, never a refusal), method-mismatch 404, and the
    auth-gate 401 shape.

Dual-serve on ONE fixture temp root: py runs in-process through
gateway.route with gateway.REPO monkeypatched at the hermetic tmp
(the door resolves REPO / "data" / "input" at call time, 3764); the
TS server boots over HTTP with MELITE_REPO_ROOT pointing at the
same tmp (the door's only env seam — default resolution is the
py-identical source-file-relative root). Both stages share the
tmp/data/input tree, so the wall reads back staged bytes directly.

KNOWN divergences (asserted as shape, not bytes):
  - bad-JSON error TEXT embeds the host JSON parser's message
    (CPython JSONDecodeError vs V8 SyntaxError) — status 400 +
    code bad_json + "bad JSON: " prefix must agree.
  - 200 paths carry a random uuid suffix per upload — shape
    (regex + staged-bytes equality) must agree, not the string.
  - invalid-UTF-8 bodies: py raises UnicodeDecodeError (500-class);
    TS decodes lossy. Untested — nobody sends invalid UTF-8.

Run: python3 tests/walls/suites/test_gateway_uploads_parity.py
"""

import asyncio
import base64
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

from _anchor import REPO

sys.dont_write_bytecode = True
sys.path.insert(0, str(REPO / "py"))

import gateway as gwmod  # noqa: E402
from gateway import route as py_route  # noqa: E402

PASS = FAIL = 0

TOKEN = "uploads-parity-token"
TS_SERVER = REPO / "plugins" / "gateway" / "src" / "server.ts"

PATH_RE = re.compile(r"^data/input/[A-Za-z0-9_-]{1,48}-[0-9a-f]{8}\.(png|jpg|webp)$")

# 1x1 transparent PNG + 4 arbitrary bytes (the door validates the
# MIME STRING + base64, never magic — content is opaque).
RAW_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk"
    "+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")
RAW_JPG = b"\xff\xd8\xff\xe0JFIF"


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def py_wire(method: str, target: str, body: bytes) -> tuple[int, bytes]:
    """Fresh py expectation: live route() + R4.2 + _adapt serialization."""
    status, payload = asyncio.run(py_route(None, method, target, body))
    if 400 <= status < 500 and isinstance(payload, dict) \
            and "code" not in payload:
        payload["code"] = "invalid_request"
    return status, json.dumps(payload, indent=2, default=str).encode()


def py_401_bytes() -> bytes:
    """The _adapt auth refusal (gateway.py:2612-2619), byte-exact."""
    return json.dumps({
        "error": "unauthorized: missing or invalid bearer token "
                 "(Authorization: Bearer <token>; set DSH_GATEWAY_TOKEN "
                 "to enable)"}, indent=2).encode()


def ts_call(port: int, path: str, body: bytes = b"",
            content_type: str = "application/json",
            auth: str | None = TOKEN,
            method: str = "POST") -> tuple[int | None, bytes, str]:
    headers = {"Content-Type": content_type}
    if auth is not None:
        headers["Authorization"] = "Bearer " + auth
    req = urllib.request.Request(
        "http://127.0.0.1:%d%s" % (port, path),
        data=body if method in ("POST", "PUT", "PATCH") else None,
        headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return r.status, r.read(), r.headers.get("content-type", "")
    except urllib.error.HTTPError as e:
        return e.code, e.read(), e.headers.get("content-type", "")
    except Exception as e:
        return None, b"", "transport: %s" % e


def boot_ts(tmp: str) -> tuple[int, "subprocess.Popen[str]"]:
    import shutil as _sh
    node = _sh.which("node")
    if node is None:
        raise RuntimeError("node not on PATH")
    env = dict(os.environ)
    env["MELITE_REPO_ROOT"] = tmp
    env["DSH_GATEWAY_TOKEN"] = TOKEN
    proc = subprocess.Popen(
        [node, "--experimental-strip-types", str(TS_SERVER)],
        cwd=str(REPO), env=env,
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        text=True, start_new_session=True)
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


def doc_bytes(doc: object) -> bytes:
    return json.dumps(doc).encode()


def input_files(tmp: str) -> list[str]:
    d = os.path.join(tmp, "data", "input")
    if not os.path.isdir(d):
        return []
    return sorted(os.listdir(d))


def main() -> int:
    tmp = tempfile.mkdtemp(prefix="uploads-parity-")
    orig_repo = gwmod.REPO
    gwmod.REPO = __import__("pathlib").Path(tmp)  # hermetic REPO for py
    proc: subprocess.Popen[str] | None = None
    try:
        try:
            port, proc = boot_ts(tmp)
        except RuntimeError as e:
            print("FATAL: %s" % e)
            return 1
        print("ts uploads on :%d (root %s)" % (port, tmp))
        body_of = "POST /v1/uploads"

        # ── 1. small-file byte-equal round-trip (png) ──
        doc = {"filename": "shot.png",
               "data": "data:image/png;base64,"
                       + base64.b64encode(RAW_PNG).decode()}
        exp_st, exp_b = py_wire("POST", "/v1/uploads", doc_bytes(doc))
        got_st, got_b, ctype = ts_call(port, "/v1/uploads", doc_bytes(doc))
        if got_st is None:
            check("png round-trip transport", False, got_b.decode()[:120])
        else:
            # Random uuid suffix per side — compare parsed shape, then
            # staged bytes on disk for BOTH staged names.
            try:
                exp_j = json.loads(exp_b)
                got_j = json.loads(got_b)
            except ValueError:
                exp_j = got_j = None
            shape_ok = (
                exp_st == got_st == 200
                and isinstance(exp_j, dict) and isinstance(got_j, dict)
                and set(exp_j) == set(got_j) == {"path", "bytes"}
                and exp_j["bytes"] == got_j["bytes"] == len(RAW_PNG)
                and bool(PATH_RE.match(exp_j["path"]))
                and bool(PATH_RE.match(got_j["path"]))
                and ctype.split(";")[0] == "application/json")
            disk_ok = False
            if shape_ok:
                try:
                    with open(os.path.join(tmp, exp_j["path"]), "rb") as f:
                        py_disk = f.read()
                    with open(os.path.join(tmp, got_j["path"]), "rb") as f:
                        ts_disk = f.read()
                    disk_ok = py_disk == ts_disk == RAW_PNG
                except OSError:
                    disk_ok = False
            check("png round-trip (shape + staged bytes)",
                  bool(shape_ok and disk_ok),
                  "st %r/%r ctype %r shape %r disk %r"
                  % (got_st, exp_st, ctype, shape_ok, disk_ok))

        # ── 2. mime → ext mapping (jpeg→.jpg, webp→.webp) ──
        for mime, want_ext, raw in (
                ("image/jpeg", ".jpg", RAW_JPG),
                ("image/webp", ".webp", RAW_PNG)):
            doc = {"filename": "pic",
                   "data": "data:%s;base64,%s"
                           % (mime, base64.b64encode(raw).decode())}
            exp_st, exp_b = py_wire("POST", "/v1/uploads", doc_bytes(doc))
            got_st, got_b, _ = ts_call(port, "/v1/uploads", doc_bytes(doc))
            try:
                got_j = json.loads(got_b)
            except ValueError:
                got_j = {}
            # Success bodies differ ONLY in the random uuid suffix, so
            # byte-equality is not expected — shape + ext + disk bytes.
            ok = (exp_st == got_st == 200
                  and isinstance(got_j, dict)
                  and got_j.get("path", "").endswith(want_ext)
                  and got_j.get("bytes") == len(raw))
            disk_ok = False
            if ok and isinstance(got_j, dict) and got_j.get("path"):
                try:
                    with open(os.path.join(tmp, got_j["path"]), "rb") as f:
                        disk_ok = f.read() == raw
                except OSError:
                    pass
            check("%s stages as *%s" % (mime, want_ext),
                  bool(ok and disk_ok), "st %r/%r" % (got_st, exp_st))

        # ── 3. oversize refusal shape (20 MiB + 1 decoded) ──
        big = b"\x00" * (20 * 1024 * 1024 + 1)
        doc = {"filename": "big.png",
               "data": "data:image/png;base64,"
                       + base64.b64encode(big).decode()}
        before = set(input_files(tmp))
        raw_body = doc_bytes(doc)
        del doc
        exp_st, exp_b = py_wire("POST", "/v1/uploads", raw_body)
        got_st, got_b, _ = ts_call(port, "/v1/uploads", raw_body)
        after = set(input_files(tmp))
        check("oversize refusal (byte-equal, nothing staged)",
              exp_st == got_st == 400 and got_b == exp_b
              and after == before,
              "st %r/%r py %dB ts %dB staged+%d"
              % (got_st, exp_st, len(exp_b), len(got_b),
                 len(after - before)))
        del big, raw_body

        # ── 4. content-type ignored parity (py never consults it) ──
        doc = {"filename": "ct.png",
               "data": "data:image/png;base64,"
                       + base64.b64encode(RAW_PNG).decode()}
        exp_st, _ = py_wire("POST", "/v1/uploads", doc_bytes(doc))
        got_st, got_b, _ = ts_call(port, "/v1/uploads", doc_bytes(doc),
                                   content_type="text/plain")
        try:
            got_j = json.loads(got_b)
        except ValueError:
            got_j = {}
        check("wrong content-type still 200 (ignored, not refused)",
              exp_st == got_st == 200 and got_j.get("bytes") == len(RAW_PNG),
              "st %r/%r" % (got_st, exp_st))
        # A real multipart body: no multipart parsing in py (strict
        # JSON only) — both refuse as bad JSON (code parity; parser
        # TEXT differs per language).
        multi = (b'--b\r\nContent-Disposition: form-data; name="filename"\r\n\r\n'
                 b'a.png\r\n--b--\r\n')
        exp_st, exp_b = py_wire("POST", "/v1/uploads", multi)
        got_st, got_b, _ = ts_call(
            port, "/v1/uploads", multi, content_type="multipart/form-data; boundary=b")
        try:
            exp_j, got_j = json.loads(exp_b), json.loads(got_b)
        except ValueError:
            exp_j = got_j = {}
        check("multipart body refuses as bad JSON (no multipart door)",
              exp_st == got_st == 400
              and exp_j.get("code") == got_j.get("code") == "bad_json"
              and str(exp_j.get("error", "")).startswith("bad JSON: ")
              and str(got_j.get("error", "")).startswith("bad JSON: "),
              "st %r/%r" % (got_st, exp_st))

        # ── 5. missing-field / malformed refusals (byte-equal) ──
        b64 = base64.b64encode(RAW_PNG).decode()
        refusal_docs: list[tuple[str, object]] = [
            ("empty object → filename required", {}),
            ("missing data → data: URL required", {"filename": "x.png"}),
            ("non-data: URL refused", {"filename": "x.png",
                                       "data": "http://h/x.png"}),
            ("data: without comma refused",
             {"filename": "x.png", "data": "data:image/png;base64"}),
            ("non-object body refused", []),
            ("non-string filename refused",
             {"filename": 123, "data": "data:image/png;base64," + b64}),
            ("blank filename refused",
             {"filename": "   ", "data": "data:image/png;base64," + b64}),
            ("gif mime refused",
             {"filename": "a.gif", "data": "data:image/gif;base64," + b64}),
            ("empty mime refused",
             {"filename": "a.png", "data": "data:;base64," + b64}),
            ("bad base64 refused",
             {"filename": "a.png", "data": "data:image/png;base64,!!!"}),
            ("whitespace base64 refused",
             {"filename": "a.png",
              "data": "data:image/png;base64,ab\ncd"}),
        ]
        for name, doc in refusal_docs:
            exp_st, exp_b = py_wire("POST", "/v1/uploads", doc_bytes(doc))
            got_st, got_b, _ = ts_call(port, "/v1/uploads", doc_bytes(doc))
            check(name, exp_st == got_st == 400 and got_b == exp_b,
                  "st %r/%r py %r ts %r"
                  % (got_st, exp_st, exp_b[:80], got_b[:80]))

        # bad JSON bytes: status + code + prefix parity (parser text differs).
        exp_st, exp_b = py_wire("POST", "/v1/uploads", b"{nope")
        got_st, got_b, _ = ts_call(port, "/v1/uploads", b"{nope")
        try:
            exp_j, got_j = json.loads(exp_b), json.loads(got_b)
        except ValueError:
            exp_j = got_j = {}
        check("bad JSON shape (code, not parser text)",
              exp_st == got_st == 400
              and exp_j.get("code") == got_j.get("code") == "bad_json"
              and str(exp_j.get("error", "")).startswith("bad JSON: ")
              and str(got_j.get("error", "")).startswith("bad JSON: "),
              "st %r/%r" % (got_st, exp_st))

        # empty base64 → 0-byte stage, 200 both (parity, shape).
        doc = {"filename": "empty.png", "data": "data:image/png;base64,"}
        exp_st, _ = py_wire("POST", "/v1/uploads", doc_bytes(doc))
        got_st, got_b, _ = ts_call(port, "/v1/uploads", doc_bytes(doc))
        try:
            got_j = json.loads(got_b)
        except ValueError:
            got_j = {}
        check("empty base64 stages 0 bytes",
              exp_st == got_st == 200 and got_j.get("bytes") == 0,
              "st %r/%r" % (got_st, exp_st))

        # ── 6. traversal NEUTRALIZATION (no refusal in py — cite
        #         3762-3763: stem+sanitize by construction) ──
        before_all = set(input_files(tmp))
        for hostile in ("../../evil.png", "/abs/path.png", "a/b/c.png",
                        "..\\win.png"):
            doc = {"filename": hostile,
                   "data": "data:image/png;base64," + b64}
            exp_st, exp_b = py_wire("POST", "/v1/uploads", doc_bytes(doc))
            got_st, got_b, _ = ts_call(port, "/v1/uploads", doc_bytes(doc))
            try:
                exp_j, got_j = json.loads(exp_b), json.loads(got_b)
            except ValueError:
                exp_j = got_j = {}
            flat_ok = (
                exp_st == got_st == 200
                and bool(PATH_RE.match(exp_j.get("path", "")))
                and bool(PATH_RE.match(got_j.get("path", ""))))
            check("hostile name %r → flat stage (no refusal)" % hostile,
                  flat_ok, "st %r/%r" % (got_st, exp_st))
        # Nothing escaped data/input: every file under tmp lives in it.
        escaped = []
        for root, _ds, fs in os.walk(tmp):
            for f in fs:
                rel = os.path.relpath(os.path.join(root, f), tmp)
                if not rel.startswith("data" + os.sep + "input" + os.sep):
                    escaped.append(rel)
        check("no staged file outside data/input", escaped == [],
              "escaped=%r" % escaped[:3])
        check("traversal stages landed flat",
              len(set(input_files(tmp)) - before_all) == 8,
              "new=%d" % len(set(input_files(tmp)) - before_all))

        # ── 7. method mismatch: GET on the POST door → 404 both ──
        exp_st, exp_b = py_wire("GET", "/v1/uploads", b"")
        got_st, got_b, _ = ts_call(port, "/v1/uploads", b"", method="GET")
        check("GET /v1/uploads 404 shape",
              exp_st == got_st == 404 and got_b == exp_b,
              "st %r/%r" % (got_st, exp_st))

        # ── 8. auth-gate parity (401 shape; exempt health untouched) ──
        want_401 = py_401_bytes()
        got_st, got_b, _ = ts_call(port, "/v1/uploads", b"{}", auth=None)
        check("no token → 401 shape",
              got_st == 401 and got_b == want_401,
              "st %r %r" % (got_st, got_b[:80]))
        got_st, got_b, _ = ts_call(port, "/v1/uploads", b"{}", auth="wrong")
        check("wrong token → 401 shape",
              got_st == 401 and got_b == want_401,
              "st %r %r" % (got_st, got_b[:80]))
        got_st, _, _ = ts_call(port, "/v1/health", b"", method="GET",
                               auth=None)
        check("health exempt without token", got_st == 200,
              "st %r" % got_st)
    finally:
        if proc is not None:
            proc.terminate()
            try:
                proc.wait(timeout=15)
            except subprocess.TimeoutExpired:
                proc.kill()
        gwmod.REPO = orig_repo
        shutil.rmtree(tmp, ignore_errors=True)

    print("PASS %d / FAIL %d" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())

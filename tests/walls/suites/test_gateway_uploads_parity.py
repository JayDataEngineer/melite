#!/usr/bin/env python3
"""test_gateway_uploads_parity.py — POST /v1/uploads TS wall (P3), TS-ONLY.

Pins the TypeScript write door (packages/gateway-doors/src/doors/uploads.ts
via ctx.ts dispatch):

  small-file round-trip (response shape {path, bytes} + staged
    bytes under data/input/), oversize refusal bytes, mime
    refusal bytes, malformed/bad-base64 refusal bytes,
    missing-field refusal bytes, bad-JSON shape,
    content-type-ignored behavior (the door never consults the
    request content-type — a multipart body refuses as bad JSON),
    traversal NEUTRALIZATION (safety is by construction — stem +
    [^A-Za-z0-9_-] sanitization — so hostile names 200 with flat
    names, never a refusal), method-mismatch 404 bytes, and the
    auth-gate 401 shape.

TS-only boot on ONE fixture temp root: the TS server boots over
HTTP with MELITE_REPO_ROOT pointing at the tmp (the door's only
env seam) and a disjoint scratch MELITE_STATE_ROOT; the wall reads
back staged bytes directly from tmp/data/input.

Byte legs pin frozen goldens (golden_ts/test_gateway_uploads_parity/,
causes.md there); shape legs pin literals:

  - bad-JSON error TEXT embeds the host JSON parser's message (V8
    SyntaxError) — status 400 + code bad_json + "bad JSON: " prefix.
  - 200 paths carry a random uuid suffix per upload — shape (regex
    + staged-bytes equality), not the string.
  - invalid-UTF-8 bodies: TS decodes lossy. Untested — nobody sends
    invalid UTF-8.

ORACLE DEATH 2026-09-08: re-derived TS-ONLY — the py-mirror legs
(live py dispatcher expectations served in-process) are deleted per
the operator order "we do not need parity, we need to migrate, not
keep the old machinery"; the TS-SSOT golden + shape legs below are
the wall now.

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

Run: python3 tests/walls/suites/test_gateway_uploads_parity.py
"""

import base64
import json
import os
import re
import shutil
import sys
import tempfile
import urllib.error
import urllib.request

from _anchor import REPO, boot_scratch_gateway, reap_gateway

sys.dont_write_bytecode = True

PASS = FAIL = 0

TOKEN = "uploads-parity-token"
TS_SERVER = REPO / "apps" / "gateway" / "src" / "main.ts"
GOLDEN_DIR = (REPO / "tests" / "walls" / "suites" / "golden_ts" /
              "test_gateway_uploads_parity")

PATH_RE = re.compile(r"^data/input/[A-Za-z0-9_-]{1,48}-[0-9a-f]{8}\.(png|jpg|webp)$")

# 1x1 transparent PNG + 4 arbitrary bytes (the door validates the
# MIME STRING + base64, never magic — content is opaque).
RAW_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk"
    "+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")
RAW_JPG = b"\xff\xd8\xff\xe0JFIF"

B64 = base64.b64encode(RAW_PNG).decode()

# Byte-pinned refusal corpus: (slug, doc). The slug names the golden
# file (<slug>.json); the doc is sent as json.dumps(doc).encode().
REFUSALS: list[tuple[str, object]] = [
    ("empty-object", {}),
    ("missing-data", {"filename": "x.png"}),
    ("non-data-url", {"filename": "x.png",
                      "data": "http://h/x.png"}),
    ("data-without-comma", {"filename": "x.png",
                            "data": "data:image/png;base64"}),
    ("non-object-body", []),
    ("non-string-filename", {"filename": 123,
                             "data": "data:image/png;base64," + B64}),
    ("blank-filename", {"filename": "   ",
                        "data": "data:image/png;base64," + B64}),
    ("gif-mime", {"filename": "a.gif",
                  "data": "data:image/gif;base64," + B64}),
    ("empty-mime", {"filename": "a.png",
                    "data": "data:;base64," + B64}),
    ("bad-base64", {"filename": "a.png",
                    "data": "data:image/png;base64,!!!"}),
    ("whitespace-base64", {"filename": "a.png",
                           "data": "data:image/png;base64,ab\ncd"}),
]

REFUSAL_NAMES = (
    "empty object → filename required",
    "missing data → data: URL required",
    "non-data: URL refused",
    "data: without comma refused",
    "non-object body refused",
    "non-string filename refused",
    "blank filename refused",
    "gif mime refused",
    "empty mime refused",
    "bad base64 refused",
    "whitespace base64 refused",
)


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def golden(name: str) -> bytes:
    return (GOLDEN_DIR / name).read_bytes()


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


def doc_bytes(doc: object) -> bytes:
    return json.dumps(doc).encode()


def input_files(tmp: str) -> list[str]:
    d = os.path.join(tmp, "data", "input")
    if not os.path.isdir(d):
        return []
    return sorted(os.listdir(d))


def main() -> int:
    tmp = tempfile.mkdtemp(prefix="uploads-parity-")
    proc = None
    try:
        import os as _os
        env = dict(_os.environ)
        env["MELITE_REPO_ROOT"] = tmp
        env["DSH_GATEWAY_TOKEN"] = TOKEN
        try:
            port, proc = boot_scratch_gateway(env=env)
        except RuntimeError as e:
            print("FATAL: %s" % e)
            return 1
        print("ts uploads on :%d (root %s)" % (port, tmp))

        # ── 1. small-file round-trip (png): shape + staged bytes ──
        doc = {"filename": "shot.png",
               "data": "data:image/png;base64,"
                       + base64.b64encode(RAW_PNG).decode()}
        got_st, got_b, ctype = ts_call(port, "/v1/uploads", doc_bytes(doc))
        if got_st is None:
            check("png round-trip transport", False, got_b.decode()[:120])
        else:
            # Random uuid suffix per upload — parsed shape, then the
            # staged bytes on disk.
            try:
                got_j = json.loads(got_b)
            except ValueError:
                got_j = None
            shape_ok = (
                got_st == 200
                and isinstance(got_j, dict)
                and set(got_j) == {"path", "bytes"}
                and got_j["bytes"] == len(RAW_PNG)
                and bool(PATH_RE.match(got_j["path"]))
                and ctype.split(";")[0] == "application/json")
            disk_ok = False
            if shape_ok:
                try:
                    with open(os.path.join(tmp, got_j["path"]), "rb") as f:
                        ts_disk = f.read()
                    disk_ok = ts_disk == RAW_PNG
                except OSError:
                    disk_ok = False
            check("png round-trip (shape + staged bytes)",
                  bool(shape_ok and disk_ok),
                  "st %r ctype %r shape %r disk %r"
                  % (got_st, ctype, shape_ok, disk_ok))

        # ── 2. mime → ext mapping (jpeg→.jpg, webp→.webp) ──
        for mime, want_ext, raw in (
                ("image/jpeg", ".jpg", RAW_JPG),
                ("image/webp", ".webp", RAW_PNG)):
            doc = {"filename": "pic",
                   "data": "data:%s;base64,%s"
                           % (mime, base64.b64encode(raw).decode())}
            got_st, got_b, _ = ts_call(port, "/v1/uploads", doc_bytes(doc))
            try:
                got_j = json.loads(got_b)
            except ValueError:
                got_j = {}
            ok = (got_st == 200
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
                  bool(ok and disk_ok), "st %r" % (got_st,))

        # ── 3. oversize refusal bytes (20 MiB + 1 decoded) ──
        big = b"\x00" * (20 * 1024 * 1024 + 1)
        doc = {"filename": "big.png",
               "data": "data:image/png;base64,"
                       + base64.b64encode(big).decode()}
        before = set(input_files(tmp))
        raw_body = doc_bytes(doc)
        del doc
        exp_b = golden("oversize.json")
        got_st, got_b, _ = ts_call(port, "/v1/uploads", raw_body)
        after = set(input_files(tmp))
        check("oversize refusal (golden bytes, nothing staged)",
              got_st == 400 and got_b == exp_b
              and after == before,
              "st %r golden %dB ts %dB staged+%d"
              % (got_st, len(exp_b), len(got_b),
                 len(after - before)))
        del big, raw_body

        # ── 4. content-type ignored (the door never consults it) ──
        doc = {"filename": "ct.png",
               "data": "data:image/png;base64,"
                       + base64.b64encode(RAW_PNG).decode()}
        got_st, got_b, _ = ts_call(port, "/v1/uploads", doc_bytes(doc),
                                   content_type="text/plain")
        try:
            got_j = json.loads(got_b)
        except ValueError:
            got_j = {}
        check("wrong content-type still 200 (ignored, not refused)",
              got_st == 200 and got_j.get("bytes") == len(RAW_PNG),
              "st %r" % (got_st,))
        # A real multipart body: no multipart parsing (strict JSON
        # only) — refuses as bad JSON (code parity; the parser TEXT
        # is the host engine's).
        multi = (b'--b\r\nContent-Disposition: form-data; name="filename"\r\n\r\n'
                 b'a.png\r\n--b--\r\n')
        got_st, got_b, _ = ts_call(
            port, "/v1/uploads", multi, content_type="multipart/form-data; boundary=b")
        try:
            got_j = json.loads(got_b)
        except ValueError:
            got_j = {}
        check("multipart body refuses as bad JSON (no multipart door)",
              got_st == 400
              and got_j.get("code") == "bad_json"
              and str(got_j.get("error", "")).startswith("bad JSON: "),
              "st %r" % (got_st,))

        # ── 5. missing-field / malformed refusals (golden bytes) ──
        for (slug, doc), name in zip(REFUSALS, REFUSAL_NAMES):
            exp_b = golden(slug + ".json")
            got_st, got_b, _ = ts_call(port, "/v1/uploads", doc_bytes(doc))
            check(name, got_st == 400 and got_b == exp_b,
                  "st %r golden %r ts %r"
                  % (got_st, exp_b[:80], got_b[:80]))

        # bad JSON bytes: status + code + prefix (parser text differs).
        got_st, got_b, _ = ts_call(port, "/v1/uploads", b"{nope")
        try:
            got_j = json.loads(got_b)
        except ValueError:
            got_j = {}
        check("bad JSON shape (code, not parser text)",
              got_st == 400
              and got_j.get("code") == "bad_json"
              and str(got_j.get("error", "")).startswith("bad JSON: "),
              "st %r" % (got_st,))

        # empty base64 → 0-byte stage, 200.
        doc = {"filename": "empty.png", "data": "data:image/png;base64,"}
        got_st, got_b, _ = ts_call(port, "/v1/uploads", doc_bytes(doc))
        try:
            got_j = json.loads(got_b)
        except ValueError:
            got_j = {}
        check("empty base64 stages 0 bytes",
              got_st == 200 and got_j.get("bytes") == 0,
              "st %r" % (got_st,))

        # ── 6. traversal NEUTRALIZATION (no refusal — stem+sanitize
        #         by construction) ──
        before_all = set(input_files(tmp))
        for hostile in ("../../evil.png", "/abs/path.png", "a/b/c.png",
                        "..\\win.png"):
            doc = {"filename": hostile,
                   "data": "data:image/png;base64," + B64}
            got_st, got_b, _ = ts_call(port, "/v1/uploads", doc_bytes(doc))
            try:
                got_j = json.loads(got_b)
            except ValueError:
                got_j = {}
            flat_ok = (
                got_st == 200
                and bool(PATH_RE.match(got_j.get("path", ""))))
            check("hostile name %r → flat stage (no refusal)" % hostile,
                  flat_ok, "st %r" % (got_st,))
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
              len(set(input_files(tmp)) - before_all) == 4,
              "new=%d" % len(set(input_files(tmp)) - before_all))

        # ── 7. method mismatch: GET on the POST door → 404 golden ──
        exp_b = golden("get-404.json")
        got_st, got_b, _ = ts_call(port, "/v1/uploads", b"", method="GET")
        check("GET /v1/uploads 404 shape",
              got_st == 404 and got_b == exp_b,
              "st %r" % (got_st,))

        # ── 8. auth-gate (401 shape literal; health exempt) ──
        want_401 = json.dumps({
            "error": "unauthorized: missing or invalid bearer token "
                     "(Authorization: Bearer <token>; set DSH_GATEWAY_TOKEN "
                     "to enable)"}, indent=2).encode()
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
            reap_gateway(proc)
        shutil.rmtree(tmp, ignore_errors=True)

    print("PASS %d / FAIL %d" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())

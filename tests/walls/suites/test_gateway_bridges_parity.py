#!/usr/bin/env python3
"""test_gateway_bridges_parity.py — P6 bridges TS wall.

Pins the TypeScript bridge doors (packages/gateway-doors/src/doors/
bridges.ts via the ctx.ts seam: POST /v1/manage → the manage
subprocess bridge, GET|POST ^/poser/ → the studio forward) against
their verbatim TS-side contracts — every leg TS-vs-literal (status
+ parsed body against the frozen expectation, or verbatim stub-owned
bytes for the passthrough legs):

  Phase A — poser forward (TS boot against a scripted stdlib stub
    upstream): 200 JSON + query preservation, POST echo (body bytes
    + stamped content-type), binary bytes + non-JSON content-type,
    upstream 404/400/500 refusals passed through VERBATIM (status +
    bytes + content-type, no R4.2 code injected — byte doors skip
    the dict-only rule), method-mismatch 404, auth 401 + the
    /v1/health exemption.
  Phase B — manage envelopes (TS boot): bad-JSON 400 shape,
    list-body 500 shape (keys), method-mismatch 404 literal; the
    dispatch legs (unknown-action 422s, unknown-model 404, status
    200, trailing-slash normalization) pin the CURRENT runner shape
    — see the RUNNER CAUSE note below.
  Phase C — poser config legs (configs rewritten mid-run; the TS
    gateway resolves per request): zero-url 502 literal, two-url
    502 literal (sorted-names repr), stub-down 502 shape (prefix
    through "(" — the errno tail is host-shaped), garbage-scheme
    502 literal, missing-file 500 shape (keys).
  Phase D — manage plane-unavailable templates (TS-only boots,
    pinned byte-exact): bogus MELITE_MANAGE_PYTHON → 503 echoing
    the path; node-as-python → 502 runner-failed; resolveManagePython
    unit probe.

RUNNER CAUSE — RESOLVED (2026-09-08): the TS manage bridge's
managePyDirs() pointed at the dead <repo>/py tier after the python/
rename; every dispatch leg answered 502 "manage runner failed" and
the pre-fix pins (Stage A) pinned that broken envelope as current
bytes. The fix stroke (same day) repointed managePyDirs at
<repo>/python/ and re-pinned these legs to the REAL 422/404/200
dispatch shapes (loose on pydantic/live text, strict on envelope:
action echo + ok + code + data). Phase D still pins the genuine
plane-unavailable templates (503/502) — those are design, not bug.
NEVER soften pins to status-only.

Forward/envelope decisions under test (TS cites):
  - poser target = the ONE engines.<name>.url in
    inference.config.json (bridges.ts resolvePoserBase); 0/2+ → the
    loud 502; forward = base.rstrip("/")+target incl. query with
    content-type stamped iff body; upstream errors pass status+body
    +ctype through; transport failure → 502 unreachable; other →
    502 Name: msg.
  - manage = the base-env runner shape always (bridges.ts
    handleManage): stdin = the parsed doc, stdout last line =
    [code, rep]; missing python → 503; rc!=0/empty → 502 + last-500
    stderr; timeout → 504.
  - auth gates both doors before dispatch (core/errors.ts
    authRefusal); /v1/health is the only exemption.

Hermetic discipline: the stub is a stdlib ThreadingHTTPServer in
THIS process; the TS server boots on a scratch port with
MELITE_REPO_ROOT at a fixture tree carrying an identical
inference.config.json and its own MELITE_STATE_ROOT. Manage NEVER
mutates: the battery uses refusals (502/500/400), the read-only
status probe, and template pins — no installs, downloads, lifecycle,
or snapshots run.

TS CONTRACT pins (asserted as shape, not bytes):
  - bad-JSON TEXT embeds the host parser's message (V8
    SyntaxError) — status + code + prefix.
  - list-body 500 TEXT embeds the host traceback — status + keys.
  - unreachable TAIL (node errno prose) — status + prefix through
    "("; the schemeless-base leg is pinned exact (TS TypeError,
    same status).
  - missing-config 500 TEXT embeds the host traceback — status +
    keys.

ORACLE DEATH 2026-09-08 (operator order verbatim: "we do not need
parity, we need to migrate, not keep the old machinery"): every leg
used to dual-serve the retired py stack beside TS and byte-compare.
The py boot (subprocess + sitecustomize shim + estate-config
redirect) is deleted; the single TS boot rides boot_scratch_gateway
(tests _anchor) and every leg asserts the TS side against its
literal. The py-expectation halves of the 6 manage legs died per
the RUNNER CAUSE note above.

Date: 2026-09-08. Status: landed (oracle-death re-derivation).
"""

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

PASS = FAIL = 0

VENV_PY = REPO / ".venv" / "bin" / "python"
BRIDGES_TS = REPO / "packages" / "gateway-doors" / "src" / "doors" / "bridges.ts"

TOKEN = "wall-bridges-token-2026-09-07"

PNG_BYTES = b"\x89PNG\r\n\x1a\n" + bytes(range(256))

# Frozen TS-side literals (bridges.ts + core/errors.ts + doors/chrome.ts).
POSER_502_NONE = {
    "error": "poser bridge: exactly one engine endpoint with a url must "
             "be configured to forward to (got 0: ['none']) — "
             "inference.config.json engines, no hardcoded fallback"}
POSER_502_TWO = {
    "error": "poser bridge: exactly one engine endpoint with a url must "
             "be configured to forward to (got 2: ['comfyui', 'kimodo']) "
             "— inference.config.json engines, no hardcoded fallback"}
GARBAGE_502 = {"error": "poser bridge: TypeError: Invalid URL"}
AUTH_401 = {"error": "unauthorized: missing or invalid bearer token "
                     "(Authorization: Bearer <token>; set "
                     "DSH_GATEWAY_TOKEN to enable)"}
HEALTH_BYTES = b'{\n  "status": "ok",\n  "version": "0.1.0"\n}'


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def parsed(raw: bytes):
    try:
        return json.loads(raw)
    except ValueError:
        return None


# ── stub upstream ────────────────────────────────────────────────────

STUB_LAST: dict = {}


class StubHandler(BaseHTTPRequestHandler):
    server_version = "StubPoser/1"

    def _record(self) -> bytes:
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length > 0 else b""
        STUB_LAST.clear()
        STUB_LAST.update({
            "method": self.command,
            "path": self.path.split("?")[0],
            "query": self.path.split("?", 1)[1] if "?" in self.path else "",
            "content_type": self.headers.get("Content-Type"),
            "body": body,
        })
        return body

    def _send(self, status: int, body: bytes, ctype: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _route(self, body: bytes) -> None:
        path = self.path.split("?")[0]
        query = self.path.split("?", 1)[1] if "?" in self.path else ""
        if self.command == "GET" and path == "/poser/skin/mesh":
            self._send(200, json.dumps(
                {"mesh": "ok", "query": query}).encode(), "application/json")
        elif self.command == "POST" and path == "/poser/bind":
            self._send(200, body, "application/json")
        elif self.command == "GET" and path == "/poser/binary":
            self._send(200, PNG_BYTES, "image/png")
        elif self.command == "GET" and path == "/poser/missing":
            self._send(404, json.dumps(
                {"error": "no such poser route"}).encode(),
                "application/json")
        elif self.command == "POST" and path == "/poser/bad":
            self._send(400, json.dumps(
                {"error": "bad coeffs",
                 "code": "poser_bad_coeffs"}).encode(),
                "application/json")
        elif self.command == "GET" and path == "/poser/boom":
            self._send(500, b"stub exploded", "text/plain")
        else:
            self._send(404, json.dumps(
                {"error": "stub: unknown %s %s" % (self.command, path)}
                ).encode(), "application/json")

    def do_GET(self) -> None:
        self._route(self._record())

    def do_POST(self) -> None:
        self._route(self._record())

    def log_message(self, *a: object) -> None:
        pass


def boot_stub() -> tuple[ThreadingHTTPServer, int]:
    srv = ThreadingHTTPServer(("127.0.0.1", 0), StubHandler)
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, port


# ── fixture configs ──────────────────────────────────────────────────

def write_config(path: Path, engines: dict, models_root: str) -> None:
    path.write_text(json.dumps({
        "models": {"read_root": models_root,
                   "download_root": models_root},
        "engines": engines,
    }, indent=2))


def single_url(stub_port: int) -> dict:
    return {"comfyui": {"base": "image-gen/comfyui",
                        "url": "http://127.0.0.1:%d" % stub_port}}


# ── http ─────────────────────────────────────────────────────────────

def http(port: int, method: str, target: str,
         body: bytes | None = None,
         auth: bool = True,
         ctype: str | None = None) -> tuple[int, bytes, str]:
    headers = {}
    if auth:
        headers["Authorization"] = "Bearer " + TOKEN
    if ctype is not None:
        headers["Content-Type"] = ctype
    req = urllib.request.Request(
        "http://127.0.0.1:%d%s" % (port, target),
        data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return (r.status, r.read(),
                    r.headers.get("content-type", ""))
    except urllib.error.HTTPError as e:
        return (e.code, e.read(), e.headers.get("content-type", ""))
    except Exception as e:
        raise RuntimeError("transport to :%d%s: %s" % (port, target, e))


def dispatch_shape(doc: bytes | None, action: str) -> bool:
    """The REAL manage-dispatch envelope (2026-09-08 path fix): the
    runner reaches python/manage.py; refusal/shape legs pin action
    echo + ok:false + code + data:null, never the full pydantic text
    (allowed-action lists drift with the manage module)."""
    try:
        body = json.loads(doc) if isinstance(doc, bytes) else doc
    except ValueError:
        return False
    return (isinstance(body, dict)
            and body.get("action") == action
            and body.get("ok") is False
            and body.get("code") == "invalid_request"
            and body.get("data") is None
            and isinstance(body.get("detail"), str)
            and len(body["detail"]) > 0)


# ── main ─────────────────────────────────────────────────────────────

def main() -> int:
    if not VENV_PY.is_file():
        print("FATAL: base-env python missing at %s" % VENV_PY)
        return 1
    if not shutil.which("node"):
        print("FATAL: node not on PATH")
        return 1

    tmp = Path(tempfile.mkdtemp(prefix="bridges-wall-"))
    models_root = str(tmp / "models")
    os.makedirs(models_root, exist_ok=True)
    ts_root = tmp / "ts-state"
    ts_root.mkdir()
    ts_repo = tmp / "ts-repo"
    ts_repo.mkdir()
    ts_cfg = ts_repo / "inference.config.json"

    stub, stub_port = boot_stub()
    stub_base = "http://127.0.0.1:%d" % stub_port
    print("stub upstream on :%d" % stub_port)
    write_config(ts_cfg, single_url(stub_port), models_root)

    ts_env = dict(os.environ)
    ts_env["MELITE_STATE_ROOT"] = str(ts_root)
    ts_env["MELITE_REPO_ROOT"] = str(ts_repo)
    ts_env["MELITE_MANAGE_PYTHON"] = str(VENV_PY)
    ts_env["DSH_GATEWAY_TOKEN"] = TOKEN

    ts_proc = None
    try:
        ts_port, ts_proc = boot_scratch_gateway(env=ts_env)
        print("ts gateway on :%d (repo %s)" % (ts_port, ts_repo))

        # ── Phase A: poser forward ──
        print("Phase A — poser forward (TS-only)")
        s, b, c = http(ts_port, "GET", "/poser/skin/mesh?x=1&y=ab")
        check("GET mesh status", s == 200, "%r" % (s,))
        check("GET mesh bytes", parsed(b) == {"mesh": "ok",
                                              "query": "x=1&y=ab"},
              repr(b[:120]))
        check("GET mesh ctype", c.split(";")[0] == "application/json",
              "%r" % (c,))
        check("GET mesh stub saw query",
              STUB_LAST.get("query") == "x=1&y=ab", repr(STUB_LAST))

        bind_body = json.dumps({"identity": "m0", "coeffs": [1.0, 2.5]},
                               indent=2).encode()
        s, b, _ = http(ts_port, "POST", "/poser/bind", bind_body,
                       ctype="application/json")
        check("POST bind status", s == 200, "%r" % (s,))
        check("POST bind echo bytes", b == bind_body,
              "%dB/%dB" % (len(b), len(bind_body)))
        s, b, _ = http(ts_port, "POST", "/poser/bind", bind_body,
                       ctype="application/json")
        check("POST bind stub saw json ctype",
              STUB_LAST.get("content_type") == "application/json"
              and STUB_LAST.get("body") == bind_body,
              repr({k: (v if k != "body" else len(v))
                    for k, v in STUB_LAST.items()}))

        s, b, c = http(ts_port, "GET", "/poser/binary")
        check("GET binary status", s == 200, "%r" % (s,))
        check("GET binary bytes", b == PNG_BYTES, "%dB" % len(b))
        check("GET binary ctype", c.split(";")[0] == "image/png",
              "%r" % (c,))

        s, b, _ = http(ts_port, "GET", "/poser/missing")
        check("upstream 404 status", s == 404, "%r" % (s,))
        check("upstream 404 bytes verbatim",
              b == json.dumps({"error": "no such poser route"}).encode(),
              "%r" % (b[:120],))
        check("upstream 404 carries no added code", b'"code"' not in b,
              "%r" % (b[:160],))

        s, b, _ = http(ts_port, "POST", "/poser/bad", b'{"c":[]}',
                       ctype="application/json")
        check("upstream 400 status", s == 400, "%r" % (s,))
        check("upstream 400 bytes verbatim",
              b == json.dumps({"error": "bad coeffs",
                               "code": "poser_bad_coeffs"}).encode(),
              "%r" % (b[:160],))

        s, b, c = http(ts_port, "GET", "/poser/boom")
        check("upstream 500 status", s == 500, "%r" % (s,))
        check("upstream 500 bytes verbatim", b == b"stub exploded",
              "%r" % (b[:80],))
        check("upstream 500 ctype", c.split(";")[0] == "text/plain",
              "%r" % (c,))

        s, b, _ = http(ts_port, "PUT", "/poser/skin/mesh")
        check("poser method mismatch 404",
              s == 404 and parsed(b) == {
                  "error": "no such route PUT /poser/skin/mesh",
                  "code": "no_such_route"},
              "%r %r" % (s, b[:100]))

        s, b, _ = http(ts_port, "GET", "/poser/skin/mesh", auth=False)
        check("poser auth 401", s == 401 and parsed(b) == AUTH_401,
              "%r %r" % (s, b[:160]))
        s, b, _ = http(ts_port, "GET", "/v1/health", auth=False)
        check("health exempt without token", s == 200 and b == HEALTH_BYTES,
              "%r %r" % (s, b[:120]))

        # ── Phase B: manage envelopes (TS-only) ──
        print("Phase B — manage envelopes (TS-only)")

        def post_manage(doc_bytes: bytes):
            return http(ts_port, "POST", "/v1/manage",
                        doc_bytes, ctype="application/json")

        s, b, _ = post_manage(b"{nope")
        doc = parsed(b)
        check("manage bad-JSON shape",
              s == 400 and isinstance(doc, dict)
              and doc.get("code") == "bad_json"
              and str(doc.get("error", "")).startswith("bad JSON: "),
              "%r %r" % (s, b[:100]))

        # REAL DISPATCH pins (2026-09-08 path fix, the fix stroke the
        # RUNNER CAUSE deferred): managePyDirs pointed at the dead py
        # tier after the python/ rename — Stage A pinned the broken
        # 502s as current bytes; the fix restores live dispatch, so
        # these legs pin the REAL 422/404/200 shapes (loose on
        # pydantic/live text, strict on envelope).
        for label, payload, detail_part in (
            ("unknown action",
             {"action": "nope_no_such_action_bridges"},
             "Input should be"),
            ("empty body",
             {},
             "Field required"),
            ("missing arg",
             {"action": "install_extension"},
             "install_extension requires: nodes"),
        ):
            raw = json.dumps(payload).encode()
            s, b, _ = post_manage(raw)
            action = payload.get("action", "?")  # type: ignore[union-attr]
            doc = parsed(b)
            check("manage dispatch %s" % label,
                  s == 422 and dispatch_shape(b, action)
                  and detail_part in str(doc.get("detail", "")),
                  "%r %r" % (s, b[:200]))

        raw = json.dumps({"action": "provision_model",
                          "model": "no-such-model-xyz-bridges"}).encode()
        s, b, _ = post_manage(raw)
        check("manage dispatch unknown-model",
              s == 404 and dispatch_shape(b, "provision_model")
              and "not found in catalog" in str(parsed(b).get("detail", "")),
              "%r %r" % (s, b[:200]))

        s, b, _ = post_manage(b"[1,2]")
        doc = parsed(b)
        check("manage list-body 500 shape",
              s == 500 and isinstance(doc, dict)
              and set(doc) == {"error", "type", "traceback", "route"},
              "%r %r" % (s, b[:160]))

        s, b, _ = post_manage(json.dumps({"action": "status"}).encode())
        doc = parsed(b)
        check("manage dispatch status (live shape, not live values)",
              s == 200 and isinstance(doc, dict)
              and doc.get("action") == "status"
              and doc.get("ok") is True
              and doc.get("detail") == "server up"
              and isinstance(doc.get("data"), dict)
              and isinstance(doc["data"].get("endpoint"), dict)
              and doc["data"]["endpoint"].get("reachable") is True,
              "%r %r" % (s, b[:200]))

        s, b, _ = http(ts_port, "GET", "/v1/manage")
        check("manage method mismatch 404",
              s == 404 and parsed(b) == {
                  "error": "no such route GET /v1/manage",
                  "code": "no_such_route"},
              "%r %r" % (s, b[:120]))

        raw = json.dumps({"action": "nope_no_such_action_bridges"}).encode()
        s, b, _ = post_manage(raw)
        s2, b2, _ = http(ts_port, "POST", "/v1/manage/", raw,
                         ctype="application/json")
        check("manage trailing-slash normalization",
              s == s2 == 422 and b == b2
              and dispatch_shape(b, "nope_no_such_action_bridges"),
              "%r/%r %dB/%dB" % (s, s2, len(b), len(b2)))

        # ── Phase C: poser config legs ──
        print("Phase C — poser config legs (TS-only)")

        def set_configs(engines: dict) -> None:
            write_config(ts_cfg, engines, models_root)
            time.sleep(0.2)

        set_configs({"comfyui": {"base": "image-gen/comfyui"}})
        s, b, _ = http(ts_port, "GET", "/poser/skin/mesh?x=1")
        check("zero-url 502", s == 502 and parsed(b) == POSER_502_NONE,
              "%r %r" % (s, b[:200]))

        set_configs({"comfyui": {"base": "image-gen/comfyui",
                                 "url": stub_base},
                     "kimodo": {"base": "motion/kimodo",
                                "url": "http://127.0.0.1:9"}})
        s, b, _ = http(ts_port, "GET", "/poser/skin/mesh?x=1")
        check("two-url 502", s == 502 and parsed(b) == POSER_502_TWO,
              "%r %r" % (s, b[:240]))
        check("two-url names repr",
              "['comfyui', 'kimodo']" in (parsed(b) or {}).get("error", ""),
              repr(b[:200]))

        set_configs(single_url(stub_port))
        s, b, _ = http(ts_port, "GET", "/poser/skin/mesh?x=1")
        check("config restored 200",
              s == 200 and parsed(b) == {"mesh": "ok", "query": "x=1"},
              "%r %r" % (s, b[:120]))

        stub.shutdown()
        stub.server_close()
        time.sleep(0.3)
        s, b, _ = http(ts_port, "GET", "/poser/skin/mesh?x=1")
        doc = parsed(b)
        prefix = ("poser bridge: comfyui unreachable at %s ("
                  % stub_base)
        check("upstream-down 502 shape",
              s == 502 and isinstance(doc, dict)
              and str(doc.get("error", "")).startswith(prefix),
              "%r %r" % (s, b[:160]))

        set_configs({"comfyui": {"base": "image-gen/comfyui",
                                 "url": "notaurl-no-scheme"}})
        s, b, _ = http(ts_port, "GET", "/poser/skin/mesh?x=1")
        # Taxonomy pin (walled empirically 2026-09-07): a schemeless
        # base fails the TS URL construction with a TypeError through
        # the generic 502 leg (bridges.ts). Deterministic text pinned
        # exactly.
        check("garbage-scheme 502 shape",
              s == 502 and parsed(b) == GARBAGE_502,
              "%r %r" % (s, b[:200]))

        ts_cfg.unlink()
        s, b, _ = http(ts_port, "GET", "/poser/skin/mesh?x=1")
        doc = parsed(b)
        check("missing-config 500 shape",
              s == 500 and isinstance(doc, dict)
              and set(doc) == {"error", "type", "traceback", "route"},
              "%r %r" % (s, b[:160]))

        # ── Phase D: manage plane-unavailable templates (TS-only boots) ──
        print("Phase D — manage plane templates (TS-only boots)")
        # Fresh state roots per extra boot (one writer lock per state
        # root — a second server on the same root refuses to start);
        # the fixture config is restored first (Phase C deleted it).
        write_config(ts_cfg, single_url(stub_port), models_root)
        bogus = "/nonexistent-xyz-bridges-wall-python"
        benv = dict(ts_env)
        benv["MELITE_MANAGE_PYTHON"] = bogus
        bogus_root = tmp / "ts-state-bogus"
        bogus_root.mkdir()
        benv["MELITE_STATE_ROOT"] = str(bogus_root)
        bport, bproc = boot_scratch_gateway(env=benv)
        try:
            raw = json.dumps(
                {"action": "status"}).encode()
            bs, bb, _ = http(bport, "POST", "/v1/manage", raw,
                             ctype="application/json")
            # 5xx envelopes carry NO R4.2 code (core/errors.ts: the
            # rule is dict-only AND 4xx-only — the TS 503/502/504
            # carry no code key either).
            want = json.dumps({
                "action": "status", "ok": False,
                "detail": "management plane unavailable: no base-env "
                          "python at %s (uv sync)" % bogus,
            }, indent=2).encode()
            check("bogus-python 503 template",
                  bs == 503 and bb == want,
                  "%r %r vs %r" % (bs, bb[:200], want[:200]))
        finally:
            reap_gateway(bproc)

        false_bin = ("/bin/false" if os.path.exists("/bin/false")
                     else "/usr/bin/false")
        if not os.path.exists(false_bin):
            check("runner-failed 502 template", False,
                  "no false binary on PATH")
        else:
            fenv = dict(ts_env)
            fenv["MELITE_MANAGE_PYTHON"] = false_bin
            fenv["MELITE_REPO_ROOT"] = str(ts_repo)
            false_root = tmp / "ts-state-false"
            false_root.mkdir()
            fenv["MELITE_STATE_ROOT"] = str(false_root)
            fport, fproc = boot_scratch_gateway(env=fenv)
            try:
                raw = json.dumps({"action": "status"}).encode()
                fs, fb, _ = http(fport, "POST", "/v1/manage", raw,
                                 ctype="application/json")
                check("runner-failed 502 template",
                      fs == 502 and parsed(fb) == {
                          "action": "status", "ok": False,
                          "detail": "manage runner failed",
                          "data": {"stderr": ""},
                      }, "%r %r" % (fs, fb[:200]))
            finally:
                reap_gateway(fproc)

        # resolveManagePython unit probe (env pin + repo default).
        probe = (
            "import { resolveManagePython } from %s;"
            "const a = resolveManagePython('/repo-x');"
            "if (a !== '/repo-x/.venv/bin/python') {"
            "  console.error('default ' + a); process.exit(1); }"
            "process.env.MELITE_MANAGE_PYTHON = '/pin/py';"
            "const b = resolveManagePython('/repo-x');"
            "if (b !== '/pin/py') {"
            "  console.error('pin ' + b); process.exit(1); }"
            "console.log('RESOLVE-OK');"
            % json.dumps(str(BRIDGES_TS)))
        node = shutil.which("node")
        assert node is not None
        r = subprocess.run(
            [node, "--no-warnings", "--experimental-strip-types",
             "--eval", probe],
            cwd=str(REPO), capture_output=True, text=True, timeout=30,
            env={**os.environ, "MELITE_MANAGE_PYTHON": ""})
        check("resolveManagePython unit",
              r.returncode == 0 and "RESOLVE-OK" in r.stdout,
              (r.stderr or r.stdout)[-300:])

        print("PASS %d FAIL %d" % (PASS, FAIL))
        return 1 if FAIL else 0
    finally:
        if ts_proc is not None:
            reap_gateway(ts_proc)
        try:
            stub.shutdown()
        except Exception:
            pass
        try:
            stub.server_close()
        except Exception:
            pass
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())

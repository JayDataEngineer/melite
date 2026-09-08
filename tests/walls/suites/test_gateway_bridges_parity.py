#!/usr/bin/env python3
"""test_gateway_bridges_parity.py — P6 bridges TS parity wall.

Proves the TypeScript bridge doors (packages/gateway/src/doors/
bridges.ts via the ctx.ts seam: POST /v1/manage → the manage
subprocess bridge, GET|POST ^/poser/ → the studio forward) answer
byte-identical to the py gateway (python/gateway.py _h_manage /
_h_poser_bridge):

  Phase A — poser forward parity (dual-served py vs TS against a
    scripted stdlib stub upstream): 200 JSON + query preservation,
    POST echo (body bytes + stamped content-type), binary bytes +
    non-JSON content-type, upstream 404/400/500 refusals passed
    through VERBATIM (status + bytes + content-type, no R4.2 code
    injected — byte doors skip the dict-only rule), method-mismatch
    404, auth 401 + the /v1/health exemption.
  Phase B — manage envelope parity (dual-served): bad-JSON 400
    shape, unknown-action 422, empty-body 422, missing-arg 422, all
    byte-equal (same interpreter, same manage.dispatch); unknown
    model 404 byte-equal; list body 500 shape (keys); status 200
    shape (stable leaves cross-equal, live leaves key-shape);
    method-mismatch 404 byte-equal; trailing-slash normalization.
  Phase C — poser config legs (configs rewritten mid-run; both
    gateways resolve per request): zero-url 502 byte-equal,
    two-url 502 byte-equal (sorted-names repr), stub-down 502
    shape (prefix through "(" byte-equal, errno prose differs),
    garbage-scheme 502 shape, missing-file 500 shape (keys).
  Phase D — manage plane-unavailable templates (TS-only boots,
    pinned byte-exact against the py template text): bogus
    MELITE_MANAGE_PYTHON → 503 echoing the path; node-as-python →
    502 runner-failed; resolveManagePython unit probe.

Forward/envelope decisions under test (py cites):
  - poser target = the ONE engines.<name>.url in
    inference.config.json (gateway.py:3812-3822); 0/2+ → the loud
    502 (3813-3820); forward = base.rstrip("/")+target incl. query
    with content-type stamped iff body (3824-3833); HTTPError
    passes status+body+ctype through (3838-3846); URLError → 502
    unreachable (3847-3850); other → 502 Name: msg (3851-3853).
  - manage = py's base-env runner shape always (gateway.py:
    3935-3959): stdin = the parsed doc, stdout last line =
    [code, rep]; missing python → 503 (3944-3948); rc!=0/empty →
    502 + last-500 stderr (3956-3959); timeout → 504 (3960-3963).
    Dispatch refusals (manage.py:707-723) come from the REAL
    manage.dispatch in the same interpreter both sides use.
  - auth gates both doors before dispatch (gateway.py:2607-2619);
    /v1/health is the only exemption.

Hermetic discipline: the stub is a stdlib ThreadingHTTPServer in
THIS process; the py gateway boots on a scratch port with its estate
config redirected (sitecustomize shim honoring WALL_ESTATE_CONFIG —
no repo file touched) and its own MELITE_STATE_ROOT; the TS server
boots with MELITE_REPO_ROOT at a fixture tree carrying an identical
inference.config.json. Manage NEVER mutates: the battery uses
refusals (422/404/500/400), the read-only status probe, and template
pins — no installs, downloads, lifecycle, or snapshots run.

KNOWN divergences (asserted as shape, not bytes):
  - bad-JSON TEXT embeds the host parser's message (CPython
    JSONDecodeError vs V8 SyntaxError) — status + code + prefix.
  - list-body 500 TEXT embeds the host traceback — status + keys.
  - unreachable TAIL (urllib errno prose vs node message) —
    status + prefix through "("; the schemeless-base leg is pinned
    per-side exact (py ValueError vs TS TypeError, same status).
  - status live leaves (vram, timestamps, reachable flag) — stable
    leaves cross-equal, the rest key-shape.
  - missing-config 500 TEXT (tracebacks) — status + keys.

Run: ./.venv/bin/python tests/walls/suites/test_gateway_bridges_parity.py
(the wall MUST run under the base-env python: the py gateway needs
comfy_mcp in-process and the TS bridge shells out to the same
interpreter for byte-identical dispatch texts.)
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

from _anchor import REPO

sys.dont_write_bytecode = True

PASS = FAIL = 0

VENV_PY = REPO / ".venv" / "bin" / "python"
TS_SERVER = REPO / "packages" / "gateway" / "src" / "server.ts"
BRIDGES_TS = REPO / "packages" / "gateway" / "src" / "doors" / "bridges.ts"

TOKEN = "wall-bridges-token-2026-09-07"

PNG_BYTES = b"\x89PNG\r\n\x1a\n" + bytes(range(256))


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def first_div(a: bytes, b: bytes) -> str:
    for i, (x, y) in enumerate(zip(a, b)):
        if x != y:
            return " first-div @%d" % i
    return "" if len(a) == len(b) else " len-div"


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


# ── boots ────────────────────────────────────────────────────────────

def _wait_http(port: int, path: str = "/v1/health") -> bool:
    url = "http://127.0.0.1:%d%s" % (port, path)
    for _ in range(150):
        try:
            with urllib.request.urlopen(url, timeout=2) as r:
                r.read(1)
            return True
        except urllib.error.HTTPError:
            return True
        except Exception:
            time.sleep(0.2)
    return False


def free_port() -> int:
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


SHIM_SRC = """import os
_cfg = os.environ.get("WALL_ESTATE_CONFIG", "")
if _cfg:
    from pathlib import Path as _P
    try:
        import estate_config as _ec
        _ec.ROOT_CONFIG = _P(_cfg)
    except Exception:
        pass
"""


def boot_py(env: dict, port: int) -> "subprocess.Popen[bytes]":
    proc = subprocess.Popen(
        [str(VENV_PY), str(REPO / "python" / "gateway.py"), str(port)],
        cwd=str(REPO), env=env,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        start_new_session=True)
    if not _wait_http(port):
        try:
            proc.terminate()
        except Exception:
            pass
        raise RuntimeError("py gateway did not boot on :%d" % port)
    return proc


def boot_ts(env: dict) -> tuple[int, "subprocess.Popen[str]"]:
    node = shutil.which("node")
    if node is None:
        raise RuntimeError("node not on PATH")
    proc = subprocess.Popen(
        [node, "--no-warnings", "--experimental-strip-types",
         str(TS_SERVER)],
        cwd=str(REPO), env=env,
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        text=True, start_new_session=True)
    assert proc.stdout is not None
    deadline = time.time() + 30
    while time.time() < deadline:
        line = proc.stdout.readline()
        if line.startswith("READY "):
            return int(line.split()[1]), proc
        if proc.poll() is not None:
            raise RuntimeError("ts server exited rc=%d" % proc.returncode)
    proc.terminate()
    raise RuntimeError("ts server did not print READY")


def reap(proc: "subprocess.Popen") -> None:
    try:
        proc.terminate()
    except Exception:
        pass
    try:
        proc.wait(timeout=15)
    except Exception:
        try:
            proc.kill()
        except Exception:
            pass


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


def both(py_port: int, ts_port: int, method: str, target: str,
         body: bytes | None = None,
         auth: bool = True,
         ctype: str | None = None,
         ) -> tuple[tuple[int, bytes, str], tuple[int, bytes, str]]:
    return (http(py_port, method, target, body, auth, ctype),
            http(ts_port, method, target, body, auth, ctype))


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
    shim = tmp / "shim"
    shim.mkdir()
    (shim / "sitecustomize.py").write_text(SHIM_SRC)
    py_root = tmp / "py-state"
    ts_root = tmp / "ts-state"
    py_root.mkdir()
    ts_root.mkdir()
    py_cfg = tmp / "py-inference.config.json"
    ts_repo = tmp / "ts-repo"
    ts_repo.mkdir()
    ts_cfg = ts_repo / "inference.config.json"

    stub, stub_port = boot_stub()
    stub_base = "http://127.0.0.1:%d" % stub_port
    print("stub upstream on :%d" % stub_port)
    write_config(py_cfg, single_url(stub_port), models_root)
    write_config(ts_cfg, single_url(stub_port), models_root)

    py_env = dict(os.environ)
    py_env["MELITE_STATE_ROOT"] = str(py_root)
    py_env["DSH_GATEWAY_TOKEN"] = TOKEN
    py_env["WALL_ESTATE_CONFIG"] = str(py_cfg)
    py_env["PYTHONPATH"] = (str(shim) + os.pathsep + str(REPO / "python")
                            + os.pathsep + py_env.get("PYTHONPATH", ""))
    ts_env = dict(os.environ)
    ts_env["MELITE_STATE_ROOT"] = str(ts_root)
    ts_env["MELITE_REPO_ROOT"] = str(ts_repo)
    ts_env["MELITE_MANAGE_PYTHON"] = str(VENV_PY)
    ts_env["DSH_GATEWAY_TOKEN"] = TOKEN

    py_port, ts_port = free_port(), -1
    py_proc = ts_proc = None
    try:
        py_proc = boot_py(py_env, py_port)
        print("py gateway on :%d (config %s)" % (py_port, py_cfg))
        ts_port, ts_proc = boot_ts(ts_env)
        print("ts gateway on :%d (repo %s)" % (ts_port, ts_repo))

        # ── Phase A: poser forward ──
        print("Phase A — poser forward parity")
        (ps, pb, pc), (gs, gb, gc) = both(
            py_port, ts_port, "GET", "/poser/skin/mesh?x=1&y=ab")
        check("GET mesh status", ps == gs == 200, "%r/%r" % (ps, gs))
        check("GET mesh bytes", pb == gb,
              "%dB vs %dB%s" % (len(pb), len(gb), first_div(pb, gb)))
        check("GET mesh ctype", pc.split(";")[0] == gc.split(";")[0]
              == "application/json", "%r/%r" % (pc, gc))
        try:
            doc = json.loads(pb)
        except ValueError:
            doc = None
        check("GET mesh query preserved",
              isinstance(doc, dict) and doc.get("query") == "x=1&y=ab",
              repr(pb[:120]))
        check("GET mesh stub saw query",
              STUB_LAST.get("query") == "x=1&y=ab", repr(STUB_LAST))

        bind_body = json.dumps({"identity": "m0", "coeffs": [1.0, 2.5]},
                               indent=2).encode()
        (ps, pb, _), (gs, gb, _) = both(
            py_port, ts_port, "POST", "/poser/bind", bind_body,
            ctype="application/json")
        check("POST bind status", ps == gs == 200, "%r/%r" % (ps, gs))
        check("POST bind echo bytes", pb == gb == bind_body,
              "%dB/%dB/%dB%s"
              % (len(pb), len(gb), len(bind_body), first_div(pb, gb)))
        (ps, pb, _), (gs, gb, _) = both(
            py_port, ts_port, "POST", "/poser/bind", bind_body,
            ctype="application/json")
        check("POST bind stub saw json ctype",
              STUB_LAST.get("content_type") == "application/json"
              and STUB_LAST.get("body") == bind_body,
              repr({k: (v if k != "body" else len(v))
                    for k, v in STUB_LAST.items()}))

        (ps, pb, pc), (gs, gb, gc) = both(
            py_port, ts_port, "GET", "/poser/binary")
        check("GET binary status", ps == gs == 200, "%r/%r" % (ps, gs))
        check("GET binary bytes", pb == gb == PNG_BYTES,
              "%dB/%dB" % (len(pb), len(gb)))
        check("GET binary ctype",
              pc.split(";")[0] == gc.split(";")[0] == "image/png",
              "%r/%r" % (pc, gc))

        (ps, pb, pc), (gs, gb, gc) = both(
            py_port, ts_port, "GET", "/poser/missing")
        check("upstream 404 status", ps == gs == 404, "%r/%r" % (ps, gs))
        check("upstream 404 bytes verbatim", pb == gb,
              "%r vs %r" % (pb[:120], gb[:120]))
        check("upstream 404 carries no added code",
              b'"code"' not in pb and b'"code"' not in gb,
              "%r vs %r" % (pb[:160], gb[:160]))

        (ps, pb, _), (gs, gb, _) = both(
            py_port, ts_port, "POST", "/poser/bad", b'{"c":[]}',
            ctype="application/json")
        check("upstream 400 status", ps == gs == 400, "%r/%r" % (ps, gs))
        check("upstream 400 bytes verbatim", pb == gb,
              "%r vs %r" % (pb[:160], gb[:160]))

        (ps, pb, pc), (gs, gb, gc) = both(
            py_port, ts_port, "GET", "/poser/boom")
        check("upstream 500 status", ps == gs == 500, "%r/%r" % (ps, gs))
        check("upstream 500 bytes verbatim", pb == gb == b"stub exploded",
              "%r vs %r" % (pb[:80], gb[:80]))
        check("upstream 500 ctype",
              pc.split(";")[0] == gc.split(";")[0] == "text/plain",
              "%r/%r" % (pc, gc))

        (ps, pb, _), (gs, gb, _) = both(
            py_port, ts_port, "PUT", "/poser/skin/mesh")
        check("poser method mismatch 404",
              ps == gs == 404 and pb == gb,
              "%r/%r %r" % (ps, gs, pb[:100]))

        (ps, pb, _), (gs, gb, _) = both(
            py_port, ts_port, "GET", "/poser/skin/mesh", auth=False)
        check("poser auth 401", ps == gs == 401 and pb == gb,
              "%r/%r %r" % (ps, gs, pb[:120]))
        (ps, pb, _), (gs, gb, _) = both(
            py_port, ts_port, "GET", "/v1/health", auth=False)
        check("health exempt without token",
              ps == gs == 200 and pb == gb, "%r/%r" % (ps, gs))

        # ── Phase B: manage envelopes ──
        print("Phase B — manage envelope parity")

        def post_manage(doc_bytes: bytes):
            return both(py_port, ts_port, "POST", "/v1/manage",
                        doc_bytes, ctype="application/json")

        (ps, pb, _), (gs, gb, _) = post_manage(b"{nope")
        try:
            pdoc, gdoc = json.loads(pb), json.loads(gb)
        except ValueError:
            pdoc = gdoc = None
        check("manage bad-JSON shape",
              ps == gs == 400
              and isinstance(pdoc, dict) and isinstance(gdoc, dict)
              and pdoc.get("code") == gdoc.get("code") == "bad_json"
              and str(pdoc.get("error", "")).startswith("bad JSON: ")
              and str(gdoc.get("error", "")).startswith("bad JSON: "),
              "%r/%r %r" % (ps, gs, pb[:100]))

        for label, payload in (
            ("unknown action",
             {"action": "nope_no_such_action_bridges"}),
            ("empty body", {}),
            ("missing arg",
             {"action": "install_extension"}),
        ):
            raw = json.dumps(payload).encode()
            (ps, pb, _), (gs, gb, _) = post_manage(raw)
            check("manage 422 %s" % label,
                  ps == gs == 422 and pb == gb,
                  "%r/%r %r vs %r"
                  % (ps, gs, pb[:200], gb[:200]))

        raw = json.dumps({"action": "provision_model",
                          "model": "no-such-model-xyz-bridges"}).encode()
        (ps, pb, _), (gs, gb, _) = post_manage(raw)
        ok404 = ps == gs == 404 and pb == gb
        try:
            pdoc = json.loads(pb)
            ok404 = ok404 and pdoc.get("code") == "invalid_request"
        except ValueError:
            ok404 = False
        check("manage unknown-model 404", ok404,
              "%r/%r %r" % (ps, gs, pb[:200]))

        (ps, pb, _), (gs, gb, _) = post_manage(b"[1,2]")
        try:
            pdoc, gdoc = json.loads(pb), json.loads(gb)
        except ValueError:
            pdoc = gdoc = None
        check("manage list-body 500 shape",
              ps == gs == 500
              and isinstance(pdoc, dict) and isinstance(gdoc, dict)
              and set(pdoc) == set(gdoc)
              == {"error", "type", "traceback", "route"},
              "%r/%r %r" % (ps, gs, pb[:160]))

        (ps, pb, _), (gs, gb, _) = post_manage(
            json.dumps({"action": "status"}).encode())
        try:
            pdoc, gdoc = json.loads(pb), json.loads(gb)
        except ValueError:
            pdoc = gdoc = None
        status_ok = (
            ps == gs == 200
            and isinstance(pdoc, dict) and isinstance(gdoc, dict)
            and pdoc.get("action") == gdoc.get("action") == "status"
            and pdoc.get("ok") is True and gdoc.get("ok") is True
            and pdoc.get("detail") in (
                "server up", "workspace up", "server not reachable")
            and gdoc.get("detail") in (
                "server up", "workspace up", "server not reachable")
            and isinstance(pdoc.get("data"), dict)
            and isinstance(gdoc.get("data"), dict)
            and set(pdoc["data"]) == set(gdoc["data"])
            == {"endpoint", "server_info", "manager_security",
                "active_runs", "routing"}
            and pdoc["data"]["endpoint"].get("url")
            == gdoc["data"]["endpoint"].get("url")
            and isinstance(
                pdoc["data"]["endpoint"].get("url"), str)
            and pdoc.get("code", "absent") == gdoc.get("code", "absent")
        )
        check("manage status 200 shape", status_ok,
              "%r/%r %r" % (ps, gs, pb[:300]))

        (ps, pb, _), (gs, gb, _) = both(
            py_port, ts_port, "GET", "/v1/manage")
        check("manage method mismatch 404",
              ps == gs == 404 and pb == gb,
              "%r/%r %r" % (ps, gs, pb[:120]))

        raw = json.dumps({"action": "nope_no_such_action_bridges"}).encode()
        (ps, pb, _), (gs, gb, _) = post_manage(raw)
        (_, pb2, _), (_, gb2, _) = both(
            py_port, ts_port, "POST", "/v1/manage/", raw,
            ctype="application/json")
        check("manage trailing-slash normalization",
              pb == pb2 and gb == gb2 and pb == gb,
              "%dB/%dB/%dB/%dB"
              % (len(pb), len(pb2), len(gb), len(gb2)))

        # ── Phase C: poser config legs ──
        print("Phase C — poser config legs")

        def set_configs(engines: dict) -> None:
            write_config(py_cfg, engines, models_root)
            write_config(ts_cfg, engines, models_root)
            time.sleep(0.2)

        set_configs({"comfyui": {"base": "image-gen/comfyui"}})
        (ps, pb, _), (gs, gb, _) = both(
            py_port, ts_port, "GET", "/poser/skin/mesh?x=1")
        check("zero-url 502", ps == gs == 502 and pb == gb,
              "%r/%r %r" % (ps, gs, pb[:200]))

        set_configs({"comfyui": {"base": "image-gen/comfyui",
                                 "url": stub_base},
                     "kimodo": {"base": "motion/kimodo",
                                "url": "http://127.0.0.1:9"}})
        (ps, pb, _), (gs, gb, _) = both(
            py_port, ts_port, "GET", "/poser/skin/mesh?x=1")
        check("two-url 502", ps == gs == 502 and pb == gb,
              "%r/%r %r" % (ps, gs, pb[:240]))
        try:
            pdoc = json.loads(pb)
            two_names = pdoc.get("error", "")
        except ValueError:
            two_names = ""
        check("two-url names repr",
              "['comfyui', 'kimodo']" in two_names, two_names[:200])

        set_configs(single_url(stub_port))
        (ps, pb, _), (gs, gb, _) = both(
            py_port, ts_port, "GET", "/poser/skin/mesh?x=1")
        check("config restored 200", ps == gs == 200 and pb == gb,
              "%r/%r" % (ps, gs))

        stub.shutdown()
        stub.server_close()
        time.sleep(0.3)
        (ps, pb, _), (gs, gb, _) = both(
            py_port, ts_port, "GET", "/poser/skin/mesh?x=1")
        try:
            pdoc, gdoc = json.loads(pb), json.loads(gb)
        except ValueError:
            pdoc = gdoc = None
        prefix = ("poser bridge: comfyui unreachable at %s ("
                  % stub_base)
        check("upstream-down 502 shape",
              ps == gs == 502
              and isinstance(pdoc, dict) and isinstance(gdoc, dict)
              and str(pdoc.get("error", "")).startswith(prefix)
              and str(gdoc.get("error", "")).startswith(prefix),
              "%r/%r %r vs %r" % (ps, gs, pb[:160], gb[:160]))

        set_configs({"comfyui": {"base": "image-gen/comfyui",
                                 "url": "notaurl-no-scheme"}})
        (ps, pb, _), (gs, gb, _) = both(
            py_port, ts_port, "GET", "/poser/skin/mesh?x=1")
        # Taxonomy pin (walled empirically 2026-09-07): a schemeless
        # base raises ValueError in py (unknown url type is NOT a
        # URLError) → the generic 502 leg (gateway.py:3851-3853). TS
        # rides its URL-construction TypeError through the same leg.
        # Same status + shape; each side's deterministic text pinned
        # exactly.
        try:
            pdoc, gdoc = json.loads(pb), json.loads(gb)
        except ValueError:
            pdoc = gdoc = None
        check("garbage-scheme 502 shape",
              ps == gs == 502
              and pdoc == {
                  "error": "poser bridge: ValueError: unknown url "
                           "type: 'notaurl-no-scheme/poser/skin/mesh?x=1'"}
              and gdoc == {
                  "error": "poser bridge: TypeError: Invalid URL"},
              "%r/%r %r vs %r" % (ps, gs, pb[:200], gb[:200]))

        py_cfg.unlink()
        ts_cfg.unlink()
        (ps, pb, _), (gs, gb, _) = both(
            py_port, ts_port, "GET", "/poser/skin/mesh?x=1")
        try:
            pdoc, gdoc = json.loads(pb), json.loads(gb)
        except ValueError:
            pdoc = gdoc = None
        check("missing-config 500 shape",
              ps == gs == 500
              and isinstance(pdoc, dict) and isinstance(gdoc, dict)
              and set(pdoc) == set(gdoc)
              == {"error", "type", "traceback", "route"},
              "%r/%r %r" % (ps, gs, pb[:160]))

        # ── Phase D: manage plane-unavailable templates (TS-only) ──
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
        bport, bproc = boot_ts(benv)
        try:
            raw = json.dumps(
                {"action": "status"}).encode()
            bs, bb, _ = http(bport, "POST", "/v1/manage", raw,
                             ctype="application/json")
            # 5xx envelopes carry NO R4.2 code (route() 4353: the rule
            # is dict-only AND 4xx-only — py's own 503/502/504 have no
            # code key either).
            want = json.dumps({
                "action": "status", "ok": False,
                "detail": "management plane unavailable: no base-env "
                          "python at %s (uv sync)" % bogus,
            }, indent=2).encode()
            check("bogus-python 503 template",
                  bs == 503 and bb == want,
                  "%r %r vs %r" % (bs, bb[:200], want[:200]))
        finally:
            reap(bproc)

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
            fport, fproc = boot_ts(fenv)
            try:
                raw = json.dumps({"action": "status"}).encode()
                fs, fb, _ = http(fport, "POST", "/v1/manage", raw,
                                 ctype="application/json")
                try:
                    fdoc = json.loads(fb)
                except ValueError:
                    fdoc = None
                check("runner-failed 502 template",
                      fs == 502 and fdoc == {
                          "action": "status", "ok": False,
                          "detail": "manage runner failed",
                          "data": {"stderr": ""},
                      }, "%r %r" % (fs, fb[:200]))
            finally:
                reap(fproc)

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
        for proc in (py_proc, ts_proc):
            if proc is not None:
                reap(proc)
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

#!/usr/bin/env python3
"""test_gateway_chrome_parity.py — Phase-1 TS shell parity wall (J1-J10).

Proves the TypeScript HTTP shell (packages/gateway/src/server.ts +
ctx.ts over the ROUTES mirror, bodies from
packages/gateway/src/doors/chrome.ts) serves the 10 chrome/health
doors byte-identical to the py gateway:

  J1 /v1/health  J2 /v1/themes  J3 /v1/tags  J4 /v1/services
  J5 /v1/right-panes  J6 /v1/ui-slots  J7 /v1/tools
  J8 /v1/shell  J9 /v1/plugins  J10 /v1/models

Expectations are captured FRESH at wall runtime THROUGH the live py
dispatcher (gateway.route, read-only — chrome handlers never touch
the queue/sidecars; gw=None suffices because no J-door reads gw),
serialized exactly as _adapt does (indent=2, default=str). The wall
boots the TS server on its ephemeral port (no fixed port — QUEUE
LANE LAW), GETs every door, and asserts status + byte-equality,
plus the py unknown-path 404 shape and the R4.2 4xx-code
normalization fallback (pinned at the ctx.ts unit level: no J-door
returns 4xx over HTTP, so the fallback has no HTTP exercise — the
unit asserts add/preserve/ignore semantics mirroring
py/gateway.py:4347-4356).

Run: python3 tests/walls/suites/test_gateway_chrome_parity.py
"""

import asyncio
import json
import os
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

import catalog  # noqa: F401  (derived-door rail; import proves availability)
import editor_runs  # noqa: F401  (bodies ride this module; see below)
from gateway import route as py_route

PASS = FAIL = 0

DOORS = (
    "/v1/health",
    "/v1/themes",
    "/v1/tags",
    "/v1/services",
    "/v1/right-panes",
    "/v1/ui-slots",
    "/v1/tools",
    "/v1/shell",
    "/v1/plugins",
    "/v1/models",
)

UNKNOWN = "/v1/does-not-exist-parity-probe-xyz"

TS_SERVER = REPO / "packages" / "gateway" / "src" / "server.ts"
TS_CTX = REPO / "packages" / "gateway" / "src" / "ctx.ts"


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def py_wire(method: str, target: str) -> tuple[int, bytes]:
    """Fresh py expectation: live route() + _adapt serialization."""
    status, payload = asyncio.run(py_route(None, method, target, b""))
    return status, json.dumps(payload, indent=2, default=str).encode()


def ts_get(port: int, path: str,
           method: str = "GET") -> tuple[int | None, bytes, str]:
    """Raw TS bytes (no JSON parse — the pin is byte-equality)."""
    req = urllib.request.Request(
        "http://127.0.0.1:%d%s" % (port, path), method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, r.read(), r.headers.get("content-type", "")
    except urllib.error.HTTPError as e:
        return e.code, e.read(), e.headers.get("content-type", "")
    except Exception as e:
        return None, b"", "transport: %s" % e


def boot_ts() -> tuple[int, "subprocess.Popen[bytes]"]:
    node = shutil.which("node")
    if node is None:
        raise RuntimeError("node not on PATH")
    # Hermetic state root: chrome doors are source-anchored reads,
    # but the TS single-writer lock gate refuses a second writer on
    # a shared root — never boot the estate root from a wall.
    env = dict(os.environ)
    env["MELITE_STATE_ROOT"] = tempfile.mkdtemp(prefix="chrome-parity-")
    proc = subprocess.Popen(
        [node, "--experimental-strip-types", str(TS_SERVER)],
        cwd=str(REPO), env=env, stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
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


def main() -> int:
    try:
        port, proc = boot_ts()
    except RuntimeError as e:
        print("FATAL: %s" % e)
        return 1
    try:
        print("ts shell on :%d" % port)
        for path in DOORS:
            exp_status, exp_body = py_wire("GET", path)
            got_status, got_body, ctype = ts_get(port, path)
            if got_status is None:
                check("GET %s" % path, False, got_body.decode()[:120])
                continue
            ok = (got_status == exp_status == 200
                  and got_body == exp_body
                  and ctype.split(";")[0] == "application/json")
            note = ""
            if not ok:
                note = ("status %r/%r ctype %r py %dB ts %dB"
                        % (got_status, exp_status, ctype,
                           len(exp_body), len(got_body)))
                for i, (a, b) in enumerate(zip(exp_body, got_body)):
                    if a != b:
                        note += " first-div @%d" % i
                        break
                else:
                    if len(exp_body) != len(got_body):
                        note += " len-div"
            check("GET %s (%dB)" % (path, len(exp_body)), ok, note)

        # Unserved paths -> the py unknown-route 404 shape, byte-exact.
        exp_status, exp_body = py_wire("GET", UNKNOWN)
        got_status, got_body, _ = ts_get(port, UNKNOWN)
        check("unknown path 404 shape",
              got_status == exp_status == 404 and got_body == exp_body,
              "status %r/%r py %dB ts %dB"
              % (got_status, exp_status, len(exp_body), len(got_body)))

        # Trailing-slash + query normalization rides the match (py
        # route() strips both before dispatch).
        _, exp_plain = py_wire("GET", "/v1/health")
        _, got_slash, _ = ts_get(port, "/v1/health/")
        _, got_qs, _ = ts_get(port, "/v1/themes?x=1")
        _, exp_themes = py_wire("GET", "/v1/themes")
        check("trailing-slash normalization", got_slash == exp_plain,
              "%dB vs %dB" % (len(got_slash), len(exp_plain)))
        check("query-strip normalization", got_qs == exp_themes,
              "%dB vs %dB" % (len(got_qs), len(exp_themes)))

        # Method arms: POST on a GET-only chrome door is no such route.
        exp_status, exp_body = py_wire("POST", "/v1/health")
        got_status, got_body, _ = ts_get(port, "/v1/health", method="POST")
        check("method mismatch 404",
              got_status == exp_status == 404 and got_body == exp_body,
              "status %r/%r" % (got_status, exp_status))

        # R4.2 4xx-code normalization at the ctx.ts unit level (no
        # J-door returns 4xx over HTTP, so the invalid_request
        # fallback is pinned here, mirroring gateway.py:4347-4356).
        node = shutil.which("node")
        probe = (
            "import('%s').then(m=>{"
            "const a=m.normalize4xx(400,{error:'x'});"
            "const b=m.normalize4xx(400,{error:'x',code:'keep'});"
            "const c=m.normalize4xx(200,{a:1});"
            "const d=m.normalize4xx(404,[]);"
            "const e=m.serializePy({error:'no such route GET /v1/z',"
            "code:'no_such_route'});"
            "console.log(JSON.stringify([a,b,c,d,e]));})"
        ) % TS_CTX.as_uri()
        r = subprocess.run(
            [node, "--experimental-strip-types",
             "--input-type=module", "-e", probe],
            cwd=str(REPO), capture_output=True, text=True, timeout=60)
        unit_ok = False
        if r.returncode == 0:
            try:
                got = json.loads(r.stdout.strip().splitlines()[-1])
                unit_ok = (
                    got[0] == {"error": "x", "code": "invalid_request"}
                    and got[1] == {"error": "x", "code": "keep"}
                    and got[2] == {"a": 1}
                    and got[3] == []
                    and got[4] == ("{\n  \"error\": "
                                   "\"no such route GET /v1/z\",\n  "
                                   "\"code\": \"no_such_route\"\n}"))
            except (ValueError, IndexError, KeyError):
                unit_ok = False
        check("4xx-code normalization unit", unit_ok,
              (r.stderr or r.stdout)[-300:])
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=15)
        except subprocess.TimeoutExpired:
            proc.kill()

    print("PASS %d / FAIL %d" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())

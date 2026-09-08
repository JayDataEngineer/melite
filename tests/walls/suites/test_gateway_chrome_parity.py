#!/usr/bin/env python3
"""test_gateway_chrome_parity.py — Phase-1 TS shell wall (J1-J10), TS-ONLY.

Pins the TypeScript HTTP shell (apps/gateway/src/main.ts +
ctx.ts over the ROUTES mirror, bodies from
packages/gateway/src/doors/chrome.ts) serving the 10 chrome/health
doors:

  J1 /v1/health  J2 /v1/themes  J3 /v1/tags  J4 /v1/services
  J5 /v1/right-panes  J6 /v1/ui-slots  J7 /v1/tools
  J8 /v1/shell  J9 /v1/plugins  J10 /v1/models

Every leg pins the TS contract against frozen goldens
(golden_ts/test_gateway_chrome_parity/, causes.md there): the wall
boots the TS server on an ephemeral port via boot_scratch_gateway
(no fixed port — QUEUE LANE LAW), GETs every door, and asserts
status + byte-equality with the golden, plus the unknown-path 404
shape, trailing-slash / query normalization (both serve the base
door's golden bytes), the method-mismatch 404 golden, and the R4.2
4xx-code normalization fallback (pinned at the ctx.ts unit level:
no J-door returns 4xx over HTTP, so the fallback has no HTTP
exercise — the unit asserts add/preserve/ignore semantics of the
ctx.ts normalize4xx arm).

ORACLE DEATH 2026-09-08: re-derived TS-ONLY — the py-mirror legs
(live py dispatcher expectations captured fresh at wall runtime)
are deleted per the operator order "we do not need parity, we
need to migrate, not keep the old machinery"; the TS-SSOT golden
legs below are the wall now.

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

Run: python3 tests/walls/suites/test_gateway_chrome_parity.py
"""

import json
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

from _anchor import REPO, boot_scratch_gateway, reap_gateway

sys.dont_write_bytecode = True

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

TS_SERVER = REPO / "apps" / "gateway" / "src" / "main.ts"
TS_CTX = REPO / "packages" / "gateway" / "src" / "ctx.ts"
GOLDEN_DIR = (REPO / "tests" / "walls" / "suites" / "golden_ts" /
              "test_gateway_chrome_parity")


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def golden(name: str) -> bytes:
    return (GOLDEN_DIR / name).read_bytes()


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


def main() -> int:
    try:
        port, proc = boot_scratch_gateway()
    except RuntimeError as e:
        print("FATAL: %s" % e)
        return 1
    try:
        print("ts shell on :%d" % port)
        for path in DOORS:
            exp_body = golden(path.split("/")[-1] + ".json")
            got_status, got_body, ctype = ts_get(port, path)
            if got_status is None:
                check("GET %s" % path, False, got_body.decode()[:120])
                continue
            ok = (got_status == 200
                  and got_body == exp_body
                  and ctype.split(";")[0] == "application/json")
            note = ""
            if not ok:
                note = ("status %r ctype %r golden %dB ts %dB"
                        % (got_status, ctype,
                           len(exp_body), len(got_body)))
                for i, (a, b) in enumerate(zip(exp_body, got_body)):
                    if a != b:
                        note += " first-div @%d" % i
                        break
                else:
                    if len(exp_body) != len(got_body):
                        note += " len-div"
            check("GET %s (%dB)" % (path, len(exp_body)), ok, note)

        # Unserved paths -> the unknown-route 404 golden, byte-exact.
        exp_body = golden("unknown-404.json")
        got_status, got_body, _ = ts_get(port, UNKNOWN)
        check("unknown path 404 shape",
              got_status == 404 and got_body == exp_body,
              "status %r golden %dB ts %dB"
              % (got_status, len(exp_body), len(got_body)))

        # Trailing-slash + query normalization serve the base door's
        # golden bytes.
        _, got_slash, _ = ts_get(port, "/v1/health/")
        _, got_qs, _ = ts_get(port, "/v1/themes?x=1")
        check("trailing-slash normalization",
              got_slash == golden("health.json"),
              "%dB vs %dB" % (len(got_slash), len(golden("health.json"))))
        check("query-strip normalization",
              got_qs == golden("themes.json"),
              "%dB vs %dB" % (len(got_qs), len(golden("themes.json"))))

        # Method arms: POST on a GET-only chrome door is no such route.
        exp_body = golden("health-post-404.json")
        got_status, got_body, _ = ts_get(port, "/v1/health", method="POST")
        check("method mismatch 404",
              got_status == 404 and got_body == exp_body,
              "status %r" % (got_status,))

        # R4.2 4xx-code normalization at the ctx.ts unit level (no
        # J-door returns 4xx over HTTP, so the invalid_request
        # fallback is pinned here, against the ctx.ts arm).
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
        reap_gateway(proc)

    print("PASS %d / FAIL %d" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())

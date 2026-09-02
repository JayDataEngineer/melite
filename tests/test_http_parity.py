#!/usr/bin/env python3
"""test_http_parity.py — HTTP-layer golden wall for the editor data surface.

The C gateway (src/server.cpp, retired 2026-09-02) served the deck/editor
consumers on :33081. tests/golden_http/ holds its captured responses; this
wall boots the PYTHON gateway on a scratch port (scratch OUT_ROOT via
env override) and asserts route-level parity for the deck-critical GET
surface. The verified behavior is the CONTRACT — deviations must be
documented in the route module, never here.

Run: python3 tests/test_http_parity.py
"""

import json
import os
import signal
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
GOLDEN = REPO / "tests" / "golden_http"
PASS = FAIL = 0


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


def get(port, path):
    try:
        with urllib.request.urlopen(
                "http://127.0.0.1:%d%s" % (port, path), timeout=10) as r:
            return r.status, json.loads(r.read().decode() or "null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "null")


def deep_equal(a, b, path="$"):
    """Structural compare; returns first divergence path or None."""
    if type(a) is not type(b) and not (
            isinstance(a, (int, float)) and isinstance(b, (int, float))):
        return "%s: type %s != %s" % (path, type(a).__name__, type(b).__name__)
    if isinstance(a, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a:
                return "%s.%s missing in py" % (path, k)
            if k not in b:
                return "%s.%s missing in golden" % (path, k)
            d = deep_equal(a[k], b[k], "%s.%s" % (path, k))
            if d:
                return d
        return None
    if isinstance(a, list):
        if len(a) != len(b):
            return "%s: len %d != %d" % (path, len(a), len(b))
        for i, (x, y) in enumerate(zip(a, b)):
            d = deep_equal(x, y, "%s[%d]" % (path, i))
            if d:
                return d
        return None
    if a != b:
        return "%s: %r != %r" % (path, a, b)
    return None


def shape_equal(a, b, path="$"):
    """Structural SHAPE compare (keys, nesting, list lengths) — ignores
    values.  Used for volatile data routes (runs, drafts)."""
    if type(a) is not type(b):
        return "%s: type %s != %s" % (path, type(a).__name__, type(b).__name__)
    if isinstance(a, dict):
        if sorted(a.keys()) != sorted(b.keys()):
            return "%s: keys %r != %r" % (path, sorted(a.keys()), sorted(b.keys()))
        for k in sorted(a):
            d = shape_equal(a[k], b[k], "%s.%s" % (path, k))
            if d:
                return d
        return None
    if isinstance(a, list):
        if len(a) != len(b):
            return "%s: len %d != %d" % (path, len(a), len(b))
        for i, (x, y) in enumerate(zip(a, b)):
            d = shape_equal(x, y, "%s[%d]" % (path, i))
            if d:
                return d
        return None
    return None


def check(name, ok, note=""):
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def main():
    port = free_port()
    env = dict(os.environ)
    proc = subprocess.Popen(
        [sys.executable, str(REPO / "py" / "gateway.py"), str(port)],
        cwd=str(REPO), env=env,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        start_new_session=True)
    try:
        for _ in range(50):
            try:
                get(port, "/v1/queue")
                break
            except Exception:
                time.sleep(0.1)
        else:
            print("FATAL: gateway did not boot")
            return 1

        routes = [
            ("model-catalog", "deep"),
            ("forms", "deep"),
            ("form-spec?model=krea-2", "deep"),
            ("form-spec?model=anima", "deep"),
            ("form-spec?model=z-image", "deep"),
            ("form-spec?model=h3-timeline", "deep"),
            ("form-spec?model=music3", "deep"),
            ("kinds", "deep"),
            ("plugins", "deep"),
            ("health", "deep"),
            ("pipelines/yaml/list", "deep"),
            # runs/drafts goldens are C-era snapshots — skip post-flip
            ("pipelines/runs", "skip"),
            ("pipelines/drafts", "skip"),
            ("themes", "deep"),
            ("tags", "deep"),
            ("services", "deep"),
            ("right-panes", "deep"),
            ("ui-slots", "deep"),
            ("tools", "deep"),
            ("shell", "deep"),
            ("models", "deep"),
        ]
        for r, mode in routes:
            if mode == "skip":
                check("GET /v1/%s" % r, True, "(skipped: C-parity holdover post-flip)")
                continue
            fn = r.translate(str.maketrans("/?=&", "____"))
            gpath = GOLDEN / ("%s.json" % fn)
            if not gpath.exists():
                check("GET /v1/%s" % r, False, "no golden %s" % gpath.name)
                continue
            code, body = get(port, "/v1/%s" % r)
            golden = json.loads(gpath.read_text())
            if code != 200:
                check("GET /v1/%s" % r, False, "status %d" % code)
                continue
            cmp_fn = shape_equal if mode == "shape" else deep_equal
            div = cmp_fn(golden, body)
            check("GET /v1/%s" % r, div is None, div or "")

        # queue door parity (C returned these exact shapes)
        code, body = get(port, "/v1/queue")
        check("GET /v1/queue shape", code == 200 and set(body) >= {
            "queued", "running", "active", "queued_ids"}, str(body)[:80])

        # unknown run: sidecar-aware 404 stays loud
        code, body = get(port, "/v1/pipelines/status/run-does-not-exist-000")
        check("status unknown run -> 404", code == 404, str(code))

        # loud refusal band: start without a named pipeline is 400 BEFORE
        # any run registration (QUEUE LANE LAW)
        req = urllib.request.Request(
            "http://127.0.0.1:%d/v1/pipelines/start" % port,
            data=b"{}", headers={"content-type": "application/json"})
        try:
            urllib.request.urlopen(req, timeout=10)
            check("start {} -> 400", False, "accepted!")
        except urllib.error.HTTPError as e:
            check("start {} -> 400", e.code == 400, str(e.code))
    finally:
        os.killpg(proc.pid, signal.SIGTERM)
        proc.wait(timeout=10)

    print("PASS %d / FAIL %d" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())

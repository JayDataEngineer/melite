"""test_gateway_docs_ssot.py — P6 tail: DELETE-runs decision + docs-SSOT wall.

Two contracts, one file:

A. THE DELETE-RUNS DECISION (py cites — read fully, not a preference):
   python/gateway.py ROUTES carries exactly ONE DELETE row —
   DELETE /v1/studios/{tenant}/presets/{preset_id} (gateway.py
   4141-4147, _h_presets_delete). NO DELETE row touches
   /v1/flows/runs* (the Queue & runs block, gateway.py 4051-4095,
   is POST/GET only: start, validate, queue, status, stop, resume,
   events x2, runs list, run detail).
   python/editor_runs.py carries NO runs_delete/run_delete symbol at all
   — not even the unwired dead-code twin the drafts precedent has
   (drafts_delete, editor_runs.py 1065-1071, whose docstring says it
   "answers the unmatched-route shape rather than inventing
   persistence the gateway does not have" — and which NO route row
   references, so DELETE /v1/flows/drafts/:id falls to the
   dispatcher fallthrough, as the drafts parity wall pins).
   The runs posture is therefore the fallthrough itself:
   route() 4357-4358 answers 404 {"error": "no such route
   <METHOD> <path>", "code": "no_such_route"} (path normalized by
   target.split("?")[0].rstrip("/") or "/", 4321).
   The TS-faithful behavior is NO ARM: dispatchRuns (doors/runs.ts
   1141-1159) serves only _h_queue/_h_flows_status/_h_runs_list/
   _h_run_detail/_h_ws_fallback, and ctx.ts 555-565 answers the
   identical 404 via serializePy (byte-identical for these
   ASCII-only envelopes). There is deliberately NO runs_delete twin
   on either side — adding one would invent persistence semantics
   the gateway does not have (the exact thing drafts_delete's
   docstring refuses to do). The legs below are byte-equal EITHER
   WAY: they pin the fallthrough bytes, so a future DELETE door
   (row + arm + regen, all three, same stroke) fails LOUD here
   instead of drifting silent.

B. THE DOCS SSOT (routes.ts as the TS-side authority):
   gen_api_docs --check (endpoints.md + openapi.yaml vs the table)
   and gen_gateway_doors --check (gatewayDoors.ts vs the table) must
   both be clean; the routes.ts-vs-table direction is owned by the
   INVERTED routes-mirror wall (routes.ts AUTHORED SSOT, py mirror
   row-for-row — tools/gen_routes_mirror.py DELETED in generators
   STEP 2, so no mirror --check remains here). The regen-noop leg
   re-runs the surviving generators in write mode and proves `git
   status` is unchanged AND no GatewayDoorUrl consumer is modified
   (ZERO caller edits).

Run: pytest tests/walls/suites/test_gateway_docs_ssot.py
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

from _anchor import REPO, boot_scratch_gateway, reap_gateway

sys.dont_write_bytecode = True

import gateway  # noqa: E402  (path anchored by _anchor)
import editor_runs  # noqa: E402  (the dead-code precedent lives here)

TS_SERVER = REPO / "apps" / "gateway" / "src" / "main.ts"
ROUTES_TS = REPO / "packages" / "gateway" / "src" / "routes.ts"
DOORS_TS = REPO / "packages" / "web-kit" / "catalog" / "src" / "generated" / "gatewayDoors.ts"

TOKEN = "wall-docs-ssot-token-%d" % os.getpid()


# ── A. the decision, static legs (no boot) ──────────────────────────

def test_no_delete_runs_row_in_table() -> None:
    """No ROUTES row serves DELETE on /v1/flows/runs* — the decision's
    positive half (gateway.py 4051-4095: the runs block is POST/GET
    only)."""
    hits = [
        (row.method, row.template or row.path)
        for row in gateway.ROUTES
        if "DELETE" in row.method.split("|")
        and "flows/runs" in (row.template or row.path)
    ]
    assert not hits, "DELETE runs row exists: %r" % (hits,)


def test_only_delete_row_is_studios_presets() -> None:
    """The decision's complement: the table's SOLE DELETE row is the
    studios preset door (gateway.py 4141-4147)."""
    deletes = sorted(
        (row.template or row.path) for row in gateway.ROUTES
        if "DELETE" in row.method.split("|")
    )
    assert deletes == ["/v1/studios/{tenant}/presets/{preset_id}"], deletes


def test_no_runs_delete_dead_code() -> None:
    """editor_runs has no runs_delete twin — not even dead code (unlike
    drafts_delete, which exists AND is unwired: no row references
    it)."""
    assert not hasattr(editor_runs, "runs_delete")
    assert not hasattr(editor_runs, "run_delete")
    assert hasattr(editor_runs, "drafts_delete")  # the precedent cites
    handlers = {
        getattr(row.handler, "__name__", row.handler)
        for row in gateway.ROUTES
    }
    assert "drafts_delete" not in handlers  # unwired — the 404 precedent
    assert "_h_presets_delete" in handlers  # the wired DELETE stays wired


def test_routes_mirror_carries_decision() -> None:
    """routes.ts (the TS SSOT mirror) holds exactly one DELETE row and
    it is the studios presets arm — the mirror wall pins the rest of
    the table; this leg pins the decision's visibility on the TS
    side."""
    text = ROUTES_TS.read_text()
    assert text.count('method: "DELETE"') == 1, \
        "routes.ts DELETE row count drifted"
    at = text.find('method: "DELETE"')
    window = text[max(0, at - 600):at + 400]
    assert "/v1/studios/{tenant}/presets/{preset_id}" in window, window[-200:]


def test_doors_carry_no_delete_runs() -> None:
    """gatewayDoors.ts serves the runs GET templates (the fetchable
    URLs); doors are method-agnostic URL types, so a DELETE against
    them is a dispatch-level 404 (pinned live below), never a type."""
    text = DOORS_TS.read_text()
    assert "`/v1/flows/runs${DoorTail}`" in text
    assert "`/v1/flows/runs/${string}${DoorTail}`" in text


# ── A. the decision, live legs (dual-served py vs ts) ───────────────

def _http(port: int, path: str, method: str,
          headers: dict | None = None) -> tuple[int | None, bytes, dict]:
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


def _auth() -> dict:
    return {"Authorization": "Bearer " + TOKEN}


def _boot_ts(env: dict) -> tuple[int, "subprocess.Popen[str]"]:
    node = shutil.which("node")
    assert node is not None, "node not on PATH"
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


def _dual(ports: tuple[int, int], path: str, method: str,
          norm_path: str) -> bytes:
    """DELETE parity leg: 404 both, bodies byte-equal, envelope exact
    (the fallthrough shape, normalized path — route() 4321 strips
    trailing slashes before the match AND the error text)."""
    py_port, ts_port = ports
    ps, pb, ph = _http(py_port, path, method, _auth())
    ts, tb, th = _http(ts_port, path, method, _auth())
    assert ps == 404 and ts == 404, "status py=%r ts=%r" % (ps, ts)
    assert pb == tb, "body drift py=%r ts=%r" % (pb[:160], tb[:160])
    assert (ph.get("content-type", "").split(";")[0]
            == th.get("content-type", "").split(";")[0]
            == "application/json")
    want = {"error": "no such route %s %s" % (method, norm_path),
            "code": "no_such_route"}
    assert json.loads(pb) == want, pb[:200]
    return pb


def _servers() -> "tuple[int, int, subprocess.Popen, subprocess.Popen, str]":
    base = tempfile.mkdtemp(prefix="wall-docs-ssot-")
    root = Path(base) / "seed"
    out = root / "output" / "run-keep1"
    out.mkdir(parents=True)
    (out / "_flow.json").write_text(json.dumps({
        "run_id": "run-keep1", "status": "completed", "pipeline": "anny",
        "prompt": "keep me", "seed": 7, "created_at": 1700000001,
        "stages": [{"id": "s1", "index": 0, "status": "completed"}],
    }))
    (out / "img1.png").write_bytes(b"\x89PNG\r\n\x1a\n" + bytes(range(16)))
    (root / "drafts").mkdir(parents=True)
    py_root = Path(base) / "py-root"
    ts_root = Path(base) / "ts-root"
    shutil.copytree(root, py_root)
    shutil.copytree(root, ts_root)
    py_env = dict(os.environ, MELITE_STATE_ROOT=str(py_root),
                  DSH_GATEWAY_TOKEN=TOKEN)
    ts_env = dict(os.environ, MELITE_STATE_ROOT=str(ts_root),
                  DSH_GATEWAY_TOKEN=TOKEN)
    py_port, py_proc = boot_scratch_gateway(env=py_env)
    ts_port, ts_proc = _boot_ts(ts_env)
    return py_port, ts_port, py_proc, ts_proc, base


def test_delete_runs_live_parity() -> None:
    """The wall legs, byte-equal: DELETE detail (owned + missing id),
    DELETE collection, DELETE trailing-slash (normalization), DELETE
    deep tail, and the GET-only contrast (POST collection 404s too).
    Closes with the refusal-not-mutation pin (GET bytes unchanged)."""
    py_port, ts_port, py_proc, ts_proc, base = _servers()
    ports = (py_port, ts_port)
    try:
        before_detail = (_http(py_port, "/v1/flows/runs/run-keep1",
                               "GET", _auth())[1],
                         _http(ts_port, "/v1/flows/runs/run-keep1",
                               "GET", _auth())[1])
        before_list = (_http(py_port, "/v1/flows/runs", "GET", _auth())[1],
                       _http(ts_port, "/v1/flows/runs", "GET", _auth())[1])

        _dual(ports, "/v1/flows/runs/run-keep1", "DELETE",
              "/v1/flows/runs/run-keep1")
        _dual(ports, "/v1/flows/runs/run-nope", "DELETE",
              "/v1/flows/runs/run-nope")
        _dual(ports, "/v1/flows/runs", "DELETE", "/v1/flows/runs")
        _dual(ports, "/v1/flows/runs/run-keep1/", "DELETE",
              "/v1/flows/runs/run-keep1")
        _dual(ports, "/v1/flows/runs/a/b", "DELETE", "/v1/flows/runs/a/b")
        _dual(ports, "/v1/flows/runs", "POST", "/v1/flows/runs")
        _dual(ports, "/v1/flows/status/run-keep1", "DELETE",
              "/v1/flows/status/run-keep1")

        after_detail = (_http(py_port, "/v1/flows/runs/run-keep1",
                              "GET", _auth())[1],
                        _http(ts_port, "/v1/flows/runs/run-keep1",
                              "GET", _auth())[1])
        after_list = (_http(py_port, "/v1/flows/runs", "GET", _auth())[1],
                      _http(ts_port, "/v1/flows/runs", "GET", _auth())[1])
        assert before_detail == after_detail, "DELETE mutated a run"
        assert before_list == after_list, "DELETE mutated the listing"
        assert json.loads(after_list[0])["count"] == \
            json.loads(after_list[1])["count"] == 1
    finally:
        for proc in (py_proc, ts_proc):
            try:
                reap_gateway(proc)
            except Exception:
                pass
        shutil.rmtree(base, ignore_errors=True)


# ── B. docs-check green ─────────────────────────────────────────────

def test_gen_api_docs_check_clean() -> None:
    # RE-POINTED 2026-09-08 (generators STEP 4): the docs generator
    # is TS-native now (reads the authored routes.ts); the wall keeps
    # its leg and swaps only the reader.
    r = subprocess.run(
        ["node", "--experimental-strip-types", "--no-warnings",
         str(REPO / "packages" / "gateway" / "scripts" / "gen-api-docs.ts"),
         "--check"],
        capture_output=True, text=True, timeout=120, cwd=str(REPO))
    assert r.returncode == 0, \
        "stale generated docs — run the TS generator\n%s" % r.stdout


# tools/gen_routes_mirror.py was DELETED in generators STEP 2 (SSOT
# flip): routes.ts is authored, the py table is the checked mirror.
# The mirror direction is pinned by the inverted
# tests/walls/suites/test_routes_mirror.py (row-count + template-set
# + full-row + retired-generator + authored-marker + tsc +
# ROUTE_COUNT) — no mirror --check remains in this file.


def test_route_count_pin() -> None:
    """54 rows: a silent row add/remove breaks the SSOT triad (the
    api_doc wall owns the full surface equality; this is the tripwire
    here)."""
    assert len(gateway.ROUTES) == 54


# ── B. regen-zero-caller-edits proof ────────────────────────────────

def test_gen_gateway_doors_check_clean() -> None:
    # RE-POINTED 2026-09-08 (generators STEP 3): the doors generator
    # is TS-native now (reads the authored routes.ts); the wall keeps
    # its leg and swaps only the reader.
    r = subprocess.run(
        ["node", "--experimental-strip-types", "--no-warnings",
         str(REPO / "packages" / "web-kit" / "catalog" / "scripts"
             / "gen-gateway-doors.ts"), "--check"],
        capture_output=True, text=True, timeout=120, cwd=str(REPO))
    assert r.returncode == 0, \
        "gatewayDoors.ts stale — run the TS generator --write\n%s" % r.stdout


def _git(*args: str) -> str:
    r = subprocess.run(["git", *args], capture_output=True, text=True,
                       timeout=60, cwd=str(REPO))
    assert r.returncode == 0, "git %r failed: %s" % (args, r.stderr[-500:])
    return r.stdout


def test_regen_noop_no_caller_diff() -> None:
    """Regenerate what's generated, then prove ZERO caller edits: the
    `git status` file set is identical before/after (the regen is a
    byte-noop), and no GatewayDoorUrl consumer outside generated/
    appears in the worktree diff."""
    before = _git("status", "--short")
    for script in ("packages/gateway/scripts/gen-api-docs.ts",
                   "packages/web-kit/catalog/scripts/gen-gateway-doors.ts"):
        cmd = ["node", "--experimental-strip-types", "--no-warnings",
               str(REPO / script)]
        r = subprocess.run(cmd, capture_output=True, text=True,
                           timeout=120, cwd=str(REPO))
        assert r.returncode == 0, "%s failed\n%s" % (script, r.stderr[-1000:])
    assert _git("status", "--short") == before, \
        "regen changed the tree — the check legs above should have caught it"
    consumers = _git("grep", "-l", "GatewayDoorUrl", "--",
                     "packages").split()
    generated = {c for c in consumers if "/generated/" in c}
    assert consumers, "no GatewayDoorUrl consumers found — grep scope rotted"
    assert generated, "generated gatewayDoors.ts not in grep hits"
    dirty = set(_git("diff", "--name-only").split())
    callers = [c for c in consumers if c not in generated]
    touched = [c for c in callers if c in dirty]
    assert not touched, "regen touched callers: %r" % touched

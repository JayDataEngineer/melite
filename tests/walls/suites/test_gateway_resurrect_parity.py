#!/usr/bin/env python3
"""test_gateway_resurrect_parity.py — P5 boot-resurrect + stale-sweep parity wall.

Proves the TypeScript single queue core
(plugins/gateway/src/queue/queue.ts: resurrectRuns/bootSweep, wired
into server.ts bootState) reconciles a dead gateway's state
root exactly like the py gateway (py/gateway.py boot path 4485-4486):

  resurrect: every QUEUED sidecar with a doc-backed draft + a
             parseable _request.json + object graph rows re-queues in
             created_at order (FIFO) with a run.resurrected row;
             orphans / half-written records skip to the sweep.
  sweep:     every other stale running/queued sidecar (top-level AND
             per-stage, recursive) becomes failed with the boot note;
             queued zombies take the queued_why error (never
             executed); terminal rows (completed/failed/stopped) and
             unparseable/missing sidecars are untouched (idempotent —
             a second sweep settles nothing). Ledger run.swept
             carries state queued_lost|failed + error "boot sweep",
             then server.boot carries {port, swept, resurrected}.

RESURRECT/SWEEP MAPPING DECISIONS (py cites — read fully):
  - sweep_sidecar 2253-2288: recursive dict+list patch
    running/queued -> failed; sweep key = queued_why iff the top
    level was queued (and the note non-empty) else why; error is
    overwritten ONLY in that was-queued case; atomic tmp+rename
    indent=2 (2447-2450). Terminal/unparseable -> False, no write.
  - _rebuild 2291-2335: draft_id non-empty + drafts/<id>.json is_file
    (CARD BIRTH LAW) + _request.json parseable + FlowGraph/NodeRow
    constructible; stages/skipped/artifacts ride verbatim
    (2332-2334), error restarts "" (never copied); created_at honors
    created_at only (the C-era "created" fossil is a list-door
    concern, not the record's).
  - boot_resurrect 2338-2375: OUT_ROOT/run-*/_flow.json scan, status
    == queued filter, FIFO by created_at, register + run.resurrected
    per id; orphans/half-written skip (swept below).
  - boot_sweep 2378-2409: sorted scan, live_run_ids exempt, pre-read
    decides queued_lost vs failed, sweep + run.swept per touched id.
  - boot order main() 4485-4486: resurrect FIRST, sweep SECOND.
  - editor_runs parity (editor_runs.py 451-480, 577-584): the
    read-time string sweep covers running rows with the read-time
    note; the BOOT sweep here covers running AND queued with the
    boot notes (gateway.py ownership — the broader rule).
  - KNOWN PY BUG, NOT PORTED (gateway.py:2359): boot_resurrect calls
    doc.get on the parsed sidecar — a valid-JSON-non-object sidecar
    ([1,2], 5, "x", null) raises AttributeError (only
    OSError/ValueError skip) and the whole boot CRASHES. The same
    crash lives in boot_sweep 2396 (pre.get) and sweep_sidecar 2265
    (obj.get — a patched top-level array dies at obj["sweep"]=).
    The core skips non-objects at resurrect (never candidates) and
    leaves them untouched at sweep (no write, no ledger) — TS boots
    where py cannot, while the read doors still 500-class on
    scalars exactly as py does (status 500 +
    error/type/traceback/route, never bytes). Second unported crash
    class: float(created_at) on garbage strings at candidate time
    (~2359-2363; rebuild's own float sits inside the per-id
    try/except → skip) — the core coerces non-numbers to 0 (never
    throws).

Method — fixture state roots, five phases (no goldens anywhere):
  Phase A (dual boot-function, no scalars): seed -> pyA/tsA copies;
    py boot_resurrect+boot_sweep via a python subprocess, TS via a
    node script importing queue.ts. Counts + FIFO ids + swept
    FILE BYTES + untouched files + parsed ledger events must agree.
  Phase B (dual-serve, fresh no-scalar seed -> real py + TS boots):
    server.boot counts agree (engine differs by design:
    python-orchestrator vs ts-preview); swept files byte-equal;
    settled status/detail/list reads byte-equal (live q1/q2 rows are
    worker-racy on py — dropped from the list compare, proved live
    on the TS side in C1 instead).
  Phase C (TS-only): C1 live-serve on the phase-B TS boot (queued
    status rows + queue_position, /v1/queue, WS hello with the
    resurrected queue + queued WS hydrate); C2 boot-where-py-crashes
    (scalar seed: py direct-boot dies AttributeError, TS boots
    clean, scalars untouched, detail 200s, status 500-class pins).
  Phase D (idempotence): a second sweep settles nothing on either
    side (0/0, files unchanged).
  Phase E (banked G1–G6 py-faith legs, P5 follow-up): the gap seed
    (build_gap_seed, one queued run per behavior) boots RICH on both
    sides (py_gap/ts_gap dump per-live draft/stages/skipped/
    artifacts): live sets + rebuilt values + swept sets/bytes +
    ledger events must agree where py survives; TS-only legs where
    py crashes the whole boot.

Run: python3 tests/walls/suites/test_gateway_resurrect_parity.py
"""

import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

from _anchor import REPO, boot_scratch_gateway, reap_gateway

sys.dont_write_bytecode = True

PASS = FAIL = 0
TS_SERVER = REPO / "plugins" / "gateway" / "src" / "server.ts"
TS_QUEUE = REPO / "plugins" / "gateway" / "src" / "queue" / "queue.ts"

BOOT_WHY = ("gateway restarted (boot sweep): stale active sidecar "
            "from a dead process")
BOOT_QUEUED_WHY = ("gateway restarted before the run started "
                   "(never executed) — resubmit")


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def build_seed(root, scalars: bool = False) -> dict:
    """One fixture state root. Returns {relpath: raw bytes} for the
    untouched-file legs (resurrected + terminal + bad + scalars)."""
    from pathlib import Path as _P
    root = _P(root)
    (root / "drafts").mkdir(parents=True)
    (root / "drafts" / "d1.json").write_text("{}")
    (root / "drafts" / "d2.json").write_text("{}")
    out = root / "output"
    out.mkdir(parents=True)
    snap = {}

    def put(run_id: str, doc) -> None:
        d = out / run_id
        d.mkdir(parents=True, exist_ok=True)
        if isinstance(doc, str):
            (d / "_flow.json").write_text(doc)
        else:
            (d / "_flow.json").write_text(json.dumps(doc))
        snap["output/%s/_flow.json" % run_id] = (
            d / "_flow.json").read_bytes()

    graph1 = [{"id": "w", "type": "comfyui"}]
    put("run-q1", {"run_id": "run-q1", "status": "queued",
                   "pipeline": "anny", "draft_id": "d1",
                   "created_at": 1700000011,
                   "stages": [{"id": "w", "index": 0, "status": "pending"}],
                   "graph": graph1})
    (out / "run-q1" / "_request.json").write_text(
        json.dumps({"draft_id": "d1", "prompt": "hi"}))
    put("run-q2", {"run_id": "run-q2", "status": "queued",
                   "pipeline": "anny", "draft_id": "d2",
                   "created_at": 1700000012,
                   "stages": [{"id": "w", "index": 0, "status": "pending"}],
                   "graph": graph1})
    (out / "run-q2" / "_request.json").write_text(
        json.dumps({"draft_id": "d2", "prompt": "yo"}))
    # queued orphan (draft doc gone) — never resurrects, sweeps lost.
    put("run-qorph", {"run_id": "run-qorph", "status": "queued",
                      "pipeline": "anny", "draft_id": "gone",
                      "created_at": 1700000013})
    # stale running — sweeps failed with the boot note (per-stage too).
    put("run-r1", {"run_id": "run-r1", "status": "running",
                   "pipeline": "anny", "created_at": 1700000004,
                   "stages": [{"id": "w", "index": 0, "status": "running"}]})
    # terminal rows — the sweep must not touch them.
    put("run-done", {"run_id": "run-done", "status": "completed",
                     "pipeline": "anny", "created_at": 1700000001})
    put("run-fail", {"run_id": "run-fail", "status": "failed",
                     "pipeline": "anny", "created_at": 1700000002,
                     "error": "boom"})
    put("run-stop", {"run_id": "run-stop", "status": "stopped",
                     "pipeline": "anny", "created_at": 1700000003})
    # unparseable + sideless — both boots skip silently.
    put("run-bad", "{oops")
    (out / "run-nosidecar").mkdir(parents=True)
    if scalars:
        # valid-JSON-non-object sidecars: py boots DIE on these
        # (AttributeError at gateway.py:2359); TS must boot clean.
        for rid, text in (("run-arr", "[1,2]"), ("run-num", "5"),
                          ("run-str", '"hi"'), ("run-null", "null")):
            put(rid, text)
    return snap


def http(port: int, path: str, method: str = "GET",
         headers: dict | None = None) -> tuple:
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


def dual(py_port: int, ts_port: int, path: str, name: str) -> None:
    ps, pb, _ = http(py_port, path)
    ts, tb, _ = http(ts_port, path)
    if ps is None or ts is None:
        check(name, False, "transport py=%r ts=%r" % (pb[:80], tb[:80]))
        return
    ok = ps == ts and pb == tb
    note = ""
    if not ok:
        note = "status %r/%r py %dB ts %dB" % (ts, ps, len(pb), len(tb))
        for i, (a, b) in enumerate(zip(pb, tb)):
            if a != b:
                note += " first-div @%d %r/%r" % (
                    i, pb[max(0, i - 40):i + 40], tb[max(0, i - 40):i + 40])
                break
        else:
            if len(pb) != len(tb):
                note += " len-div"
    check(name, ok, note)


PY_BOOT_SRC = (
    "import json, sys\n"
    "sys.path.insert(0, 'py')\n"
    "sys.dont_write_bytecode = True\n"
    "import gateway as g\n"
    "gw = g.Gateway()\n"
    "r = g.boot_resurrect(gw)\n"
    "s = g.boot_sweep(tuple(gw.runs.keys()))\n"
    "print(json.dumps({'resurrected': r, 'live': sorted(gw.runs.keys()),"
    " 'swept': s}))\n"
)


def py_boot(root) -> tuple:
    """Direct-function py boot (no worker, no server). Returns
    (rc, payload-dict-or-None, stderr-tail)."""
    env = dict(os.environ, MELITE_STATE_ROOT=str(root))
    p = subprocess.run(
        [sys.executable, "-c", PY_BOOT_SRC], cwd=str(REPO), env=env,
        capture_output=True, text=True, timeout=120)
    if p.returncode != 0:
        return (p.returncode, None, (p.stderr or "")[-400:])
    try:
        return (0, json.loads(p.stdout.strip().splitlines()[-1]), "")
    except Exception as e:
        return (0, None, "unparseable py boot out: %r" % e)


TS_BOOT_SRC = (
    "import { resurrectRuns as coreResurrect,"
    " bootSweep as coreSweep } from '%s';\n"
    "const root = process.argv[2];\n"
    "const roots = { stateRoot: root, runsRoot: root + '/output',"
    " ledgerPath: root + '/output/_ledger.jsonl' };\n"
    "const live = coreResurrect(roots.stateRoot, () => {});\n"
    "const swept = coreSweep(roots.stateRoot, live);\n"
    "console.log(JSON.stringify({ resurrected: live.length,"
    " live: [...live].sort(), swept: swept.length,"
    " sweptIds: [...swept].sort() }));\n"
) % str(TS_QUEUE)


def ts_boot(root, helper: str) -> tuple:
    """Direct-function TS boot. Returns (rc, payload-or-None, tail)."""
    node = shutil.which("node")
    p = subprocess.run(
        [node, "--experimental-strip-types", helper, str(root)],
        cwd=str(REPO), capture_output=True, text=True, timeout=120)
    if p.returncode != 0:
        return (p.returncode, None, (p.stderr or "")[-400:])
    try:
        return (0, json.loads(p.stdout.strip().splitlines()[-1]), "")
    except Exception as e:
        return (0, None, "unparseable ts boot out: %r" % e)


def ledger_events(root) -> list:
    """Parsed (event, data) rows ignoring ts (clocks differ per side;
    py writes spaced json, TS compact — parsed, never bytes)."""
    from pathlib import Path as _P
    rows = []
    try:
        lines = (_P(str(root)) / "output" / "_ledger.jsonl"
                 ).read_text().splitlines()
    except OSError:
        return rows
    for line in lines:
        try:
            obj = json.loads(line)
        except ValueError:
            continue
        rows.append((obj.get("event"),
                     json.dumps(obj.get("data"), sort_keys=True)))
    return sorted(rows)


# ── Phase E: banked G1–G6 py-faith legs (P5 follow-up stroke) ──
# Each gap pins PY behavior from py/gateway.py _rebuild_run_from_record
# (2291-2335) + boot_resurrect candidates (2338-2376): dual-serve legs
# where py survives (py/ts direct-function boots must agree), TS-only
# legs where py crashes the whole boot (py rc != 0, TS boots clean).
# The seed grows one gap per stroke; queue.ts moves one gap at a time.

PY_GAP_SRC = (
    "import json, os, sys\n"
    "sys.path.insert(0, 'py')\n"
    "sys.dont_write_bytecode = True\n"
    "import gateway as g\n"
    "gw = g.Gateway()\n"
    "r = g.boot_resurrect(gw)\n"
    "o = list(gw.order)\n"
    "live = {}\n"
    "for rid in sorted(gw.runs.keys()):\n"
    "    run = gw.runs[rid]\n"
    "    live[rid] = {'draft_id': run.draft_id, 'stages': run.stages,\n"
    "                 'skipped_stages': run.skipped_stages,\n"
    "                 'artifacts': run.artifacts}\n"
    "s = g.boot_sweep(tuple(gw.runs.keys()))\n"
    "swept_ids = []\n"
    "for d in sorted(os.listdir(g.OUT_ROOT)):\n"
    "    try:\n"
    "        obj = json.loads((g.OUT_ROOT / d / '_flow.json').read_text())\n"
    "    except (OSError, ValueError):\n"
    "        continue\n"
    "    if isinstance(obj, dict) and 'sweep' in obj:\n"
    "        swept_ids.append(d)\n"
    "print(json.dumps({'resurrected': r, 'order': o, 'live': live,\n"
    " 'swept': s, 'sweptIds': swept_ids}))\n"
)

TS_GAP_SRC = (
    "import { resurrectRuns as coreResurrect,"
    " bootSweep as coreSweep } from '%s';\n"
    "const root = process.argv[2];\n"
    "const captured = {};\n"
    "const live = coreResurrect(root, (run) => {\n"
    "  captured[run.runId] = { draft_id: run.draftId, stages: run.stages,\n"
    "    skipped_stages: run.skippedStages, artifacts: run.artifacts };\n"
    "});\n"
    "const swept = coreSweep(root, live);\n"
    "const liveSorted = {};\n"
    "for (const k of Object.keys(captured).sort()) liveSorted[k] = captured[k];\n"
    "console.log(JSON.stringify({ resurrected: live.length, order: live,\n"
    " live: liveSorted,\n"
    " swept: swept.length, sweptIds: [...swept].sort() }));\n"
) % str(TS_QUEUE)

_GAP_MISSING = object()


def put_gap(out, rid: str, created: int, graph=_GAP_MISSING, **kw) -> None:
    """One queued Phase-E sidecar (+ its _request.json). graph may be
    absent (the _GAP_MISSING default), None, or any JSON shape."""
    from pathlib import Path as _P
    d = _P(str(out)) / rid
    d.mkdir(parents=True, exist_ok=True)
    doc = {"run_id": rid, "status": "queued", "pipeline": "p",
           "draft_id": "d1", "created_at": created}
    if graph is not _GAP_MISSING:
        doc["graph"] = graph
    doc.update(kw)
    (d / "_flow.json").write_text(json.dumps(doc))
    (d / "_request.json").write_text(
        json.dumps({"draft_id": "d1", "prompt": "x"}))


def build_gap_seed(root) -> None:
    """Phase-E fixture root. Grows one gap per stroke (G1..G6 below)."""
    from pathlib import Path as _P
    root = _P(root)
    # exist_ok: one bases call per gap rebuilds the (per-phase)
    # seed dir; writes below are idempotent rewrites.
    (root / "drafts").mkdir(parents=True, exist_ok=True)
    (root / "drafts" / "d1.json").write_text("{}")
    # G4: a directory named <id>.json is NOT a birth certificate
    # (is_file, gateway.py 2304-2305) — a read probe would agree on
    # files but the shapes differ, so the wall needs the real dir.
    (root / "drafts" / "ddir.json").mkdir(parents=True, exist_ok=True)
    out = root / "output"
    out.mkdir(parents=True, exist_ok=True)
    # ── G1: graph rule (FlowGraph({}) resurrects missing/empty;
    #    NodeRow extra-keys survive, mistypes orphan) ──
    put_gap(out, "run-g1-missing", 1700000101)
    put_gap(out, "run-g1-empty", 1700000102, graph=[])
    put_gap(out, "run-g1-none", 1700000103, graph=None)
    put_gap(out, "run-g1-false", 1700000104, graph=False)
    put_gap(out, "run-g1-extra", 1700000105,
            graph=[{"id": "w", "type": "c", "zzz": 1}])
    put_gap(out, "run-g1-ifstr", 1700000106,
            graph=[{"id": "w", "type": "c", "input_from": "ab"}])
    put_gap(out, "run-g1-ifempty", 1700000107,
            graph=[{"id": "w", "type": "c", "input_from": ""}])
    put_gap(out, "run-g1-nonefields", 1700000108,
            graph=[{"id": "w", "type": "c", "input_from": None,
                    "input_names": None, "outputs": None,
                    "params": None}])
    put_gap(out, "run-g1-dict", 1700000109, graph={"a": 1})
    put_gap(out, "run-g1-str", 1700000110, graph="hi")
    put_gap(out, "run-g1-rowempty", 1700000111, graph=[{}])
    put_gap(out, "run-g1-noid", 1700000112, graph=[{"type": "c"}])
    put_gap(out, "run-g1-notype", 1700000113, graph=[{"id": "w"}])
    put_gap(out, "run-g1-intid", 1700000114,
            graph=[{"id": 5, "type": "c"}])
    put_gap(out, "run-g1-emptyid", 1700000115,
            graph=[{"id": "", "type": "c"}])
    put_gap(out, "run-g1-badref", 1700000116,
            graph=[{"id": "w", "type": "c", "input_from": [""]}])
    put_gap(out, "run-g1-badrefnum", 1700000117,
            graph=[{"id": "w", "type": "c", "input_from": 5}])
    put_gap(out, "run-g1-badnames", 1700000118,
            graph=[{"id": "w", "type": "c",
                    "input_names": {"a": 1}}])
    put_gap(out, "run-g1-badparams", 1700000119,
            graph=[{"id": "w", "type": "c", "params": [1]}])
    put_gap(out, "run-g1-dup", 1700000120,
            graph=[{"id": "w", "type": "c"},
                   {"id": "w", "type": "c"}])
    put_gap(out, "run-g1-badout", 1700000121,
            graph=[{"id": "w", "type": "c", "outputs": {"a": 1}}])
    # ── G2: stages/skipped ride list(doc.get(..) or []) — dicts
    #    ride their keys, strings their chars, ints/True orphan ──
    put_gap(out, "run-g2-stages", 1700000201,
            graph=[{"id": "w", "type": "c"}],
            stages=[{"id": "w", "index": 0, "status": "pending"},
                    {"id": "x"}])
    put_gap(out, "run-g2-stageints", 1700000202,
            graph=[{"id": "w", "type": "c"}], stages=[1, 2])
    put_gap(out, "run-g2-skippedints", 1700000203,
            graph=[{"id": "w", "type": "c"}],
            skipped_stages=[1, 2])
    put_gap(out, "run-g2-skippedstr", 1700000204,
            graph=[{"id": "w", "type": "c"}],
            skipped_stages=["a", "b"])
    put_gap(out, "run-g2-stagedict", 1700000205,
            graph=[{"id": "w", "type": "c"}],
            stages={"a": 1, "b": 2})
    put_gap(out, "run-g2-stagestr", 1700000206,
            graph=[{"id": "w", "type": "c"}], stages="hi")
    put_gap(out, "run-g2-skippeddict", 1700000207,
            graph=[{"id": "w", "type": "c"}],
            skipped_stages={"a": 1})
    put_gap(out, "run-g2-skipstr", 1700000208,
            graph=[{"id": "w", "type": "c"}],
            skipped_stages="hi")
    put_gap(out, "run-g2-stageint", 1700000209,
            graph=[{"id": "w", "type": "c"}], stages=5)
    put_gap(out, "run-g2-skipint", 1700000210,
            graph=[{"id": "w", "type": "c"}], skipped_stages=5)
    put_gap(out, "run-g2-stagebool", 1700000211,
            graph=[{"id": "w", "type": "c"}], stages=True)
    # ── G3: artifacts ride [str(a) for a in (x or []) if a]
    #    (gateway.py 2334) — falsy dropped, True/None keep py
    #    spellings, containers ride py reprs (nested strings quoted,
    #    exactly str() semantics). run-g3-j05 mirrors the contention
    #    J05 run-ar vector verbatim. ──
    put_gap(out, "run-g3-j05", 1700000301,
            graph=[{"id": "w", "type": "c"}], stages="ab",
            skipped_stages=[7, "s", None],
            artifacts=["", None, 0, False, "a", True, 1, 1.5, [1],
                       {"k": 1}, 0.0])
    put_gap(out, "run-g3-nested", 1700000302,
            graph=[{"id": "w", "type": "c"}],
            artifacts=[[1, "a"], {"k": "v"}, [True, None], "x"])
    put_gap(out, "run-g3-falsy", 1700000303,
            graph=[{"id": "w", "type": "c"}],
            artifacts=[0, 0.0, "", [], {}, None, False])
    # ── G4: the birth certificate is drafts/<id>.json is_file
    #    (gateway.py 2304-2305) — numeric/bool/empty draft_ids never
    #    name a file, and a directory named <id>.json is not one. ──
    put_gap(out, "run-g4-ok", 1700000401,
            graph=[{"id": "w", "type": "c"}])
    put_gap(out, "run-g4-int", 1700000402,
            graph=[{"id": "w", "type": "c"}], draft_id=5)
    put_gap(out, "run-g4-bool", 1700000403,
            graph=[{"id": "w", "type": "c"}], draft_id=True)
    put_gap(out, "run-g4-dir", 1700000404,
            graph=[{"id": "w", "type": "c"}], draft_id="ddir")
    put_gap(out, "run-g4-empty", 1700000405,
            graph=[{"id": "w", "type": "c"}], draft_id="")
    # ── G5: created_at rides float(x or 0.0) (gateway.py 2329) —
    #    ints/floats/numeric strings (padded too) order by value,
    #    falsy (None/False/0/"") rides 0. Garbage ("abc", lists,
    #    dicts) kills the whole PY boot at candidate time
    #    (float() OUTSIDE the per-id try, ~2361-2362) — the garbage
    #    leg lives in its own root below (phase_e_g5_garbage), never
    #    in this shared seed. ──
    put_gap(out, "run-g5-int", 1700000501,
            graph=[{"id": "w", "type": "c"}])
    put_gap(out, "run-g5-float", 0,
            graph=[{"id": "w", "type": "c"}], created_at=1700000502.5)
    put_gap(out, "run-g5-numstr", 0,
            graph=[{"id": "w", "type": "c"}], created_at="1700000503")
    put_gap(out, "run-g5-spacestr", 0,
            graph=[{"id": "w", "type": "c"}], created_at=" 1700000504 ")
    put_gap(out, "run-g5-none", 0,
            graph=[{"id": "w", "type": "c"}], created_at=None)
    put_gap(out, "run-g5-false", 0,
            graph=[{"id": "w", "type": "c"}], created_at=False)
    put_gap(out, "run-g5-zero", 0,
            graph=[{"id": "w", "type": "c"}], created_at=0)
    put_gap(out, "run-g5-empty", 0,
            graph=[{"id": "w", "type": "c"}], created_at="")
    put_gap(out, "run-g5-true", 0,
            graph=[{"id": "w", "type": "c"}], created_at=True)
    # ── G6: swept-file literal fidelity (PINNED-DIVERGENCE, never a
    #    fix — post-parse TS cannot tell int from integral float).
    #    A stale RUNNING row (never resurrects, always sweeps) whose
    #    sidecar spells created_at 100.0: py's atomic_write keeps the
    #    float literal, TS writes 100. ──
    put_gap(out, "run-g6-float", 0,
            graph=[{"id": "w", "type": "c"}], created_at=100.0,
            status="running",
            stages=[{"id": "w", "index": 0, "status": "running"}])


GAP_G1_LIVE = sorted([
    "run-g1-missing", "run-g1-empty", "run-g1-none", "run-g1-false",
    "run-g1-extra", "run-g1-ifstr", "run-g1-ifempty",
    "run-g1-nonefields",
])

GAP_G1_SWEPT = sorted([
    "run-g1-dict", "run-g1-str", "run-g1-rowempty", "run-g1-noid",
    "run-g1-notype", "run-g1-intid", "run-g1-emptyid", "run-g1-badref",
    "run-g1-badrefnum", "run-g1-badnames", "run-g1-badparams",
    "run-g1-dup", "run-g1-badout",
])

GAP_G2_LIVE = sorted([
    "run-g2-stages", "run-g2-stageints", "run-g2-skippedints",
    "run-g2-skippedstr", "run-g2-stagedict", "run-g2-stagestr",
    "run-g2-skippeddict", "run-g2-skipstr",
])

GAP_G2_SWEPT = sorted([
    "run-g2-stageint", "run-g2-skipint", "run-g2-stagebool",
])

GAP_G3_LIVE = sorted([
    "run-g3-j05", "run-g3-nested", "run-g3-falsy",
])

# The contention-J05 vector, spelled out (no goldens: the dual
# rebuilt-values leg proves ts==py; this pins the py truth).
GAP_G3_J05_ARTIFACTS = ["a", "True", "1", "1.5", "[1]", "{'k': 1}"]
GAP_G3_NESTED_ARTIFACTS = ["[1, 'a']", "{'k': 'v'}", "[True, None]",
                           "x"]

GAP_G4_LIVE = ["run-g4-ok"]

GAP_G4_SWEPT = sorted([
    "run-g4-int", "run-g4-bool", "run-g4-dir", "run-g4-empty",
])

GAP_G5_LIVE = sorted([
    "run-g5-int", "run-g5-float", "run-g5-numstr", "run-g5-spacestr",
    "run-g5-none", "run-g5-false", "run-g5-zero", "run-g5-empty",
    "run-g5-true",
])

# FIFO by coerced created_at (zeros in stable scan order, then
# True==1.0, then by value) — mirrors the contention-J05 want_order
# precedent.
GAP_G5_ORDER = [
    "run-g5-empty", "run-g5-false", "run-g5-none", "run-g5-zero",
    "run-g5-true", "run-g5-int", "run-g5-float", "run-g5-numstr",
    "run-g5-spacestr",
]


def py_gap(root) -> tuple:
    """Rich py boot (no worker): returns (rc, payload-or-None, tail)."""
    env = dict(os.environ, MELITE_STATE_ROOT=str(root))
    p = subprocess.run(
        [sys.executable, "-c", PY_GAP_SRC], cwd=str(REPO), env=env,
        capture_output=True, text=True, timeout=120)
    if p.returncode != 0:
        return (p.returncode, None, (p.stderr or "")[-400:])
    try:
        return (0, json.loads(p.stdout.strip().splitlines()[-1]), "")
    except Exception as e:
        return (0, None, "unparseable py gap boot out: %r" % e)


def phase_e_gap_bases(base, helper: str, tag: str) -> tuple:
    """Dual Phase-E boots on the current gap seed. Returns
    (pyRoot, tsRoot, py, ts) or Nones when either side fails to boot.
    Unique subdirs per phase (seedE/pyE/tsE suffixed): the boots
    mutate roots in place (sweep writes + ledger appends), so sharing
    fixed dirnames across phases crashes the second copytree — and
    deleting (rmtree) would destroy the earlier phase's swept roots
    a debugger may still want."""
    seedE = base / ("seedE-" + tag)
    build_gap_seed(seedE)
    pyE, tsE = base / ("pyE-" + tag), base / ("tsE-" + tag)
    shutil.copytree(seedE, pyE)
    shutil.copytree(seedE, tsE)
    prc, py, pnote = py_gap(pyE)
    check("E py boots", prc == 0 and py is not None, pnote)
    trc, ts, tnote = ts_boot(tsE, helper)
    check("E ts boots", trc == 0 and ts is not None, tnote)
    if py is None or ts is None:
        return (None, None, None, None)
    return (pyE, tsE, py, ts)


def phase_e_g1(base, helper: str) -> None:
    # NOTE: scoped to the run-g1- prefix — later gaps share this
    # seed, and only the global ledger leg sees the whole root.
    pyE, tsE, py, ts = phase_e_gap_bases(base, helper, "g1")
    if py is None or ts is None:
        return
    ts_live = sorted(k for k in ts["live"] if k.startswith("run-g1-"))
    py_live = sorted(k for k in py["live"] if k.startswith("run-g1-"))
    check("E-G1 live sets agree + py truth",
          ts_live == py_live == GAP_G1_LIVE,
          "ts=%r py=%r" % (ts_live, py_live))
    ts_swept = [i for i in ts["sweptIds"] if i.startswith("run-g1-")]
    py_swept = [i for i in py["sweptIds"] if i.startswith("run-g1-")]
    check("E-G1 swept agree + py truth",
          ts_swept == py_swept == GAP_G1_SWEPT
          and ts["resurrected"] == py["resurrected"]
          and ts["swept"] == py["swept"],
          "ts=%r py=%r" % (ts, py))
    ok_vals = all(ts["live"].get(rid) == py["live"].get(rid)
                  for rid in GAP_G1_LIVE)
    check("E-G1 rebuilt values agree", ok_vals,
          "py=%r ts=%r" % (py["live"], ts["live"]))
    for rid in ("run-g1-dict", "run-g1-dup"):
        try:
            pb = (pyE / "output" / rid / "_flow.json").read_bytes()
            tb = (tsE / "output" / rid / "_flow.json").read_bytes()
            same = pb == tb
        except OSError:
            same = False
        check("E-G1 swept bytes " + rid, same)
    check("E-G1 ledger events agree",
          ledger_events(pyE) == ledger_events(tsE),
          "%r vs %r" % (ledger_events(tsE), ledger_events(pyE)))


def phase_e_g2(base, helper: str) -> None:
    # Scoped to the run-g2- prefix (shares the gap seed with G1).
    pyE, tsE, py, ts = phase_e_gap_bases(base, helper, "g2")
    if py is None or ts is None:
        return
    ts_live = sorted(k for k in ts["live"] if k.startswith("run-g2-"))
    py_live = sorted(k for k in py["live"] if k.startswith("run-g2-"))
    check("E-G2 live sets agree + py truth",
          ts_live == py_live == GAP_G2_LIVE,
          "ts=%r py=%r" % (ts_live, py_live))
    ok_vals = all(ts["live"].get(rid) == py["live"].get(rid)
                  for rid in GAP_G2_LIVE)
    check("E-G2 rebuilt values agree", ok_vals,
          "py=%r ts=%r" % (py["live"], ts["live"]))
    check("E-G2 verbatim int rows",
          ts["live"].get("run-g2-stageints", {}).get("stages") == [1, 2]
          and ts["live"].get("run-g2-skippedints", {}).get(
              "skipped_stages") == [1, 2],
          "%r" % (ts["live"],))
    check("E-G2 dict/str ride keys/chars",
          ts["live"].get("run-g2-stagedict", {}).get("stages")
          == ["a", "b"]
          and ts["live"].get("run-g2-stagestr", {}).get("stages")
          == ["h", "i"]
          and ts["live"].get("run-g2-skippeddict", {}).get(
              "skipped_stages") == ["a"]
          and ts["live"].get("run-g2-skipstr", {}).get(
              "skipped_stages") == ["h", "i"],
          "%r" % (ts["live"],))
    ts_swept = [i for i in ts["sweptIds"] if i.startswith("run-g2-")]
    py_swept = [i for i in py["sweptIds"] if i.startswith("run-g2-")]
    check("E-G2 int/bool rows orphan + sweep",
          ts_swept == py_swept == GAP_G2_SWEPT,
          "ts=%r py=%r" % (ts_swept, py_swept))
    try:
        pb = (pyE / "output" / "run-g2-stageint" / "_flow.json"
              ).read_bytes()
        tb = (tsE / "output" / "run-g2-stageint" / "_flow.json"
              ).read_bytes()
        same = pb == tb
    except OSError:
        same = False
    check("E-G2 swept bytes run-g2-stageint", same)


def phase_e_g3(base, helper: str) -> None:
    # Scoped to the run-g3- prefix (shares the gap seed with G1/G2).
    pyE, tsE, py, ts = phase_e_gap_bases(base, helper, "g3")
    if py is None or ts is None:
        return
    ts_live = sorted(k for k in ts["live"] if k.startswith("run-g3-"))
    py_live = sorted(k for k in py["live"] if k.startswith("run-g3-"))
    check("E-G3 live sets agree + py truth",
          ts_live == py_live == GAP_G3_LIVE,
          "ts=%r py=%r" % (ts_live, py_live))
    ok_vals = all(ts["live"].get(rid) == py["live"].get(rid)
                  for rid in GAP_G3_LIVE)
    check("E-G3 rebuilt values agree", ok_vals,
          "py=%r ts=%r" % (py["live"], ts["live"]))
    # J05 mirror: the contention vector, spelled out on both sides.
    j05_py = py["live"].get("run-g3-j05", {})
    j05_ts = ts["live"].get("run-g3-j05", {})
    check("E-G3 J05 spellings",
          j05_py.get("stages") == ["a", "b"]
          and j05_py.get("skipped_stages") == [7, "s", None]
          and j05_py.get("artifacts") == GAP_G3_J05_ARTIFACTS
          and j05_ts.get("stages") == ["a", "b"]
          and j05_ts.get("skipped_stages") == [7, "s", None]
          and j05_ts.get("artifacts") == GAP_G3_J05_ARTIFACTS,
          "py=%r ts=%r" % (j05_py, j05_ts))
    check("E-G3 falsy artifacts ride []",
          py["live"].get("run-g3-falsy", {}).get("artifacts") == []
          and ts["live"].get("run-g3-falsy", {}).get("artifacts")
          == [],
          "py=%r ts=%r" % (py["live"].get("run-g3-falsy"),
                            ts["live"].get("run-g3-falsy")))
    # Nested containers ride py reprs (nested strings quoted —
    # exactly str() semantics, gateway.py 2334).
    check("E-G3 nested reprs",
          py["live"].get("run-g3-nested", {}).get("artifacts")
          == GAP_G3_NESTED_ARTIFACTS
          and ts["live"].get("run-g3-nested", {}).get("artifacts")
          == GAP_G3_NESTED_ARTIFACTS,
          "py=%r ts=%r" % (py["live"].get("run-g3-nested"),
                            ts["live"].get("run-g3-nested")))


def phase_e_g4(base, helper: str) -> None:
    # Scoped to the run-g4- prefix (shares the gap seed with G1–G3).
    pyE, tsE, py, ts = phase_e_gap_bases(base, helper, "g4")
    if py is None or ts is None:
        return
    ts_live = sorted(k for k in ts["live"] if k.startswith("run-g4-"))
    py_live = sorted(k for k in py["live"] if k.startswith("run-g4-"))
    check("E-G4 live sets agree + py truth",
          ts_live == py_live == GAP_G4_LIVE,
          "ts=%r py=%r" % (ts_live, py_live))
    ts_swept = [i for i in ts["sweptIds"] if i.startswith("run-g4-")]
    py_swept = [i for i in py["sweptIds"] if i.startswith("run-g4-")]
    check("E-G4 numeric/dir/empty drafts orphan + sweep",
          ts_swept == py_swept == GAP_G4_SWEPT,
          "ts=%r py=%r" % (ts_swept, py_swept))
    for rid in ("run-g4-dir", "run-g4-int"):
        try:
            pb = (pyE / "output" / rid / "_flow.json").read_bytes()
            tb = (tsE / "output" / rid / "_flow.json").read_bytes()
            same = pb == tb
        except OSError:
            same = False
        check("E-G4 swept bytes " + rid, same)
    # The birth-certificate probe is read-only: the directory still
    # stands (no file conjured over it) on both sides.
    from pathlib import Path as _P
    check("E-G4 draft dir intact",
          (pyE / "drafts" / "ddir.json").is_dir()
          and not (pyE / "drafts" / "ddir.json").is_file()
          and (tsE / "drafts" / "ddir.json").is_dir()
          and not (tsE / "drafts" / "ddir.json").is_file())


def phase_e_g5(base, helper: str) -> None:
    # Scoped to the run-g5- prefix (shares the gap seed with G1–G4).
    pyE, tsE, py, ts = phase_e_gap_bases(base, helper, "g5")
    if py is None or ts is None:
        return
    ts_live = sorted(k for k in ts["live"] if k.startswith("run-g5-"))
    py_live = sorted(k for k in py["live"] if k.startswith("run-g5-"))
    check("E-G5 live sets agree + py truth",
          ts_live == py_live == GAP_G5_LIVE,
          "ts=%r py=%r" % (ts_live, py_live))
    ok_vals = all(ts["live"].get(rid) == py["live"].get(rid)
                  for rid in GAP_G5_LIVE)
    check("E-G5 rebuilt values agree", ok_vals,
          "py=%r ts=%r" % (py["live"], ts["live"]))
    ts_order = [i for i in ts.get("order", [])
                if i.startswith("run-g5-")]
    py_order = [i for i in py.get("order", [])
                if i.startswith("run-g5-")]
    check("E-G5 FIFO-by-coerced-created agree + py truth",
          ts_order == py_order == GAP_G5_ORDER,
          "ts=%r py=%r" % (ts_order, py_order))
    # Garbage created_at in its OWN root: py's candidate float()
    # kills the whole boot (ValueError outside the per-id try);
    # TS coerces 0 and boots with the row first.
    seedG = base / "seedE-g5x"
    seedG.mkdir(parents=True, exist_ok=True)
    put_gap(seedG / "output", "run-g5x-garbage", 0,
            graph=[{"id": "w", "type": "c"}], created_at="abc")
    put_gap(seedG / "output", "run-g5x-ok", 100,
            graph=[{"id": "w", "type": "c"}])
    (seedG / "drafts").mkdir(parents=True, exist_ok=True)
    (seedG / "drafts" / "d1.json").write_text("{}")
    pyG, tsG = base / "pyE-g5x", base / "tsE-g5x"
    shutil.copytree(seedG, pyG)
    shutil.copytree(seedG, tsG)
    prc, _, pnote = py_gap(pyG)
    check("E-G5 garbage kills py boot",
          prc != 0 and "ValueError" in pnote,
          "rc=%r %r" % (prc, pnote[-160:]))
    trc, tsg, tnote = ts_boot(tsG, helper)
    check("E-G5 ts coerces garbage 0 first",
          trc == 0 and tsg is not None
          and tsg["order"] == ["run-g5x-garbage", "run-g5x-ok"]
          and sorted(tsg["live"].keys())
          == ["run-g5x-garbage", "run-g5x-ok"]
          and tsg["swept"] == 0,
          "%r %r" % (tsg, tnote))


def phase_e_g6(base, helper: str) -> None:
    # PINNED-DIVERGENCE (never a fix): post-parse TS cannot tell int
    # from integral float, so a swept file carrying 100.0 keeps the
    # float literal on the py side and writes 100 on the TS side.
    # The leg pins the divergence exactly: literal spellings +
    # all-else-byte-equal + parsed-equal.
    pyE, tsE, py, ts = phase_e_gap_bases(base, helper, "g6")
    if py is None or ts is None:
        return
    check("E-G6 stale float row never resurrects",
          "run-g6-float" not in py["live"]
          and "run-g6-float" not in ts["live"])
    check("E-G6 stale float row sweeps both",
          "run-g6-float" in py["sweptIds"]
          and "run-g6-float" in ts["sweptIds"],
          "py=%r ts=%r" % (py["sweptIds"], ts["sweptIds"]))
    try:
        pb = (pyE / "output" / "run-g6-float" / "_flow.json"
              ).read_bytes()
        tb = (tsE / "output" / "run-g6-float" / "_flow.json"
              ).read_bytes()
    except OSError:
        pb, tb = b"", b""
    check("E-G6 py keeps 100.0, TS writes 100",
          pb.count(b"100.0") == 1 and b"100.0" not in tb
          and b'"created_at": 100.0' in pb
          and b'"created_at": 100' in tb,
          "py %dB ts %dB" % (len(pb), len(tb)))
    check("E-G6 all-else-byte-equal",
          pb.replace(b"100.0", b"100") == tb
          if pb and tb else False)
    try:
        parsed_same = json.loads(pb) == json.loads(tb)
    except ValueError:
        parsed_same = False
    check("E-G6 swept parsed-equal", parsed_same)


def boot_ts(env: dict) -> tuple:
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


WS_KEY = "dGhlIHNhbXBsZSBub25jZQ=="


def ws_handshake(port: int, target: str):
    s = socket.create_connection(("127.0.0.1", port), timeout=10)
    lines = ["GET %s HTTP/1.1" % target, "Host: 127.0.0.1:%d" % port,
             "Upgrade: websocket", "Connection: Upgrade",
             "Sec-WebSocket-Key: " + WS_KEY, "Sec-WebSocket-Version: 13"]
    s.sendall(("\r\n".join(lines) + "\r\n\r\n").encode())
    buf = b""
    while b"\r\n\r\n" not in buf:
        chunk = s.recv(4096)
        if not chunk:
            break
        buf += chunk
    head, _, rest = buf.partition(b"\r\n\r\n")
    return s, head.split(b"\r\n", 1)[0], rest


def ws_read_frame(s: socket.socket, rest: bytes, timeout: float = 10.0):
    s.settimeout(timeout)
    buf = rest
    while len(buf) < 2:
        buf += s.recv(4096)
    b1, b2 = buf[0], buf[1]
    opcode = b1 & 0x0F
    if opcode == 0x8:
        raise AssertionError("server closed")
    assert opcode == 0x1, "opcode %x" % opcode
    ln = b2 & 0x7F
    pos = 2
    if ln == 126:
        while len(buf) < 4:
            buf += s.recv(4096)
        ln = int.from_bytes(buf[2:4], "big")
        pos = 4
    elif ln == 127:
        while len(buf) < 10:
            buf += s.recv(4096)
        ln = int.from_bytes(buf[2:10], "big")
        pos = 10
    while len(buf) < pos + ln:
        buf += s.recv(4096)
    return buf[pos:pos + ln], buf[pos + ln:]


def ws_close(s: socket.socket) -> None:
    try:
        s.sendall(b"\x88\x80\x00\x00\x00\x00")
    except OSError:
        pass
    try:
        s.close()
    except OSError:
        pass


def main() -> int:
    base = None
    procs = []
    try:
        from pathlib import Path as _P
        base = _P(tempfile.mkdtemp(prefix="wall-resurrect-"))
        helper = str(base / "ts_boot.mjs")
        _P(helper).write_text(TS_BOOT_SRC)

        # ── Phase A: dual boot-function agreement (no scalars) ──
        seedA = base / "seedA"
        snapA = build_seed(seedA)
        pyA, tsA = base / "pyA", base / "tsA"
        shutil.copytree(seedA, pyA)
        shutil.copytree(seedA, tsA)
        prc, py, pnote = py_boot(pyA)
        check("A py boots", prc == 0 and py is not None, pnote)
        trc, ts, tnote = ts_boot(tsA, helper)
        check("A ts boots", trc == 0 and ts is not None, tnote)
        if py is None or ts is None:
            print("resurrect parity: %d passed, %d failed" % (PASS, FAIL))
            return 1
        check("A resurrected 2", py["resurrected"] == ts["resurrected"] == 2,
              "%r/%r" % (ts.get("resurrected"), py.get("resurrected")))
        check("A fifo [q1,q2]",
              py["live"] == ts["live"] == ["run-q1", "run-q2"],
              "%r/%r" % (ts["live"], py["live"]))
        check("A swept 2", py["swept"] == ts["swept"] == 2,
              "%r/%r" % (ts.get("swept"), py.get("swept")))
        py_swept = sorted(
            d for (e, d) in ledger_events(pyA) if e == "run.swept")
        ts_swept = sorted(
            d for (e, d) in ledger_events(tsA) if e == "run.swept")
        check("A swept ids {qorph,r1}",
              py_swept == ts_swept and len(py_swept) == 2
              and any("run-qorph" in d for d in py_swept)
              and any("run-r1" in d for d in py_swept),
              "%r/%r" % (ts_swept, py_swept))
        # swept FILE bytes (incl. the queued_why error on the orphan).
        for rid in ("run-qorph", "run-r1"):
            pb = (pyA / "output" / rid / "_flow.json").read_bytes()
            tb = (tsA / "output" / rid / "_flow.json").read_bytes()
            check("A swept bytes " + rid, pb == tb,
                  "py %dB ts %dB" % (len(pb), len(tb)))
        qo = json.loads(
            (tsA / "output" / "run-qorph" / "_flow.json").read_text())
        check("A orphan queued_why",
              qo.get("status") == "failed"
              and qo.get("sweep") == BOOT_QUEUED_WHY
              and qo.get("error") == BOOT_QUEUED_WHY,
              "%r" % (qo,))
        r1 = json.loads(
            (tsA / "output" / "run-r1" / "_flow.json").read_text())
        check("A running boot-why",
              r1.get("status") == "failed"
              and r1.get("sweep") == BOOT_WHY
              and "error" not in r1
              and r1["stages"] == [{"id": "w", "index": 0,
                                    "status": "failed"}],
              "%r" % (r1,))
        # untouched files on both sides.
        for rel in ("output/run-q1/_flow.json", "output/run-q2/_flow.json",
                    "output/run-done/_flow.json",
                    "output/run-fail/_flow.json",
                    "output/run-stop/_flow.json",
                    "output/run-bad/_flow.json"):
            want = snapA[rel]
            check("A untouched " + rel,
                  (pyA / rel).read_bytes() == want
                  and (tsA / rel).read_bytes() == want)
        check("A sideless ignored",
              not (pyA / "output" / "run-nosidecar" / "_flow.json").exists()
              and not (tsA / "output" / "run-nosidecar"
                       / "_flow.json").exists())
        check("A ledger events agree",
              ledger_events(pyA) == ledger_events(tsA),
              "%r vs %r" % (ledger_events(tsA), ledger_events(pyA)))

        # ── Phase B: dual-serve on fresh roots (real boots) ──
        seedB = base / "seedB"
        build_seed(seedB)
        pyB, tsB = base / "pyB", base / "tsB"
        shutil.copytree(seedB, pyB)
        shutil.copytree(seedB, tsB)
        # Dead-end engine URL: the py worker fails resurrected fake
        # graphs fast (refused) instead of dialing a default host.
        py_env = dict(os.environ, MELITE_STATE_ROOT=str(pyB),
                      COMFYUI_URL="http://127.0.0.1:9")
        ts_env = dict(os.environ, MELITE_STATE_ROOT=str(tsB),
                      COMFYUI_URL="http://127.0.0.1:9")
        py_port, py_proc = boot_scratch_gateway(env=py_env)
        procs.append(py_proc)
        ts_port, ts_proc = boot_ts(ts_env)
        procs.append(ts_proc)
        for side, root in (("py", pyB), ("ts", tsB)):
            rows = [json.loads(line) for line in
                    (root / "output" / "_ledger.jsonl").read_text()
                    .splitlines()]
            boots = [r for r in rows if r.get("event") == "server.boot"]
            want_engine = ("python-orchestrator" if side == "py"
                           else "ts-preview")
            check("B server.boot " + side,
                  len(boots) == 1
                  and boots[0]["data"].get("swept") == 2
                  and boots[0]["data"].get("resurrected") == 2
                  and boots[0]["data"].get("engine") == want_engine,
                  "%r" % (boots,))
        for rid in ("run-qorph", "run-r1"):
            pb = (pyB / "output" / rid / "_flow.json").read_bytes()
            tb = (tsB / "output" / rid / "_flow.json").read_bytes()
            check("B swept bytes " + rid, pb == tb,
                  "py %dB ts %dB" % (len(pb), len(tb)))
        for rid in ("run-done", "run-fail", "run-stop",
                    "run-r1", "run-qorph"):
            dual(py_port, ts_port, "/v1/flows/status/" + rid,
                 "B status-" + rid)
            dual(py_port, ts_port, "/v1/flows/runs/" + rid,
                 "B detail-" + rid)
        dual(py_port, ts_port,
             "/v1/flows/status/run-r1?include_log=1", "B status-r1-log")
        dual(py_port, ts_port, "/v1/flows/status/run-bad",
             "B status-bad")
        # live q1/q2 are worker-racy on py (its worker consumes the
        # resurrected work; TS holds it queued — C1 pins the TS
        # side), so the list drops them on both sides first.
        _, pb, _ = http(py_port, "/v1/flows/runs")
        _, tb, _ = http(ts_port, "/v1/flows/runs")
        try:
            [REDACTED 2026-11-05], td = json.loads(pb), json.loads(tb)
            pr = [r for r in [REDACTED 2026-11-05]["runs"]
                  if r["run_id"] not in ("run-q1", "run-q2")]
            tr = [r for r in td["runs"]
                  if r["run_id"] not in ("run-q1", "run-q2")]
            ok = ([REDACTED 2026-11-05]["count"] == td["count"] == 9
                  and len(pr) == len(tr) == 7
                  and all(json.dumps(a, indent=2, ensure_ascii=False)
                          == json.dumps(b, indent=2, ensure_ascii=False)
                          for a, b in zip(pr, tr)))
            check("B list-settled", ok,
                  "count %r/%r rows %d/%d" % (td.get("count"),
                                              [REDACTED 2026-11-05].get("count"),
                                              len(tr), len(pr)))
        except Exception as e:
            check("B list-settled", False, "unparseable %r" % e)
        # swept/terminal WS hydrates are unknown on both (neither
        # side owns them live).
        unknown = b'{"type":"run","status":"unknown"}'
        for target, n in (("/v1/flows/events/run-done", "ws-unknown-done"),
                          ("/v1/flows/events/run-r1", "ws-unknown-r1")):
            for port, side in ((py_port, "py"), (ts_port, "ts")):
                s = None
                try:
                    s, status, rest = ws_handshake(port, target)
                    if status != b"HTTP/1.1 101 Switching Protocols":
                        check("B " + n, False, "%s %r" % (side, status))
                        break
                    frame, _ = ws_read_frame(s, rest)
                    if frame != unknown:
                        check("B " + n, False,
                              "%s %r" % (side, frame[:80]))
                        break
                except Exception as e:
                    check("B " + n, False, "%s %r" % (side, e))
                    break
                finally:
                    if s is not None:
                        ws_close(s)
            else:
                check("B " + n, True)

        # ── Phase C1: TS-only live serve (the phase-B TS boot) ──
        s, body, _ = http(ts_port, "/v1/flows/status/run-q1")
        try:
            doc = json.loads(body)
            check("C1 q1 live queued",
                  s == 200 and doc.get("status") == "queued"
                  and doc.get("queue_position") == 0
                  and doc.get("error") == ""
                  and doc.get("run_id") == "run-q1"
                  and doc.get("stages") == [{"id": "w", "index": 0,
                                             "status": "pending"}],
                  "status %r %r" % (s, body[:160]))
        except Exception as e:
            check("C1 q1 live queued", False, "%r" % e)
        s, body, _ = http(ts_port, "/v1/flows/status/run-q2")
        try:
            doc = json.loads(body)
            check("C1 q2 position 1",
                  s == 200 and doc.get("status") == "queued"
                  and doc.get("queue_position") == 1,
                  "status %r %r" % (s, body[:160]))
        except Exception as e:
            check("C1 q2 position 1", False, "%r" % e)
        s, body, _ = http(ts_port, "/v1/queue")
        try:
            doc = json.loads(body)
            check("C1 queue",
                  s == 200 and doc == {"queued": 2, "running": 0,
                                       "active": "",
                                       "queued_ids": ["run-q1", "run-q2"]},
                  "status %r %r" % (s, body[:160]))
        except Exception as e:
            check("C1 queue", False, "%r" % e)
        s = None
        try:
            s, status, rest = ws_handshake(ts_port, "/v1/flows/events")
            frame, _ = ws_read_frame(s, rest)
            check("C1 ws hello",
                  status == b"HTTP/1.1 101 Switching Protocols"
                  and frame == (b'{"type":"hello","channel":"*",'
                                b'"queue_depth":2,'
                                b'"queued":["run-q1","run-q2"],'
                                b'"active":null}'),
                  "%r %r" % (status, frame[:120]))
        except Exception as e:
            check("C1 ws hello", False, "%r" % e)
        finally:
            if s is not None:
                ws_close(s)
        s = None
        try:
            s, status, rest = ws_handshake(ts_port,
                                           "/v1/flows/events/run-q1")
            frame, _ = ws_read_frame(s, rest)
            if frame != b'{"type":"run","status":"queued"}':
                check("C1 ws hydrate", False, "%r" % frame[:80])
            else:
                try:
                    ws_read_frame(s, b"", timeout=1.0)
                    check("C1 ws hydrate", False, "second frame arrived")
                except socket.timeout:
                    check("C1 ws hydrate", True)
        except Exception as e:
            check("C1 ws hydrate", False, "%r" % e)
        finally:
            if s is not None:
                ws_close(s)

        # ── Phase C2: boot where py crashes (scalar sidecars) ──
        seedC = base / "seedC"
        snapC = build_seed(seedC, scalars=True)
        tsC = base / "tsC"
        shutil.copytree(seedC, tsC)
        prc, _, pnote = py_boot(seedC)
        check("C2 py boot crashes",
              prc != 0 and "AttributeError" in pnote
              and "has no attribute 'get'" in pnote,
              "rc=%r %r" % (prc, pnote[-160:]))
        trc, ts, tnote = ts_boot(tsC, helper)
        check("C2 ts boots clean",
              trc == 0 and ts is not None and ts["resurrected"] == 2
              and ts["live"] == ["run-q1", "run-q2"]
              and ts["swept"] == 2, "%r %r" % (ts, tnote))
        for rid, text in (("run-arr", "[1,2]"), ("run-num", "5"),
                          ("run-str", '"hi"'), ("run-null", "null")):
            check("C2 scalar untouched " + rid,
                  (tsC / "output" / rid / "_flow.json").read_text()
                  == text)
        tsC_env = dict(os.environ, MELITE_STATE_ROOT=str(tsC))
        tsC_port, tsC_proc = boot_ts(tsC_env)
        procs.append(tsC_proc)
        for rid in ("run-arr", "run-num", "run-str", "run-null"):
            s, body, _ = http(tsC_port, "/v1/flows/runs/" + rid)
            check("C2 detail-200 " + rid, s == 200,
                  "status %r" % (s,))
        for rid in ("run-arr", "run-num"):
            s, body, _ = http(tsC_port, "/v1/flows/status/" + rid)
            try:
                doc = json.loads(body)
                check("C2 status-500 " + rid,
                      s == 500
                      and set(doc.keys()) == {"error", "type",
                                              "traceback", "route"}
                      and doc["route"] == "GET /v1/flows/status/" + rid,
                      "status %r keys %r" % (s, sorted(doc.keys())))
            except Exception as e:
                check("C2 status-500 " + rid, False, "%r" % e)
        s, body, _ = http(tsC_port, "/v1/queue")
        try:
            doc = json.loads(body)
            check("C2 queue",
                  s == 200 and doc.get("queued") == 2
                  and doc.get("queued_ids") == ["run-q1", "run-q2"],
                  "status %r %r" % (s, body[:160]))
        except Exception as e:
            check("C2 queue", False, "%r" % e)

        # ── Phase D: sweep idempotence (second sweep settles 0) ──
        prc, py2, pnote = py_boot(pyA)
        trc, ts2, tnote = ts_boot(tsA, helper)
        # NOTE: the direct re-boot re-registers the still-queued q1/q2
        # (ledger duplicates, like py) but sweeps nothing new — the
        # idempotence claim is the SWEPT count only.
        check("D sweep idempotent",
              prc == 0 and trc == 0 and py2 is not None
              and ts2 is not None and py2["swept"] == ts2["swept"] == 0,
              "%r/%r" % (ts2, py2))
        for rid in ("run-qorph", "run-r1"):
            check("D swept stable " + rid,
                  (pyA / "output" / rid / "_flow.json").read_bytes()
                  == (tsA / "output" / rid / "_flow.json").read_bytes())

        # ── Phase E: banked G1–G6 py-faith legs (one call per gap) ──
        gap_helper = str(base / "ts_gap.mjs")
        _P(gap_helper).write_text(TS_GAP_SRC)
        phase_e_g1(base, gap_helper)
        phase_e_g2(base, gap_helper)
        phase_e_g3(base, gap_helper)
        phase_e_g4(base, gap_helper)
        phase_e_g5(base, gap_helper)
        phase_e_g6(base, gap_helper)
    finally:
        for proc in procs:
            try:
                reap_gateway(proc)
            except Exception:
                pass
        if base is not None:
            shutil.rmtree(str(base), ignore_errors=True)
    print("resurrect parity: %d passed, %d failed" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())

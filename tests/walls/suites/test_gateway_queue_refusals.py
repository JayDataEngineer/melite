#!/usr/bin/env python3
"""test_gateway_queue_refusals.py — P5 queue-refusal wall (ladder P5 gate).

Proves the TypeScript queue core (packages/gateway/src/queue/* over the
ctx.ts seam + doors/flowsRun.ts + doors/runs.ts) refuses with the
pinned contract bytes on every queue-door refusal leg — the wall-first
port of the refusal battery (refusal legs + every refusal text/code
across the queue doors):

  Phase D — TS alone (own MELITE_STATE_ROOT), every leg TS-vs-literal
    (status + parsed body against the verbatim contract dict):
    D01 bad-JSON shape (strict start door; status 400 + code bad_json
        + "bad JSON: " prefix — the parser prose is host-shaped)
    D02 unknown route 404 no_such_route
    D03 method mismatch GET /v1/flows/start 404
    D04 method mismatch GET /v1/flows/resume/<id> 404
    S01 non-object start body 400 bad_envelope/body
    S02 string test flag 400 bad_envelope/test
    S03 missing draft_id 400 draft_required
    S04 malformed draft_id 400 draft_malformed
    S05 unknown draft_id 400 draft_unknown
    S06 retired runner knob 400 invalid_request knob text
    S07 retired pipe-carry key 400 invalid_request carry text
    S08 ambiguous doors 400 invalid_request
    S09 no flow selected 400 invalid_request
    S10 flow_inline unknown top key 400 invalid_request
    Q01 empty queue snapshot 200 (fresh boot)
    T01 status unknown run 404 unknown run_id
    P01 stop unknown run 400 run_unknown
    G01 runs-list ?limit=abc 400 limit text
    E01 events non-upgrade fallback 404 invalid_request (NOT
        no_such_route — the unmatched-route fallback owns that code;
        the WS fallback stamps invalid_request per the R4.2 rule)
    N01 run-detail unknown 404 unknown run_id
    R01 resume unknown run 400 run_unknown (NEW TS arm)
    R02 resume completed 400 run_completed (NEW TS arm)
    R03 resume queued-sidecar 400 run_not_resumable (NEW)
    R04 resume failed/draft-gone 400 run_record_unusable (NEW)
    C01 reproduce unknown 400 run_unknown (NEW TS arm)
    C02 reproduce cardless 400 run_cardless (NEW TS arm)
    C03 reproduce no-request 400 run_record_unusable (NEW)
    C04 reproduce non-object request 400 run_record_unusable (NEW)
    B01 burst 5 sequential starts all 202 (full queue never 429/503)
    B02 parallel 8 starts all 202 (contention never 409/423)
  Phase K — lock-held shape (R2 single-writer, no servers beyond the
    one TS boot): node acquireLock on the LIVE root refuses
    held-by-live-pid; fresh-root acquires answer acquired; dead-pid
    steal answers stolen.

CARRIER LEGS (cited by a retiring sibling): S03–S08 — draft_id
required / malformed / unknown, the retired runner knob, the retired
pipe-carry key, and the ambiguous-doors refusal, all over HTTP
against the TS boot. They are the verbatim contract dicts below —
kept strong, never shape-loosened.

TS cites (every leg names its contract; texts are verbatim):
  dispatcher bad-JSON shape, unknown-route, method gate +
  normalization (packages/gateway/src/ctx.ts + doors/flowsRun.ts);
  submit body / test flag / draft_required / draft_malformed /
  draft_unknown (doors/flowsRun.ts start door); retired knob + carry
  (_strict_body); ambiguous + no-flow (flow_from_body top keys);
  _h_queue snapshot; status unknown; stop unknown; runs limit; WS
  fallback (doors/runs.ts — 404 invalid_request, never
  no_such_route); run_detail unknown (doors/runs.ts); resume +
  reproduce refusals (doors/flowsRun.ts); lock
  (packages/gateway/src/queue/queue.ts acquireLock).

ORACLE DEATH 2026-09-08 (operator order verbatim: "we do not need
parity, we need to migrate, not keep the old machinery"): Phase D
used to dual-serve the retired py stack beside TS and byte-compare
every leg, Phase S re-ran a subset with py stopped, and Phase K
compared py acquire_lock against node acquireLock note-for-note.
The py side is deleted: Phase D asserts the TS bytes against the
verbatim literals directly, Phase S died with the dual serve (its
flag-flip criterion IS this file now — TS alone, green), and Phase
K pins the node lock shape against the live TS pid.

KNOWN divergences (asserted as shape, never bytes):
  - bad-JSON error TEXT embeds the host parser's message (V8
    SyntaxError) — status + code + prefix.
  - TS resume/reproduce HAPPY paths answer 400 preview_scope (the
    re-queue / exact-resubmit workers stay py-owned Phase-5 work) —
    this wall pins REFUSALS only; no resumable/replayable fixture
    asserts a 200 here.
  - TS hQueue is a static empty snapshot (live depth stays py-owned)
    — Q01 pins the empty shape; post-burst depth is never compared.
  - live-registry resume/reproduce (run_live) needs a live row whose
    id is random per boot — pinned by shape in the unit suites, not
    byte-compared here (burst ids differ per start by construction).

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

Run: python3 tests/walls/suites/test_gateway_queue_refusals.py
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import urllib.error
import urllib.request
from pathlib import Path

from _anchor import REPO, boot_scratch_gateway, reap_gateway

sys.dont_write_bytecode = True

PASS = FAIL = 0
DID = "wall-queue-draft-1"
GONE_DRAFT = "wall-gone-draft-9"
# Adjudication 2026-09-07: the P5 core is single-module lock-first —
# the lock helper lives in queue.ts (queue lane); this wall's node
# harness imports it from there (was queue/lock.ts, deleted).
TS_LOCK = REPO / "packages" / "gateway" / "src" / "queue" / "queue.ts"
WF = {"1": {"class_type": "EmptyLatentImage",
            "inputs": {"width": 64, "height": 64, "batch_size": 1}}}


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def http(port: int, path: str, body: bytes | None = None,
         method: str | None = None) -> tuple[int | None, bytes]:
    req = urllib.request.Request(
        "http://127.0.0.1:%d%s" % (port, path),
        data=body if body is not None else None,
        method=method or ("POST" if body is not None else "GET"))
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:
        return None, ("TRANSPORT " + str(e)).encode()


def start_body(draft: str = DID) -> bytes:
    return json.dumps({
        "flow_inline": {"id": "wall-run", "stages": [
            {"id": "gen", "engine": "comfyui",
             "params": {"workflow": WF, "timeout_s": 60}}]},
        "draft_id": draft}).encode()


def write_flow(root: Path, run_id: str, doc: dict,
               request: object | None = None,
               with_request: bool = True) -> None:
    d = root / "output" / run_id
    d.mkdir(parents=True, exist_ok=True)
    (d / "_flow.json").write_text(json.dumps(doc))
    if with_request:
        (d / "_request.json").write_text(json.dumps(
            request if request is not None else
            {"flow_inline": {"id": "wall-run", "stages": []},
             "draft_id": DID}))


def base_flow(run_id: str, status: str, draft: str = DID) -> dict:
    return {"run_id": run_id, "status": status, "error": "",
            "stages": [], "skipped_stages": [], "artifacts": [],
            "created_at": 100.0, "test": False, "draft_id": draft,
            "pipeline": "queue-wall", "graph": []}


def node_lock(root: str) -> dict:
    harness = Path(tempfile.gettempdir()) / (
        "wall-queue-lock-%d.mts" % os.getpid())
    if not harness.is_file():
        harness.write_text(
            "import { acquireLock } from %s;\n"
            "const out = acquireLock(process.argv[2] ?? \"\");\n"
            "console.log(JSON.stringify(out));\n"
            % json.dumps(TS_LOCK.as_uri()))
    proc = subprocess.run(
        [shutil.which("node") or "node", "--experimental-strip-types",
         "--no-warnings", str(harness), root],
        cwd=str(REPO), capture_output=True, text=True, timeout=60)
    line = (proc.stdout or "").strip().splitlines()
    if not line:
        return {"ok": False,
                "note": "harness no output rc=%d %s"
                % (proc.returncode, (proc.stderr or "")[-200:])}
    try:
        doc = json.loads(line[-1])
        return doc if isinstance(doc, dict) else {"ok": False, "note": "shape"}
    except ValueError:
        return {"ok": False, "note": "unparsable %r" % line[-1][:120]}


def main() -> int:
    ts_root = Path(tempfile.mkdtemp(prefix="wall-qref-ts-"))
    ts_proc = None
    try:
        (ts_root / "drafts").mkdir(parents=True)
        (ts_root / "drafts" / (DID + ".json")).write_text(
            json.dumps({"draft_id": DID}))
        ts_port, ts_proc = boot_scratch_gateway(env=dict(
            os.environ, MELITE_STATE_ROOT=str(ts_root)))

        def ts(path: str, body: bytes | None, method: str | None,
               leg: str, want: dict,
               want_status: int = 400) -> None:
            st, raw = http(ts_port, path, body, method=method)
            check("%s status ts=%r" % (leg, st),
                  st == want_status,
                  "ts=%r" % (st,))
            try:
                doc = json.loads(raw.decode() or "{}")
            except ValueError:
                doc = {}
            check("%s body" % leg,
                  st == want_status and doc == want,
                  "ts=%r" % (raw[:200],))

        # ── Phase D: dispatcher legs ──
        st, raw = http(ts_port, "/v1/flows/start", b"{bad")
        try:
            dts = json.loads(raw.decode() or "{}")
        except ValueError:
            dts = {}
        check("D01 bad JSON ts shape",
              st == 400 and str(dts.get("error", "")).startswith("bad JSON: ")
              and dts.get("code") == "bad_json", raw[:140].decode("utf8", "replace"))
        ts("/v1/queue-no-such-door", None, "GET", "D02 unknown route",
           {"error": "no such route GET /v1/queue-no-such-door",
            "code": "no_such_route"}, want_status=404)
        ts("/v1/flows/start", None, "GET", "D03 start method",
           {"error": "no such route GET /v1/flows/start",
            "code": "no_such_route"}, want_status=404)
        ts("/v1/flows/resume/wall-no-such-run", None, "GET",
           "D04 resume method",
           {"error": "no such route GET /v1/flows/resume/wall-no-such-run",
            "code": "no_such_route"}, want_status=404)

        # ── Phase D: start-door legs ──
        ts("/v1/flows/start", b"[1,2]", "POST", "S01 non-object",
           {"error": "request body must be a JSON object",
            "code": "bad_envelope", "loc": "body",
            "expected": "object", "got": "list"})
        ts("/v1/flows/start", json.dumps(
            {"flow_inline": {}, "draft_id": DID,
             "test": "false"}).encode(), "POST", "S02 test flag",
           {"error": "test flag must be a boolean (got str 'false')",
            "code": "bad_envelope", "loc": "test",
            "expected": "boolean", "got": "str"})
        # CARRIER S03 — draft_id required (cited by retiring sibling).
        ts("/v1/flows/start", json.dumps(
            {"flow_inline": {"id": "w", "stages": []}}).encode(),
            "POST", "S03 draft required",
            {"error": "draft_id is required — every run is born from an "
             "action card (CARD BIRTH LAW); compose the card first: "
             "POST /v1/flows/drafts, then start with its draft_id "
             "(docs/cards/draft-door.md)",
             "code": "draft_required", "loc": "draft_id",
             "expected": "doc-backed draft id", "got": "absent"})
        # CARRIER S04 — draft_id malformed (cited by retiring sibling).
        ts("/v1/flows/start", json.dumps(
            {"flow_inline": {"id": "w", "stages": []},
             "draft_id": "!!"}).encode(), "POST", "S04 draft malformed",
           {"error": "draft_id malformed (96 char cap, "
            "[A-Za-z0-9_-] only): '!!'",
            "code": "draft_malformed", "loc": "draft_id",
            "expected": "[A-Za-z0-9_-]{1,96}", "got": "!!"})
        # CARRIER S05 — draft_id unknown (cited by retiring sibling).
        ts("/v1/flows/start", json.dumps(
            {"flow_inline": {"id": "w", "stages": []},
             "draft_id": "wall-no-such-draft"}).encode(),
            "POST", "S05 draft unknown",
            {"error": "unknown draft_id 'wall-no-such-draft' — no card "
             "doc at drafts/wall-no-such-draft.json; compose the card "
             "first: POST /v1/flows/drafts",
             "code": "draft_unknown", "loc": "draft_id",
             "expected": "existing card doc",
             "got": "wall-no-such-draft"})
        # CARRIER S06 — retired runner knob (cited by retiring sibling).
        ts("/v1/flows/start", json.dumps(
            {"flow_inline": {"id": "w", "stages": []},
             "draft_id": DID, "start_from": 1}).encode(),
            "POST", "S06 retired knob",
            {"error": "request body carries retired runner knob(s) "
             "['start_from'] — the runner never reads these "
             "(silent-drop class); remove them",
             "code": "invalid_request"})
        # CARRIER S07 — retired pipe-carry key (cited by retiring sibling).
        ts("/v1/flows/start", json.dumps(
            {"flow_inline": {"id": "w", "stages": []},
             "draft_id": DID, "pipe": "x"}).encode(),
            "POST", "S07 retired carry",
            {"error": "request body carries retired pipe-carry key(s) "
             "['pipe'] — the 2026-08-10 stowaway wire: no gateway ever "
             "stashed it (flow_doc was never emitted). The revive rail "
             "is the draft (draft_id) + the run registry; card bodies "
             "carry params only",
             "code": "invalid_request"})
        # CARRIER S08 — ambiguous doors (cited by retiring sibling).
        ts("/v1/flows/start", json.dumps(
            {"flow_inline": {"id": "w", "stages": []},
             "draft_id": DID, "model": "x"}).encode(),
            "POST", "S08 ambiguous",
            {"error": "ambiguous request: names ['flow_inline', "
             "'model'] — provide exactly one of flow, flow_inline, "
             "model",
             "code": "invalid_request"})
        ts("/v1/flows/start", json.dumps(
            {"draft_id": DID}).encode(),
            "POST", "S09 no flow",
            {"error": "no flow selected: provide flow, flow_inline "
             "or model",
             "code": "invalid_request"})
        ts("/v1/flows/start", json.dumps(
            {"flow_inline": {"id": "w",
                            "stages": [{"id": "gen", "engine": "comfyui",
                                        "params": {"workflow": WF}}],
                            "yaml": 1},
             "draft_id": DID}).encode(),
            "POST", "S10 inline top key",
            {"error": "flow body carries unknown keys ['yaml'] — "
             "allowed: ['description', 'id', 'stages']",
             "code": "invalid_request"})

        # ── Phase D: queue / status / stop / list / events / detail ──
        ts("/v1/queue", None, "GET", "Q01 empty queue",
           {"queued": 0, "running": 0, "active": "",
            "queued_ids": []}, want_status=200)
        ts("/v1/flows/status/wall-no-such-run", None, "GET",
           "T01 status unknown",
           {"error": "unknown run_id", "code": "invalid_request"},
           want_status=404)
        ts("/v1/flows/stop/wall-no-such-run", b"", "POST",
           "P01 stop unknown",
           {"error": "unknown run_id 'wall-no-such-run'",
            "code": "run_unknown", "loc": "run_id"})
        ts("/v1/flows/runs?limit=abc", None, "GET", "G01 limit garbage",
           {"error": "limit must be an integer (got 'abc')",
            "code": "invalid_request"})
        # NOTE: _h_ws_fallback returns NO code, so the dispatcher
        # normalization stamps invalid_request — NOT no_such_route
        # (that code lives on the unmatched-route fallback only).
        ts("/v1/flows/events/wall-no-such-run", None, "GET",
           "E01 events fallback",
           {"error": "no such route GET /v1/flows/events/wall-no-such-run",
            "code": "invalid_request"}, want_status=404)
        ts("/v1/flows/runs/wall-no-such-run", None, "GET",
           "N01 detail unknown",
           {"error": "unknown run_id", "code": "invalid_request"},
           want_status=404)

        # ── Phase D: resume / reproduce fixtures ──
        write_flow(ts_root, "run-resume-done",
                   base_flow("run-resume-done", "completed"))
        write_flow(ts_root, "run-resume-queued",
                   base_flow("run-resume-queued", "queued"))
        write_flow(ts_root, "run-resume-unusable",
                   dict(base_flow("run-resume-unusable", "failed",
                                  GONE_DRAFT),
                        stages=[{"id": "gen", "name": "gen", "index": 0,
                                 "status": "failed", "outputs": {},
                                 "expected": {}, "error": "boom"}]))
        write_flow(ts_root, "run-rep-cardless",
                   base_flow("run-rep-cardless", "completed", ""),
                   with_request=False)
        write_flow(ts_root, "run-rep-noreq",
                   base_flow("run-rep-noreq", "completed"),
                   with_request=False)
        write_flow(ts_root, "run-rep-nonobj",
                   base_flow("run-rep-nonobj", "completed"),
                   request=[1, 2])
        ts("/v1/flows/resume/wall-no-such-run", b"", "POST",
           "R01 resume unknown",
           {"error": "no durable record for run 'wall-no-such-run'",
            "code": "run_unknown", "loc": "run_id"})
        ts("/v1/flows/resume/run-resume-done", b"", "POST",
           "R02 resume completed",
           {"error": "run run-resume-done completed — nothing to resume",
            "code": "run_completed", "loc": "run_id",
            "expected": "failed|stopped", "got": "completed"})
        ts("/v1/flows/resume/run-resume-queued", b"", "POST",
           "R03 resume not-resumable",
           {"error": "run run-resume-queued is 'queued' — resume needs "
            "failed or stopped",
            "code": "run_not_resumable", "loc": "run_id",
            "expected": "failed|stopped", "got": "queued"})
        ts("/v1/flows/resume/run-resume-unusable", b"", "POST",
           "R04 resume unusable",
           {"error": "run run-resume-unusable record is unusable (draft "
            "doc gone or half-written) — resubmit instead",
            "code": "run_record_unusable", "loc": "run_id"})
        ts("/v1/flows/reproduce/wall-no-such-run", b"", "POST",
           "C01 reproduce unknown",
           {"error": "no durable record for run 'wall-no-such-run'",
            "code": "run_unknown", "loc": "run_id"})
        ts("/v1/flows/reproduce/run-rep-cardless", b"", "POST",
           "C02 reproduce cardless",
           {"error": "run run-rep-cardless is a cardless legacy row (no "
            "draft_id) — compose a fresh card to replay it",
            "code": "run_cardless", "loc": "draft_id",
            "expected": "doc-backed draft id", "got": "absent"})
        ts("/v1/flows/reproduce/run-rep-noreq", b"", "POST",
           "C03 reproduce no-request",
           {"error": "run run-rep-noreq has no recorded request body — "
            "cannot replay",
            "code": "run_record_unusable", "loc": "run_id"})
        ts("/v1/flows/reproduce/run-rep-nonobj", b"", "POST",
           "C04 reproduce non-object",
           {"error": "run run-rep-nonobj recorded a non-object request "
            "body",
            "code": "run_record_unusable", "loc": "run_id",
            "expected": "object", "got": "list"})

        # ── Phase D: full-queue + contention (never a refusal) ──
        burst_ok = True
        for i in range(5):
            st, raw = http(ts_port, "/v1/flows/start", start_body())
            if st != 202:
                burst_ok = False
            try:
                doc = json.loads(raw.decode() or "{}")
            except ValueError:
                doc = {}
            if st != 202 or "run_id" not in doc:
                burst_ok = False
        check("B01 burst 5 all 202", burst_ok, "a start refused under depth")
        cont_ok = True
        cont_lock = threading.Lock()

        def fire(port: int) -> None:
            nonlocal cont_ok
            st, raw = http(port, "/v1/flows/start", start_body())
            with cont_lock:
                if st != 202:
                    cont_ok = False

        threads = [threading.Thread(target=fire, args=(ts_port,))
                   for _ in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        check("B02 parallel 8 all 202", cont_ok, "contention refused")

        # ── Phase K: lock-held shape (the TS boot holds ts_root) ──
        want_held = "gateway.lock held by live pid %d" % ts_proc.pid
        kts = node_lock(str(ts_root))
        check("K02 node acquire refuses held-by-live-pid",
              kts.get("ok") is False and kts.get("note") == want_held,
              "%r" % kts)
        fresh_ts = tempfile.mkdtemp(prefix="wall-qref-lockts-")
        try:
            fts = node_lock(fresh_ts)
            check("K03 node fresh acquires",
                  fts == {"ok": True, "note": "acquired"}, "%r" % fts)
        finally:
            shutil.rmtree(fresh_ts, ignore_errors=True)
        dead_ts = tempfile.mkdtemp(prefix="wall-qref-deadts-")
        try:
            Path(dead_ts, "gateway.lock").write_text("999999999")
            sts = node_lock(dead_ts)
            check("K04 node steals dead pid",
                  sts == {"ok": True,
                          "note": "stolen from dead pid 999999999"},
                  "%r" % sts)
        finally:
            shutil.rmtree(dead_ts, ignore_errors=True)
    finally:
        if ts_proc is not None:
            try:
                reap_gateway(ts_proc)
            except Exception:
                pass
        shutil.rmtree(ts_root, ignore_errors=True)
    print("queue refusals: %d passed, %d failed" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())

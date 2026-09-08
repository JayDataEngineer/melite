#!/usr/bin/env python3
"""test_gateway_card_run_e2e.py — the TS card-composer arm e2e wall.

The card lane's honest end-to-end test: boot the TS gateway ALONE on
a scratch root, POST {model:} runs at /v1/flows/start, and prove the
in-process composer arm (packages/gateway-doors/src/doors/flowsCard.ts —
resolve -> sweep -> overlay -> compose -> the single stage row ->
the engine layer) reaches a real PNG off the live managed ComfyUI
(http://127.0.0.1:18466), with the R3 durable queue (verbatim
_request.json, the _flow.json sidecar document, the run.queued
ledger row) landing beside it.

Date: 2026-09-08. Status: landed (card-lane port stroke).

Legs (fast refusal legs first — no GPU burned before the arm is
proven; ONE GPU run at the end):
  R1 unknown model -> 400 invalid_request "no model unit".
  R2 illegal model id -> 400 invalid_request "not a legal identifier".
  R3 missing prompt -> 400 card_compose phase-1 voice, and NOTHING
     registered (no run.queued ledger row, no output dir).
  R4 unknown variant -> 400 card_compose phase-1 "unknown variant".
  R5 ambiguous doors ({model:} + {flow_inline:}) -> 400 invalid_request.
  R6 the GPU run: draft -> start {model: z-image, ...steps 8} ->
     202 queued -> poll /v1/flows/status/ to completed -> the stage
     row id is the card skeleton ("generate") -> artifacts non-empty
     -> artifact bytes carry PNG magic.
  R7 the durable queue: the ledger's run.queued row names the run +
     draft + pipeline; _request.json is the verbatim posted body;
     _flow.json carries the run id + the single comfyui graph row.

Gating: the live managed engine must answer at :18466 or the wall
SKIPS (same doctrine as test_e2e_run.py — the data-plane walls pin
the wire; this wall runs wherever a GPU + comfyui are wired up).

Run: python3 tests/walls/suites/test_gateway_card_run_e2e.py
  (or infra/python/.venv/bin/python -m pytest tests/walls/suites/test_gateway_card_run_e2e.py -q)
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from collections.abc import Iterator

import pytest

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)))))
TS_SERVER = os.path.join(REPO, "apps", "gateway", "src", "main.ts")
COMFYUI_URL = "http://127.0.0.1:18466"

GPU_BODY = {
    "model": "z-image",
    "prompt": "wall e2e test: a solid blue square on a white background",
    "width": 512, "height": 512,
    "steps": 8, "cfg": 1.0,
    "sampler": "res_multistep", "scheduler": "simple",
    "seed": 1,
}


def _http(port: int, method: str, path: str, body=None, timeout: int = 20):
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        "http://127.0.0.1:%d/%s" % (port, path), data=data,
        headers={"content-type": "application/json"}, method=method)
    try:
        r = urllib.request.urlopen(req, timeout=timeout)
        raw = r.read()
        try:
            return r.status, json.loads(raw.decode("utf-8"))
        except ValueError:
            return r.status, raw
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw.decode("utf-8"))
        except ValueError:
            return e.code, raw
    except Exception as e:
        return None, {"_transport": str(e)}


def _engine_live() -> bool:
    try:
        r = urllib.request.urlopen(COMFYUI_URL + "/system_stats", timeout=8)
        return r.status == 200
    except Exception:
        return False


@pytest.fixture(scope="module")
def ts_card_root() -> Iterator[tuple[int, str]]:
    """Boot the TS gateway alone on a scratch root (py never booted)."""
    if not _engine_live():
        pytest.skip("managed ComfyUI unreachable at %s" % COMFYUI_URL)
    node = shutil.which("node")
    assert node is not None, "node not on PATH"
    root = tempfile.mkdtemp(prefix="ts-card-e2e-")
    env = dict(os.environ)
    env["MELITE_STATE_ROOT"] = root
    env["COMFYUI_URL"] = COMFYUI_URL
    proc = subprocess.Popen(
        [node, "--experimental-strip-types", TS_SERVER],
        cwd=REPO, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        text=True, start_new_session=True, env=env)
    assert proc.stdout is not None
    port = 0
    deadline = time.time() + 30
    while time.time() < deadline:
        line = proc.stdout.readline()
        if line.startswith("READY "):
            port = int(line.split()[1])
            break
        if proc.poll() is not None:
            raise RuntimeError("ts server exited rc=%d" % proc.returncode)
    assert port, "ts server did not print READY"
    yield port, root
    try:
        proc.terminate()
    except Exception:
        pass


def _draft(port: int, body: dict) -> str:
    code, doc = _http(port, "POST", "v1/flows/drafts", body)
    assert code == 200, "draft refused: %s %s" % (code, doc)
    assert isinstance(doc, dict) and doc.get("draftId"), (
        "draft returned no draftId: %s" % (doc,))
    return str(doc["draftId"])


def _ledger_rows(root: str) -> list:
    path = os.path.join(root, "output", "_ledger.jsonl")
    if not os.path.exists(path):
        return []
    rows = []
    for line in open(path, encoding="utf-8"):
        line = line.strip()
        if line:
            rows.append(json.loads(line))
    return rows


def test_r1_unknown_model_refuses(ts_card_root) -> None:
    port, _root = ts_card_root
    did = _draft(port, {"model": "z-image", "prompt": "x"})
    code, doc = _http(port, "POST", "v1/flows/start",
                      {"model": "probe-no-such-model", "prompt": "x",
                       "draft_id": did})
    assert code == 400, "expected 400, got %s %s" % (code, doc)
    assert doc.get("code") == "invalid_request", doc
    assert "no model unit for model: probe-no-such-model" in str(
        doc.get("error")), doc


def test_r2_illegal_model_id_refuses(ts_card_root) -> None:
    port, _root = ts_card_root
    did = _draft(port, {"model": "z-image", "prompt": "x"})
    code, doc = _http(port, "POST", "v1/flows/start",
                      {"model": "Bad!", "prompt": "x", "draft_id": did})
    assert code == 400, "expected 400, got %s %s" % (code, doc)
    assert doc.get("code") == "invalid_request", doc
    assert "not a legal identifier" in str(doc.get("error")), doc


def test_r3_missing_prompt_phase1_registers_nothing(ts_card_root) -> None:
    port, root = ts_card_root
    did = _draft(port, {"model": "z-image", "prompt": "x"})
    before_dirs = set(os.listdir(os.path.join(root, "output"))) \
        if os.path.isdir(os.path.join(root, "output")) else set()
    before_runs = {
        r["data"].get("run_id")
        for r in _ledger_rows(root) if r.get("event") == "run.queued"}
    code, doc = _http(port, "POST", "v1/flows/start",
                      {"model": "z-image", "draft_id": did})
    assert code == 400, "expected 400, got %s %s" % (code, doc)
    assert doc.get("code") == "card_compose", doc
    assert str(doc.get("error", "")).startswith(
        "card_compose phase 1:"), doc
    after_runs = {
        r["data"].get("run_id")
        for r in _ledger_rows(root) if r.get("event") == "run.queued"}
    assert after_runs == before_runs, (
        "phase-1 refusal registered a run: %s" % (after_runs - before_runs))
    out = os.path.join(root, "output")
    after_dirs = set(os.listdir(out)) if os.path.isdir(out) else set()
    assert after_dirs == before_dirs, (
        "phase-1 refusal created output dirs: %s" % (after_dirs - before_dirs))


def test_r4_unknown_variant_refuses(ts_card_root) -> None:
    port, _root = ts_card_root
    did = _draft(port, {"model": "z-image", "prompt": "x"})
    code, doc = _http(port, "POST", "v1/flows/start",
                      {"model": "z-image", "prompt": "x", "variant": "nope",
                       "draft_id": did})
    assert code == 400, "expected 400, got %s %s" % (code, doc)
    assert doc.get("code") == "card_compose", doc
    assert "unknown variant" in str(doc.get("error")), doc


def test_r5_ambiguous_doors_refuse(ts_card_root) -> None:
    port, _root = ts_card_root
    did = _draft(port, {"model": "z-image", "prompt": "x"})
    code, doc = _http(port, "POST", "v1/flows/start",
                      {"model": "z-image",
                       "flow_inline": {"id": "w", "stages": []},
                       "draft_id": did})
    assert code == 400, "expected 400, got %s %s" % (code, doc)
    assert doc.get("code") == "invalid_request", doc
    assert "ambiguous request" in str(doc.get("error")), doc


def test_r6_card_run_reaches_a_real_png(ts_card_root) -> None:
    port, _root = ts_card_root
    did = _draft(port, dict(GPU_BODY))
    code, doc = _http(port, "POST", "v1/flows/start",
                      {**GPU_BODY, "draft_id": did}, timeout=120)
    assert code == 202, "card start failed: %s %s" % (code, doc)
    assert doc.get("status") == "queued", doc
    run_id = doc.get("run_id")
    assert run_id, "start returned no run_id: %s" % (doc,)
    final = None
    deadline = time.time() + 420
    while time.time() < deadline:
        time.sleep(3)
        c, b = _http(port, "GET", "v1/flows/status/" + str(run_id))
        if c != 200 or not isinstance(b, dict):
            continue
        if b.get("status") in ("completed", "failed", "stopped"):
            final = b
            break
    assert final is not None, "run %s never reached terminal" % (run_id,)
    assert final.get("status") == "completed", (
        "card run failed: %s" % (final,))
    stages = final.get("stages") or []
    assert len(stages) == 1, "expected the single rim row: %s" % (stages,)
    assert stages[0].get("id") == "generate", (
        "stage row id is not the card skeleton: %s" % (stages,))
    arts = final.get("artifacts") or []
    assert arts, "completed card run has no artifacts: %s" % (final,)
    # the servable URL is the stage's url (run.artifacts are raw
    # harvest paths, not wire URLs — the settle block builds
    # stage["url"] = /v1/assets/runs/<id>/<rel> beside them).
    url = str(stages[0].get("url") or "")
    if not url:
        first = arts[0]
        url = first if isinstance(first, str) else str(
            first.get("url") or first.get("name") or "")
    assert url, "artifact entry has no url: %s" % (stages[0],)
    # the harvest URL rides verbatim (it names the stage subdir, e.g.
    # /v1/assets/runs/<id>/generate/SaveImage…png — last-segment-only
    # breaks it); anything else resolves under the run prefix.
    if url.startswith("/v1/assets/runs/"):
        asset_path = url.lstrip("/")
    elif url.startswith("http"):
        asset_path = url
    else:
        name = url.rsplit("/", 1)[-1]
        assert name, "artifact entry has no name: %s" % (first,)
        asset_path = "v1/assets/runs/%s/%s" % (run_id, name)
    c, buf = _http(port, "GET", asset_path, timeout=60)
    assert c == 200 and isinstance(buf, bytes) and len(buf) > 1000, (
        "artifact fetch failed: %s %d bytes" % (c, len(buf or b"")))
    assert buf[:4] == b"\x89PNG", (
        "artifact bytes are not a PNG: %r" % (buf[:8],))
    test_r6_card_run_reaches_a_real_png.run_id = run_id  # type: ignore
    test_r6_card_run_reaches_a_real_png.draft_id = did  # type: ignore


def test_r7_durable_queue_lands(ts_card_root) -> None:
    port, root = ts_card_root
    run_id = getattr(test_r6_card_run_reaches_a_real_png, "run_id", None)
    draft_id = getattr(test_r6_card_run_reaches_a_real_png, "draft_id", None)
    assert run_id, "R6 did not run — refusing to assert on a ghost"
    queued = [r for r in _ledger_rows(root)
              if r.get("event") == "run.queued"
              and r.get("data", {}).get("run_id") == run_id]
    assert len(queued) == 1, (
        "run.queued ledger rows for %s: %d" % (run_id, len(queued)))
    assert queued[0]["data"].get("draft_id") == draft_id, queued[0]
    assert queued[0]["data"].get("pipeline") == "z-image", queued[0]
    rundir = os.path.join(root, "output", run_id)
    req = json.load(open(os.path.join(rundir, "_request.json"),
                         encoding="utf-8"))
    assert req.get("model") == "z-image" and req.get("draft_id") == draft_id \
        and req.get("prompt") == GPU_BODY["prompt"], req
    flow = json.load(open(os.path.join(rundir, "_flow.json"),
                          encoding="utf-8"))
    assert flow.get("run_id") == run_id, flow
    assert flow.get("status") == "queued", flow
    graph = flow.get("graph") or []
    assert len(graph) == 1 and graph[0].get("id") == "generate" \
        and graph[0].get("type") == "comfyui" \
        and isinstance(graph[0].get("params", {}).get("workflow"), dict), flow


def main() -> int:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    rc = pytest.main([os.path.abspath(__file__), "-q", "-p", "no:cacheprovider"])
    return rc if isinstance(rc, int) else 1


if __name__ == "__main__":
    sys.exit(main())

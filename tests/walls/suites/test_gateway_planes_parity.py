#!/usr/bin/env python3
"""test_gateway_planes_parity.py — FLIP-GAP STROKE readiness wall §1.

Proves the TypeScript planes port (packages/gateway/src/doors/planes.ts
via the ctx.ts dispatchPlanes arm) answers byte-identical to the py
gateway on the seven lane-discovery + agent-plane doors:

  GET /v1/lanes            (_h_lanes 3059-3072 -> peek 498-562)
  GET /v1/card-tools       (_h_card_tools 3876-3888 -> card_tools 585-630)
  GET /v1/cards/*/bundle   (_h_lane_bundle 3915-3949 -> lane_bundle 652-777)
  GET /v1/skills           (_h_skills 3890-3896 -> skill_index 633-649)
  GET /v1/skills/*         (_h_skill_read 3906-3913 -> skill_read 844-880)
  GET /v1/agent/boot       (_h_agent_boot 3269-3318)
  GET /v1/metrics          (_h_metrics 3241-3258)

Dual-serve: py runs IN-PROCESS through gateway.route (the uploads-wall
precedent) with lane_disclosure.REPO / flow.FLOWS_ROOT / gateway.REPO
patched at a hermetic fixture root; TS boots on the same fixture via
MELITE_REPO_ROOT (never the default root). Bodies byte-compared
(status + bytes + content-type); the only modulo pins are the two
process-clock fields (metrics/agent.boot boot_at+uptime_s) and the
ledger clock fields.

KNOWN divergences (asserted as shape, never bytes):
  - boot_at / uptime_s differ per process by construction — shape
    (float, uptime_s >= 0) + every OTHER byte must agree.
  - agent.boot's ledger row carries uptime_s — numeric on both.
  - unicode edge classes (strip/lower/slice/len: \\x85, \\uFEFF,
    astral, Turkish İ), integer-like key order, non-UTF8 doc bytes,
    full-path vs dirent sort, \\s class, lax-int off-domain texts,
    symlink loops, pyRound3 exact-half ulps, a file literally named
    ".md" — none exercised: fixtures are ASCII with string keys.
  - unretained registry terms (settled counts, stamps, subscribers,
    recent ring) — fresh registries on both sides, so every such
    term is {} / [] / null / 0 on both: byte-equal, not divergent.

Run: python3 tests/walls/suites/test_gateway_planes_parity.py
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
import urllib.parse
import urllib.request
from pathlib import Path

from _anchor import REPO, reap_gateway

sys.dont_write_bytecode = True
sys.path.insert(0, str(REPO / "python"))

import flow as flowmod  # noqa: E402
import gateway as gwmod  # noqa: E402
import lane_disclosure as ldmod  # noqa: E402
from gateway import route as py_route  # noqa: E402

PASS = FAIL = 0
TOKEN = "planes-parity-token-%d" % os.getpid()

TS_SERVER = REPO / "apps" / "gateway" / "src" / "main.ts"

PY_GW: gwmod.Gateway | None = None


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def http(port: int, path: str, method: str = "GET",
         body: bytes = b"", headers: dict | None = None,
         ) -> tuple[int | None, bytes, str]:
    req = urllib.request.Request(
        "http://127.0.0.1:%d%s" % (port, path),
        data=body if method in ("POST", "PUT", "PATCH", "DELETE") else None,
        headers=headers or {}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return (r.status, r.read(),
                    r.headers.get("content-type", "").split(";")[0])
    except urllib.error.HTTPError as e:
        return (e.code, e.read(),
                e.headers.get("content-type", "").split(";")[0])
    except Exception as e:
        return (None, b"", "transport: %s" % e)


def py_wire(method: str, target: str, body: bytes = b"") -> tuple[int, bytes]:
    """Fresh py expectation: live route() + R4.2 + _adapt bytes."""
    assert PY_GW is not None
    status, payload = asyncio.run(py_route(PY_GW, method, target, body))
    if 400 <= status < 500 and isinstance(payload, dict) \
            and "code" not in payload:
        payload["code"] = "invalid_request"
    return status, json.dumps(payload, indent=2, default=str).encode()


def dual(ts_port: int, py_target: str, ts_path: str, name: str,
         method: str = "GET", body: bytes = b"") -> tuple[int, bytes]:
    """One dual-served pin: status + body bytes + content-type equal.

    py_target carries "METHOD path" (the in-process route() takes the
    bare target); the METHOD prefix must agree with method."""
    pm, pt = py_target.split(" ", 1)
    assert pm == method, (pm, method)
    ps, pb = py_wire(method, pt, body)
    ts, tb, tct = http(ts_port, ts_path, method, body,
                       {"Authorization": "Bearer " + TOKEN})
    ok = (ps == ts and pb == tb and tct == "application/json")
    note = ""
    if not ok:
        note = ("st py=%r ts=%r py %dB ts %dB ct=%r"
                % (ps, ts, len(pb), len(tb), tct))
        for i, (a, b) in enumerate(zip(pb, tb)):
            if a != b:
                note += " first-div @%d py=%r ts=%r" % (i, pb[i - 20:i + 40],
                                                       tb[i - 20:i + 40])
                break
        else:
            if len(pb) != len(tb):
                note += " len-div"
    check(name, ok, note)
    return ts, tb


def dual_modulo_clock(ts_port: int, py_target: str, ts_path: str, name: str,
                      clock_keys: tuple[str, ...]) -> dict:
    """Byte-compare modulo the process-clock fields (shape-checked)."""
    _, pt = py_target.split(" ", 1)
    ps, pb = py_wire("GET", pt)
    ts, tb, tct = http(ts_port, ts_path, "GET", b"",
                       {"Authorization": "Bearer " + TOKEN})
    try:
        pj, tj = json.loads(pb), json.loads(tb)
    except ValueError:
        check(name, False, "unparseable st %r/%r" % (ts, ps))
        return {}
    ok = ps == ts == 200 and tct == "application/json"
    note = "st %r/%r" % (ts, ps)
    for k in clock_keys:
        pv, tv = pj.pop(k, None), tj.pop(k, None)
        kv_ok = (isinstance(pv, float) and isinstance(tv, float)
                 and (k != "uptime_s" or (pv >= 0 and tv >= 0)))
        ok = ok and kv_ok
        if not kv_ok:
            note += " clock %s py=%r ts=%r" % (k, pv, tv)
    # agent/boot nests its process clock under gateway (3269-3318):
    # shape-check + strip before the byte-compare below.
    for doc, side in ((pj, "python"), (tj, "ts")):
        gw = doc.get("gateway")
        if isinstance(gw, dict):
            for k in ("boot_at", "uptime_s"):
                v = gw.pop(k, None)
                kv_ok = (isinstance(v, float)
                         and (k != "uptime_s" or v >= 0))
                ok = ok and kv_ok
                if not kv_ok:
                    note += " gateway.%s %s=%r" % (k, side, v)
    rest_ok = json.dumps(pj, indent=2, default=str).encode() == \
        json.dumps(tj, indent=2, default=str).encode()
    if not rest_ok:
        pbb = json.dumps(pj, indent=2, default=str).encode()
        tbb = json.dumps(tj, indent=2, default=str).encode()
        for i, (a, b) in enumerate(zip(pbb, tbb)):
            if a != b:
                note += " first-div @%d py=%r ts=%r" % (
                    i, pbb[i - 20:i + 40], tbb[i - 20:i + 40])
                break
        else:
            note += " len-div %d/%d" % (len(pbb), len(tbb))
    check(name, ok and rest_ok, note)
    return tj


def build_fixture(root: Path) -> None:
    eng = root / "packages" / "engines"

    def w(rel: str, text: str) -> None:
        p = root / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding="utf-8")

    # ── plug-a: one card + one model family, all doc classes ──
    w("packages/engines/plug-a/plugin.yaml", "name: plug-a\n")
    w("packages/engines/plug-a/action_cards/photo/acard/tool.json",
      json.dumps({"name": "acard_tool", "version": 1, "kind": "card-compose",
                  "card": "acard", "model": "amodel",
                  "stage_title": "A Card", "description": "Does A things.",
                  "params_schema": {"type": "object",
                                    "properties": {"prompt": {"type": "string"}},
                                    "required": ["prompt"]}}))
    w("packages/engines/plug-a/action_cards/photo/acard/AGENT.md",
      "---\nname: acard agent\ndescription: the acard craft\n---\n"
      "# Acard\nCompose laws.\n")
    # dir-form skill (SKILL.md) + file-form skill (.md straight).
    w("packages/engines/plug-a/action_cards/photo/acard/agents/skills/"
      "astem/SKILL.md", "# A skill\nBody A.\n")
    w("packages/engines/plug-a/action_cards/photo/acard/agents/skills/"
      "aflat.md", "# A flat skill\nFlat body.\n")
    w("packages/engines/plug-a/models/photo/amodel/GUIDE.md",
      "---\nname: amodel guide\ndescription: operating guide\n---\n"
      "# Guide\nRules.\n")
    w("packages/engines/plug-a/models/photo/amodel/agents/AGENT.md",
      "---\nname: amodel agent\ndescription: model craft\n---\n"
      "# Model\nCraft.\n")
    w("packages/engines/plug-a/models/photo/amodel/agents/skills/"
      "mstem/SKILL.md",
      "---\nname: mstem skill\ndescription: model skill\n---\n"
      "# MSkill\nM body.\n")
    w("packages/engines/plug-a/models/photo/amodel/agents/skills/"
      "extra.md", "---\ndescription: model extra file skill\n---\n"
      "# extra\nExtra body.\n")
    # no-heading doc: name falls back to the file stem.
    w("packages/engines/plug-a/models/photo/amodel/agents/skills/"
      "bare.md", "Just body, no heading.\n")

    # ── plug-b: LIST manifest (two tools, second hidden) + refusals ──
    w("packages/engines/plug-b/plugin.yaml", "name: plug-b\n")
    w("packages/engines/plug-b/action_cards/photo/bcard/tool.json",
      json.dumps([
          {"name": "bcard_tool", "version": 2, "kind": "card-compose",
           "card": "bcard", "model": "amodel",
           "stage_title": "B Card", "description": "Does B things.",
           "params_schema": {"type": "object", "properties": {},
                             "required": []}},
          {"name": "bcard_hidden_tool", "version": 1,
           "kind": "card-compose", "card": "bcard", "model": "amodel",
           "stage_title": "B Hidden", "description": "",
           "hidden": True,
           "params_schema": {"type": "object",
                             "properties": {"prompt": {"type": "string"},
                                            "seed": {"type": "integer"}},
                             "required": ["prompt", "seed"]}}]))
    w("packages/engines/plug-b/action_cards/photo/bcard/AGENT.md",
      "# B agent\nB laws.\n")
    # refused manifest (name + params_schema missing).
    w("packages/engines/plug-b/action_cards/photo/badcard/tool.json",
      json.dumps({"version": 1, "kind": "card-compose", "card": "badcard"}))
    # unreadable manifest (bad JSON) — the card is absent everywhere.
    w("packages/engines/plug-b/action_cards/photo/badjson/tool.json", "{nope")

    # ── plug-c: declared id != dir name + h3 base chain, no AGENT ──
    w("packages/engines/plug-c/plugin.yaml", "name: plug-c\n")
    w("packages/engines/plug-c/action_cards/photo/ccarddir/tool.json",
      json.dumps({"name": "ccard_tool", "version": 1, "kind": "card-compose",
                  "card": "ccard", "model": "h3-timeline",
                  "stage_title": "C Card", "description": "Does C things.",
                  "params_schema": {"type": "object", "properties": {},
                                    "required": []}}))
    # No AGENT.md under ccarddir: bundle agent null, no card:ccard skill.
    w("packages/engines/plug-c/models/photo/h3/GUIDE.md",
      "---\nname: h3 guide\ndescription: base guide\n---\n"
      "# H3\nBase rules.\n")
    w("packages/engines/plug-c/models/photo/h3-timeline/agents/AGENT.md",
      "---\nname: h3-timeline agent\ndescription: child craft\n---\n"
      "# H3T\nChild craft.\n")

    # ── underscore genre: never on the callable surface ──
    w("packages/engines/plug-a/action_cards/_hid/hcard/tool.json",
      json.dumps({"name": "hcard_tool", "version": 1, "kind": "card-compose",
                  "card": "hcard",
                  "params_schema": {"type": "object", "properties": {},
                                    "required": []}}))
    w("packages/engines/plug-a/action_cards/_hid/hcard/AGENT.md",
      "# H agent\nHidden laws.\n")

    # ── flows: tooled mega-skill template + tool-less template ──
    w("flows/tflow/flow.py",
      "from flow import Flow, Stage, FlowTool, FlowToolOverlay, "
      "FlowToolProperty, ToolParamType\n"
      "FLOW = Flow(id=\"tflow\", description=\"tiny fixture flow\",\n"
      "  stages=(Stage(id=\"s1\", engine=\"sim\"), "
      "Stage(id=\"s2\", engine=\"sim\")),\n"
      "  skill_refs=(\"model:amodel\", \"card:acard:astem\",\n"
      "    \"flow:notool\", \"model:missing\"),\n"
      "  tool=FlowTool(name=\"tflow_tool\", description=\"run tflow\",\n"
      "    properties={\"prompt\": FlowToolProperty(\n"
      "      ptype=ToolParamType.string, description=\"the prompt\"),\n"
      "      \"count\": FlowToolProperty(ptype=ToolParamType.integer,\n"
      "      description=\"how many\", default=2, minimum=1, maximum=9)},\n"
      "    required=[\"prompt\"],\n"
      "    overlays=(FlowToolOverlay(param=\"prompt\", stage=\"s1\", "
      "path=(\"prompt\",)),\n"
      "      FlowToolOverlay(param=\"count\", stage=\"s2\", "
      "path=(\"count\",)))))\n")
    w("flows/tflow/SKILL.md",
      "---\nname: tflow skill\ndescription: mega skill\n---\n"
      "# Tflow\nMega body.\n")
    w("flows/notool/flow.py",
      "from flow import Flow, Stage\n"
      "FLOW = Flow(id=\"notool\", description=\"tool-less flow\",\n"
      "  stages=(Stage(id=\"s1\", engine=\"sim\"),))\n")

    # ── frozen discovery catalog (the TS planes doors read flow
    # declarations + agent/boot catalog/schema natively from
    # packages/gateway/data/discovery-catalog.json under the
    # disclosure root — no runtime python). Stage the fixture's own
    # freeze with the SAME functions the exporter uses
    # (export_discovery_catalog.collect_flows + catalog.scan_catalog/
    # to_json + flow.schema_snapshot), so this wall pins the native
    # read path byte-for-byte; estate freshness (regen vs the
    # checked-in file) lives in the discovery wall's freshness leg.
    import importlib.util as _ilu

    import catalog as _catmod
    _spec = _ilu.spec_from_file_location(
        "export_discovery_catalog",
        str(REPO / "tools" / "export_discovery_catalog.py"))
    assert _spec is not None and _spec.loader is not None
    _expmod = _ilu.module_from_spec(_spec)
    _spec.loader.exec_module(_expmod)
    # schema_snapshot() enumerates FLOWS_ROOT (its "flows" section) —
    # pin the root BEFORE snapshotting, exactly as the retired probe
    # did (PROBE_SRC set FLOWS_ROOT then dumped schema_snapshot).
    flowmod.FLOWS_ROOT = root / "flows"
    _frozen = {
        "catalog": json.loads(
            _catmod.to_json(_catmod.scan_catalog(str(root)))),
        "schema": flowmod.schema_snapshot(),
        "flows": _expmod.collect_flows(str(root)),
    }
    _fro = root / "packages" / "gateway" / "data"
    _fro.mkdir(parents=True, exist_ok=True)
    (_fro / "discovery-catalog.json").write_text(
        json.dumps(_frozen, indent=2, ensure_ascii=False, default=str)
        + "\n",
        encoding="utf-8")


def journal_rows(state_root: Path) -> list[dict]:
    out = []
    for line in (state_root / "output" / "_ledger.jsonl").read_text(
            encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            out.append(json.loads(line))
    return out


def boot_ts(fixture: Path, state: Path) -> tuple[int, "subprocess.Popen[str]"]:
    node = shutil.which("node")
    if node is None:
        raise RuntimeError("node not on PATH")
    env = dict(os.environ)
    env["MELITE_REPO_ROOT"] = str(fixture)
    env["MELITE_STATE_ROOT"] = str(state)
    env["DSH_GATEWAY_TOKEN"] = TOKEN
    proc = subprocess.Popen(
        [node, "--experimental-strip-types", str(TS_SERVER)],
        cwd=str(REPO), env=env,
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        text=True, start_new_session=True)
    assert proc.stdout is not None
    deadline = time.time() + 60
    while time.time() < deadline:
        line = proc.stdout.readline()
        if line.startswith("READY "):
            return int(line.split()[1]), proc
        if proc.poll() is not None:
            raise RuntimeError("ts server exited rc=%d" % proc.returncode)
    proc.terminate()
    raise RuntimeError("ts server did not print READY")


def main() -> int:
    global PY_GW
    base = None
    ts_proc = None
    try:
        base = Path(tempfile.mkdtemp(prefix="wall-planes-"))
        fixture = base / "fixture"
        build_fixture(fixture)
        py_state = base / "py-state"
        ts_state = base / "ts-state"
        py_state.mkdir(parents=True)
        ts_state.mkdir(parents=True)

        # Hermetic py gateway: disclosure + state globals at the fixture.
        ldmod.REPO = fixture
        ldmod.ENGINES_ROOT = fixture / "packages" / "engines"
        flowmod.FLOWS_ROOT = fixture / "flows"
        gwmod.REPO = fixture
        gwmod.STATE_ROOT = py_state
        gwmod.OUT_ROOT = py_state / "output"
        gwmod.TEST_OUT_ROOT = py_state / "test-output"
        gwmod.LEDGER_PATH = gwmod.OUT_ROOT / "_ledger.jsonl"
        PY_GW = gwmod.Gateway()

        ts_port, ts_proc = boot_ts(fixture, ts_state)

        enc = urllib.parse.quote
        # ── 1. lanes ──
        dual(ts_port, "GET /v1/lanes", "/v1/lanes", "lanes unfiltered")
        dual(ts_port, "GET /v1/lanes?kind=card", "/v1/lanes?kind=card",
             "lanes kind=card")
        dual(ts_port, "GET /v1/lanes?kind=flow", "/v1/lanes?kind=flow",
             "lanes kind=flow")
        dual(ts_port, "GET /v1/lanes?kind=template",
             "/v1/lanes?kind=template", "lanes kind=template")
        dual(ts_port, "GET /v1/lanes?kind=bogus", "/v1/lanes?kind=bogus",
             "lanes kind=bogus 200+error")
        dual(ts_port, "GET /v1/lanes?kind=", "/v1/lanes?kind=",
             "lanes blank kind unfiltered")
        dual(ts_port, "GET /v1/lanes?genre=photo", "/v1/lanes?genre=photo",
             "lanes genre=photo")
        dual(ts_port, "GET /v1/lanes?genre=PHOTO", "/v1/lanes?genre=PHOTO",
             "lanes genre case")
        dual(ts_port, "GET /v1/lanes?genre=nope", "/v1/lanes?genre=nope",
             "lanes genre empty")
        dual(ts_port, "GET /v1/lanes?kind=card&kind=flow",
             "/v1/lanes?kind=card&kind=flow", "lanes first kind wins")
        dual(ts_port, "GET /v1/lanes?kind=&kind=flow",
             "/v1/lanes?kind=&kind=flow", "lanes blank dropped")
        dual(ts_port, "GET /v1/lanes/", "/v1/lanes/",
             "lanes trailing slash")
        dual(ts_port, "POST /v1/lanes", "/v1/lanes",
             "lanes method mismatch", method="POST")

        # ── 2. card-tools ──
        dual(ts_port, "GET /v1/card-tools", "/v1/card-tools",
             "card-tools unfiltered")
        dual(ts_port, "GET /v1/card-tools?lane=acard",
             "/v1/card-tools?lane=acard", "card-tools lane=card")
        dual(ts_port, "GET /v1/card-tools?lane=ccarddir",
             "/v1/card-tools?lane=ccarddir", "card-tools lane=dir")
        dual(ts_port, "GET /v1/card-tools?lane=ccard",
             "/v1/card-tools?lane=ccard", "card-tools lane=declared")
        dual(ts_port, "GET /v1/card-tools?lane=amodel",
             "/v1/card-tools?lane=amodel", "card-tools lane=model")
        dual(ts_port, "GET /v1/card-tools?lane=bcard",
             "/v1/card-tools?lane=bcard", "card-tools list manifests")
        dual(ts_port, "GET /v1/card-tools?lane=tflow",
             "/v1/card-tools?lane=tflow", "card-tools lane=flow")
        dual(ts_port, "GET /v1/card-tools?lane=flow:tflow",
             "/v1/card-tools?lane=flow:tflow", "card-tools flow: prefix 404")
        dual(ts_port, "GET /v1/card-tools?lane=flow:flow:tflow",
             "/v1/card-tools?lane=flow:flow:tflow",
             "card-tools doubled flow: prefix 404 (dead template)")
        dual(ts_port, "GET /v1/card-tools?lane=notool",
             "/v1/card-tools?lane=notool", "card-tools tool-less 404")
        dual(ts_port, "GET /v1/card-tools?lane=nope",
             "/v1/card-tools?lane=nope", "card-tools unknown 404")
        dual(ts_port, "GET /v1/card-tools?lane=",
             "/v1/card-tools?lane=", "card-tools blank unfiltered")

        # ── 3. bundles ──
        dual(ts_port, "GET /v1/cards/acard/bundle", "/v1/cards/acard/bundle",
             "bundle card")
        dual(ts_port, "GET /v1/cards/acard/bundle",
             "/v1/cards/" + enc("acard") + "/bundle", "bundle card encoded")
        dual(ts_port, "GET /v1/cards/acard/bundle", "/v1/cards/amodel/bundle",
             "bundle via model id")
        dual(ts_port, "GET /v1/cards/ccarddir/bundle",
             "/v1/cards/ccarddir/bundle", "bundle via dir name")
        dual(ts_port, "GET /v1/cards/ccard/bundle", "/v1/cards/ccard/bundle",
             "bundle declared-id + base chain, agent null")
        dual(ts_port, "GET /v1/cards/bcard/bundle", "/v1/cards/bcard/bundle",
             "bundle list manifests")
        dual(ts_port, "GET /v1/cards/acard/bundle?kind=card",
             "/v1/cards/acard/bundle?kind=card", "bundle kind=card")
        dual(ts_port, "GET /v1/cards/acard/bundle?kind=flow",
             "/v1/cards/acard/bundle?kind=flow", "bundle card kind=flow 404")
        dual(ts_port, "GET /v1/cards/tflow/bundle",
             "/v1/cards/tflow/bundle", "bundle template + orientation")
        dual(ts_port, "GET /v1/cards/flow:tflow/bundle",
             "/v1/cards/" + enc("flow:tflow") + "/bundle",
             "bundle flow: prefix 404")
        dual(ts_port, "GET /v1/cards/flow:flow:tflow/bundle",
             "/v1/cards/" + enc("flow:flow:tflow") + "/bundle",
             "bundle doubled flow: prefix 404 (dead template)")
        dual(ts_port, "GET /v1/cards/notool/bundle",
             "/v1/cards/notool/bundle", "bundle tool-less (flow.py body)")
        dual(ts_port, "GET /v1/cards/notool/bundle?kind=template",
             "/v1/cards/notool/bundle?kind=template",
             "bundle tool-less kind=template")
        dual(ts_port, "GET /v1/cards/tflow/bundle?kind=card",
             "/v1/cards/tflow/bundle?kind=card",
             "bundle template kind=card 404")
        dual(ts_port, "GET /v1/cards/nope/bundle", "/v1/cards/nope/bundle",
             "bundle unknown 404")
        dual(ts_port, "GET /v1/cards/acard/bundle?kind=bogus",
             "/v1/cards/acard/bundle?kind=bogus", "bundle kind=bogus 400")
        dual(ts_port, "GET /v1/cards/ /bundle", "/v1/cards/%20/bundle",
             "bundle blank lane 400")

        # ── 4. skills index + reads ──
        dual(ts_port, "GET /v1/skills", "/v1/skills", "skills index")
        dual(ts_port, "DELETE /v1/skills", "/v1/skills",
             "skills method mismatch", method="DELETE")
        for sid in ("card:acard", "card:acard:astem", "card:acard:aflat.md",
                    "guide:amodel", "model:amodel", "model:amodel:mstem",
                    "model:amodel:extra.md", "model:amodel:bare.md",
                    "guide:h3", "model:h3-timeline", "card:bcard",
                    "flow:tflow", "flow:notool"):
            dual(ts_port, "GET /v1/skills/" + sid,
                 "/v1/skills/" + enc(sid, safe=""),
                 "skill_read " + sid)
        dual(ts_port, "GET /v1/skills/card:ccard",
             "/v1/skills/" + enc("card:ccard", safe=""),
             "skill_read missing AGENT 404")
        dual(ts_port, "GET /v1/skills/nope:x",
             "/v1/skills/" + enc("nope:x", safe=""),
             "skill_read unknown 404")

        # ── 5. metrics (modulo the process clock) ──
        dual_modulo_clock(ts_port, "GET /v1/metrics", "/v1/metrics",
                          "metrics", ("boot_at", "uptime_s"))
        dual(ts_port, "POST /v1/metrics", "/v1/metrics",
             "metrics method mismatch", method="POST")

        # ── 6. agent boot (modulo the nested gateway clock) ──
        boot = dual_modulo_clock(ts_port, "GET /v1/agent/boot",
                                 "/v1/agent/boot", "agent/boot", ())
        if boot:
            gw = boot.get("gateway", {})
            # routes/version pinned here; boot_at/uptime_s were
            # shape-checked + stripped by dual_modulo_clock above.
            check("boot gateway block",
                  gw.get("version") == "0.1.0"
                  and gw.get("routes") == 54
                  and set(gw) == {"version", "routes"},
                  repr(gw)[:160])
            check("boot health block",
                  boot.get("health") == {"status": "ok", "version": "0.1.0"},
                  repr(boot.get("health"))[:120])
            q = boot.get("queue", {})
            check("boot queue block",
                  q.get("depth") == 0 and q.get("queued") == []
                  and q.get("active") is None
                  and q.get("runs_by_status") == {},
                  repr(q)[:160])
            for section in ("lanes", "card_tools", "skills",
                            "model_catalog", "schema"):
                sec = boot.get(section, {})
                check("boot section clean " + section,
                      isinstance(sec, (dict, list)) and "error" not in sec,
                      repr(sec)[:140])
            # Boot sections equal the live doors.
            _, lanes_b = py_wire("GET", "/v1/lanes")
            _, tools_b = py_wire("GET", "/v1/card-tools")
            _, skills_b = py_wire("GET", "/v1/skills")
            check("boot lanes == live lanes",
                  json.dumps(boot.get("lanes"), indent=2, default=str)
                  .encode() == lanes_b)
            check("boot card_tools == live card_tools",
                  json.dumps(boot.get("card_tools"), indent=2, default=str)
                  .encode() == tools_b)
            check("boot skills == live skills",
                  json.dumps(boot.get("skills"), indent=2, default=str)
                  .encode() == skills_b)
        dual(ts_port, "POST /v1/agent/boot", "/v1/agent/boot",
             "agent/boot method mismatch", method="POST")

        # ── 7. ledgers: skill.read + agent.boot rows, both sides ──
        py_rows = journal_rows(py_state)
        ts_rows = journal_rows(ts_state)
        py_reads = [r for r in py_rows if r.get("event") == "skill.read"]
        ts_reads = [r for r in ts_rows if r.get("event") == "skill.read"]
        check("skill.read ledgered both",
              len(py_reads) == len(ts_reads) == 13
              and all(set(r.get("data", {})) == {"id"} for r in
                      py_reads + ts_reads)
              and [r["data"]["id"] for r in py_reads]
              == [r["data"]["id"] for r in ts_reads],
              "py=%d ts=%d" % (len(py_reads), len(ts_reads)))
        py_boots = [r for r in py_rows if r.get("event") == "agent.boot"]
        ts_boots = [r for r in ts_rows if r.get("event") == "agent.boot"]
        check("agent.boot ledgered both",
              len(py_boots) == len(ts_boots) == 1
              and all(set(r.get("data", {})) == {"routes", "uptime_s"}
                      and r["data"]["routes"] == 54
                      and isinstance(r["data"]["uptime_s"], float)
                      for r in py_boots + ts_boots),
              "py=%d ts=%d" % (len(py_boots), len(ts_boots)))
        check("ledger envelope shape",
              all(set(r) == {"ts", "event", "data"}
                  and isinstance(r.get("ts"), int)
                  for r in py_rows + ts_rows))

        # ── 8. architecture pin: the native data SSOT — the planes
        # doors read flow declarations + agent/boot catalog/schema
        # from the frozen discovery-catalog.json (no runtime python;
        # the stdio probe is retired). The dual legs above prove the
        # read path byte-for-byte; the text pin below locks it
        # (the discovery wall's no-bridge pin precedent).
        _psrc = (REPO / "packages" / "gateway" / "src" / "doors"
                 / "planes.ts").read_text(encoding="utf-8")
        _pcode = "\n".join(
            ln for ln in _psrc.splitlines()
            if not ln.lstrip().startswith("//"))
        check("no runtime-py probe",
              "execFileSync" not in _pcode
              and "spawnSync" not in _pcode
              and "PROBE_SRC" not in _pcode
              and "MELITE_PYTHON" not in _pcode)
        check("native frozen SSOT",
              "catalogPath" in _pcode
              and "frozenSection" in _pcode)

        # ── 9. auth parity: bad bearer 401s on a plane door ──
        want_401 = json.dumps({
            "error": "unauthorized: missing or invalid bearer token "
                     "(Authorization: Bearer <token>; set DSH_GATEWAY_TOKEN "
                     "to enable)"}, indent=2).encode()
        for auth, nm in ((None, "no token"), ("wrong", "wrong token")):
            hdrs = {} if auth is None else {"Authorization": "Bearer " + auth}
            ts, tb, _ = http(ts_port, "/v1/lanes", "GET", b"", hdrs)
            check("auth %s → 401 shape" % nm,
                  ts == 401 and tb == want_401, "st %r" % ts)
        ts, _, _ = http(ts_port, "/v1/health")
        check("health exempt without token", ts == 200)
    finally:
        if ts_proc is not None:
            try:
                reap_gateway(ts_proc)
            except Exception:
                try:
                    ts_proc.terminate()
                except Exception:
                    pass
        if base is not None:
            shutil.rmtree(base, ignore_errors=True)

    print("PASS %d / FAIL %d" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())

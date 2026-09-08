#!/usr/bin/env python3
"""test_gateway_planes_parity.py — FLIP-GAP STROKE readiness wall §1, TS-ONLY.

Pins the TypeScript planes port (packages/gateway-doors/src/doors/planes.ts
via the ctx.ts dispatchPlanes arm) on the seven lane-discovery +
agent-plane doors:

  GET /v1/lanes            (peek disclosure)
  GET /v1/card-tools       (card_tools disclosure)
  GET /v1/cards/*/bundle   (lane_bundle disclosure)
  GET /v1/skills           (skill_index disclosure)
  GET /v1/skills/*         (skill_read disclosure)
  GET /v1/agent/boot       (agent boot assembly)
  GET /v1/metrics          (metrics assembly)

TS-ONLY: the TS server boots on a hermetic fixture root
(MELITE_REPO_ROOT at the fixture, MELITE_STATE_ROOT at a scratch
state dir — never the default root) and every leg pins the TS
contract against frozen goldens
(golden_ts/test_gateway_planes_parity/, causes.md there): status +
body bytes + content-type. The only modulo pins are the two
process-clock fields (metrics/agent.boot boot_at+uptime_s) and the
ledger clock fields — shape-checked, stripped, remainder golden.

Ledger legs pin TS-ONLY literals (the skill.read row count is 11:
the two flow: skill reads 404 and never journal — the stale 13 is
dropped, TS WINS per the lane ruling).

KNOWN shape-only pins (never bytes):
  - boot_at / uptime_s differ per process by construction — shape
    (float, uptime_s >= 0) + every OTHER byte golden.
  - agent.boot's ledger row carries uptime_s — numeric.
  - unicode edge classes (strip/lower/slice/len), integer-like key
    order, non-UTF8 doc bytes, full-path vs dirent sort, lax-int
    off-domain texts, symlink loops, exact-half ulps, a file
    literally named ".md" — none exercised: fixtures are ASCII
    with string keys.
  - unretained registry terms (settled counts, stamps, subscribers,
    recent ring) — fresh registries, so every such term is {} / []
    / null / 0: golden-equal, not divergent.

ORACLE DEATH 2026-09-08: re-derived TS-ONLY — the py-mirror legs
(in-process py dispatcher expectations on the same fixture) are
deleted per the operator order "we do not need parity, we need to
migrate, not keep the old machinery"; the TS-SSOT golden legs below
are the wall now.

PURGE S-snapshots 2026-09-08: the card-dir tool.json snapshots are
deleted — manifests() projects from the primed registry, so the
fixture's plug card dirs (unregistered ids) are silently absent
from every manifest-backed door (lanes, card-tools, bundles): the
fixture surface carries NO card rows (the dir-less pure-tool
global unions under the registry-owner engine only — live
behavior, pinned by the live walls, not the fixture). The plug
lanes below pin the new contract (404s where 200s were); the plug
doc/model/skill/flow mechanics are untouched, so the
skills/metrics/ledger legs stand as they were.

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

Run: python3 tests/walls/suites/test_gateway_planes_parity.py
"""

import json
import os
import shutil
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from _anchor import REPO, boot_scratch_gateway, reap_gateway

sys.dont_write_bytecode = True

PASS = FAIL = 0
TOKEN = "planes-parity-token-%d" % os.getpid()

TS_SERVER = REPO / "apps" / "gateway" / "src" / "main.ts"
GOLDEN_DIR = (REPO / "tests" / "walls" / "suites" / "golden_ts" /
              "test_gateway_planes_parity")
# PURGE S-catalog (2026-09-08): the fixture's frozen catalog is
# checked in (hand-owned) — the exporter that generated it is gone.
FIXTURES = REPO / "tests" / "walls" / "suites" / "planes_fixtures"

# The 11 journaled skill.read ids, in journal order (the two flow:
# reads 404 and never journal — TS WINS, the stale 13 is dropped).
READ_IDS = ["card:acard", "card:acard:astem", "card:acard:aflat.md",
            "guide:amodel", "model:amodel", "model:amodel:mstem",
            "model:amodel:extra.md", "model:amodel:bare.md",
            "guide:h3", "model:h3-timeline", "card:bcard"]

SKILL_IDS = READ_IDS + ["flow:tflow", "flow:notool"]


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def golden(name: str) -> bytes:
    return (GOLDEN_DIR / name).read_bytes()


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


def pin(ts_port: int, slug: str, ts_path: str, name: str,
        method: str = "GET", body: bytes = b"",
        status: int = 200) -> tuple[int | None, bytes]:
    """One TS-SSOT pin: status + body bytes + content-type golden."""
    exp_b = golden(slug + ".json")
    ts, tb, tct = http(ts_port, ts_path, method, body,
                       {"Authorization": "Bearer " + TOKEN})
    ok = (ts == status and tb == exp_b and tct == "application/json")
    note = ""
    if not ok:
        note = ("st ts=%r want %r golden %dB ts %dB ct=%r"
                % (ts, status, len(exp_b), len(tb), tct))
        for i, (a, b) in enumerate(zip(exp_b, tb)):
            if a != b:
                note += " first-div @%d golden=%r ts=%r" % (
                    i, exp_b[i - 20:i + 40], tb[i - 20:i + 40])
                break
        else:
            if len(exp_b) != len(tb):
                note += " len-div"
    check(name, ok, note)
    return ts, tb


def pin_modulo_clock(ts_port: int, slug: str, ts_path: str, name: str,
                     clock_keys: tuple[str, ...]) -> dict:
    """Golden-compare modulo the process-clock fields (shape-checked)."""
    exp_b = golden(slug + ".json")
    ts, tb, tct = http(ts_port, ts_path, "GET", b"",
                       {"Authorization": "Bearer " + TOKEN})
    try:
        tj = json.loads(tb)
    except ValueError:
        check(name, False, "unparseable st %r" % (ts,))
        return {}
    ok = ts == 200 and tct == "application/json"
    note = "st %r" % (ts,)
    for k in clock_keys:
        tv = tj.pop(k, None)
        kv_ok = (isinstance(tv, float)
                 and (k != "uptime_s" or tv >= 0))
        ok = ok and kv_ok
        if not kv_ok:
            note += " clock %s ts=%r" % (k, tv)
    # agent/boot nests its process clock under gateway:
    # shape-check + strip before the golden-compare below.
    gw = tj.get("gateway")
    if isinstance(gw, dict):
        for k in ("boot_at", "uptime_s"):
            v = gw.pop(k, None)
            kv_ok = (isinstance(v, float)
                     and (k != "uptime_s" or v >= 0))
            ok = ok and kv_ok
            if not kv_ok:
                note += " gateway.%s ts=%r" % (k, v)
    rest = json.dumps(tj, indent=2, default=str).encode()
    rest_ok = rest == exp_b
    if not rest_ok:
        for i, (a, b) in enumerate(zip(exp_b, rest)):
            if a != b:
                note += " first-div @%d golden=%r ts=%r" % (
                    i, exp_b[i - 20:i + 40], rest[i - 20:i + 40])
                break
        else:
            note += " len-div %d/%d" % (len(exp_b), len(rest))
    check(name, ok and rest_ok, note)
    return tj


def build_fixture(root: Path) -> None:
    eng = root / "packages" / "engines"

    def w(rel: str, text: str) -> None:
        p = root / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding="utf-8")

    # ── plug-a: one card + one model family, all doc classes ──
    # (PURGE S-snapshots: no tool.json — the snapshots are deleted
    # estate-wide; the registry projection serves the row. plug
    # cards are unregistered, so this dir is silently absent from
    # the manifest-backed doors; the docs below still pin the
    # cardRows/skill mechanics.)
    w("packages/engines/plug-a/plugin.yaml", "name: plug-a\n")
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

    # ── plug-b: card docs + the doc-absence refusals ──
    # (PURGE S-snapshots: the LIST-manifest / refused-manifest /
    # bad-JSON tool.json mechanics died with the snapshots — the
    # walk never reads the files. One corrupt tool.json stays (see
    # badjson below) as the junk-ignored pin.)
    w("packages/engines/plug-b/plugin.yaml", "name: plug-b\n")
    w("packages/engines/plug-b/action_cards/photo/bcard/AGENT.md",
      "# B agent\nB laws.\n")
    # corrupt tool.json beside an unregistered dir: the walk never
    # reads it — junk is ignored, never a 500.
    w("packages/engines/plug-b/action_cards/photo/badjson/tool.json", "{nope")

    # ── plug-c: h3 base chain models, card dir without AGENT ──
    # (PURGE S-snapshots: no tool.json (see plug-a). The declared-id
    # != dir-name mapping died with the snapshots — lane resolution
    # is registry ids now.)
    w("packages/engines/plug-c/plugin.yaml", "name: plug-c\n")
    # No AGENT.md under ccarddir: no card:ccarddir skill row.
    w("packages/engines/plug-c/models/photo/h3/GUIDE.md",
      "---\nname: h3 guide\ndescription: base guide\n---\n"
      "# H3\nBase rules.\n")
    w("packages/engines/plug-c/models/photo/h3-timeline/agents/AGENT.md",
      "---\nname: h3-timeline agent\ndescription: child craft\n---\n"
      "# H3T\nChild craft.\n")

    # ── underscore genre: never on the doc surface ──
    # (PURGE S-snapshots: no tool.json (see plug-a) — the _hid dir
    # is doubly absent now.)
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
    # freeze from the CHECKED-IN copy
    # (tests/walls/suites/planes_fixtures/discovery-catalog.json —
    # captured 2026-09-08 with the retired exporter's own functions,
    # byte-identical to what they generated; hand-owned from here).
    # Estate freshness (regen vs the checked-in file) died with the
    # exporter — the discovery wall's frozen-truth legs own the live
    # file now.
    _fro = root / "packages" / "gateway" / "data"
    _fro.mkdir(parents=True, exist_ok=True)
    (_fro / "discovery-catalog.json").write_text(
        (FIXTURES / "discovery-catalog.json").read_text(encoding="utf-8"),
        encoding="utf-8")


def journal_rows(state_root: Path) -> list[dict]:
    out = []
    for line in (state_root / "output" / "_ledger.jsonl").read_text(
            encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            out.append(json.loads(line))
    return out


def main() -> int:
    base = None
    ts_proc = None
    try:
        base = Path(tempfile.mkdtemp(prefix="wall-planes-"))
        fixture = base / "fixture"
        build_fixture(fixture)
        ts_state = base / "ts-state"
        ts_state.mkdir(parents=True)

        env = dict(os.environ)
        env["MELITE_REPO_ROOT"] = str(fixture)
        env["MELITE_STATE_ROOT"] = str(ts_state)
        env["DSH_GATEWAY_TOKEN"] = TOKEN
        ts_port, ts_proc = boot_scratch_gateway(env=env)

        enc = urllib.parse.quote
        # ── 1. lanes ──
        pin(ts_port, "lanes", "/v1/lanes", "lanes unfiltered")
        pin(ts_port, "lanes-kind-card", "/v1/lanes?kind=card",
            "lanes kind=card")
        pin(ts_port, "lanes-kind-flow", "/v1/lanes?kind=flow",
            "lanes kind=flow")
        pin(ts_port, "lanes-kind-template", "/v1/lanes?kind=template",
            "lanes kind=template")
        pin(ts_port, "lanes-kind-bogus", "/v1/lanes?kind=bogus",
            "lanes kind=bogus 200+error")
        pin(ts_port, "lanes-kind-blank", "/v1/lanes?kind=",
            "lanes blank kind unfiltered")
        pin(ts_port, "lanes-genre-photo", "/v1/lanes?genre=photo",
            "lanes genre=photo")
        pin(ts_port, "lanes-genre-PHOTO", "/v1/lanes?genre=PHOTO",
            "lanes genre case")
        pin(ts_port, "lanes-genre-nope", "/v1/lanes?genre=nope",
            "lanes genre empty")
        pin(ts_port, "lanes-kind-first-wins", "/v1/lanes?kind=card&kind=flow",
            "lanes first kind wins")
        pin(ts_port, "lanes-kind-blank-dropped", "/v1/lanes?kind=&kind=flow",
            "lanes blank dropped")
        pin(ts_port, "lanes-slash", "/v1/lanes/",
            "lanes trailing slash")
        pin(ts_port, "lanes-post-404", "/v1/lanes",
            "lanes method mismatch", method="POST", status=404)

        # ── 2. card-tools ──
        # (PURGE S-snapshots: unfiltered serves the registry
        # projection — on the fixture root (no comfyui engine) that
        # is the empty list. Every plug lane 404s: unregistered
        # dirs are silently absent. The flow-lane mechanics are
        # untouched — the tflow/flow:/notool/nope/blank legs stand.)
        pin(ts_port, "card-tools", "/v1/card-tools",
            "card-tools unfiltered (projection: empty on fixture)")
        pin(ts_port, "card-tools-lane-acard", "/v1/card-tools?lane=acard",
            "card-tools unregistered lane 404", status=404)
        pin(ts_port, "card-tools-lane-tflow", "/v1/card-tools?lane=tflow",
            "card-tools lane=flow (no such card lane)", status=404)
        pin(ts_port, "card-tools-lane-flow-tflow",
            "/v1/card-tools?lane=flow:tflow", "card-tools flow: prefix 404",
            status=404)
        pin(ts_port, "card-tools-lane-flow-flow-tflow",
            "/v1/card-tools?lane=flow:flow:tflow",
            "card-tools doubled flow: prefix 404 (dead template)",
            status=404)
        pin(ts_port, "card-tools-lane-notool", "/v1/card-tools?lane=notool",
            "card-tools tool-less 404", status=404)
        pin(ts_port, "card-tools-lane-nope", "/v1/card-tools?lane=nope",
            "card-tools unknown 404", status=404)
        pin(ts_port, "card-tools-lane-blank", "/v1/card-tools?lane=",
            "card-tools blank unfiltered")

        # ── 3. bundles ──
        # (PURGE S-snapshots: plug lanes have no manifests — the
        # bundle door 404s where it served. Flow bundles stand.)
        pin(ts_port, "bundle-acard", "/v1/cards/acard/bundle",
            "bundle unregistered lane 404", status=404)
        pin(ts_port, "bundle-acard-kind-flow-404",
            "/v1/cards/acard/bundle?kind=flow",
            "bundle unregistered lane kind=flow 404",
            status=404)
        pin(ts_port, "bundle-tflow", "/v1/cards/tflow/bundle",
            "bundle flow lane is no card bundle", status=404)
        pin(ts_port, "bundle-flow-tflow-404",
            "/v1/cards/" + enc("flow:tflow") + "/bundle",
            "bundle flow: prefix 404", status=404)
        pin(ts_port, "bundle-flow-flow-tflow-404",
            "/v1/cards/" + enc("flow:flow:tflow") + "/bundle",
            "bundle doubled flow: prefix 404 (dead template)", status=404)
        pin(ts_port, "bundle-notool", "/v1/cards/notool/bundle",
            "bundle tool-less lane is no card bundle", status=404)
        pin(ts_port, "bundle-notool-kind-template",
            "/v1/cards/notool/bundle?kind=template",
            "bundle tool-less kind=template (no such lane)", status=404)
        pin(ts_port, "bundle-tflow-kind-card-404",
            "/v1/cards/tflow/bundle?kind=card",
            "bundle template kind=card 404", status=404)
        pin(ts_port, "bundle-nope-404", "/v1/cards/nope/bundle",
            "bundle unknown 404", status=404)
        pin(ts_port, "bundle-acard-kind-bogus-400",
            "/v1/cards/acard/bundle?kind=bogus", "bundle kind=bogus 400",
            status=400)
        pin(ts_port, "bundle-blank-400", "/v1/cards/%20/bundle",
            "bundle blank lane 400", status=400)

        # ── 4. skills index + reads ──
        pin(ts_port, "skills-index", "/v1/skills", "skills index")
        pin(ts_port, "skills-delete-404", "/v1/skills",
            "skills method mismatch", method="DELETE", status=404)
        slugs = {"card:acard": "card-acard",
                 "card:acard:astem": "card-acard-astem",
                 "card:acard:aflat.md": "card-acard-aflat-md",
                 "guide:amodel": "guide-amodel",
                 "model:amodel": "model-amodel",
                 "model:amodel:mstem": "model-amodel-mstem",
                 "model:amodel:extra.md": "model-amodel-extra-md",
                 "model:amodel:bare.md": "model-amodel-bare-md",
                 "guide:h3": "guide-h3",
                 "model:h3-timeline": "model-h3-timeline",
                 "card:bcard": "card-bcard",
                 "flow:tflow": "flow-tflow",
                 "flow:notool": "flow-notool"}
        for sid in SKILL_IDS:
            # (flow: reads 404 — no such skill id — and never journal.)
            pin(ts_port, "skill-" + slugs[sid],
                "/v1/skills/" + enc(sid, safe=""),
                "skill_read " + sid,
                status=404 if sid.startswith("flow:") else 200)
        pin(ts_port, "skill-missing-agent-404",
            "/v1/skills/" + enc("card:ccard", safe=""),
            "skill_read missing AGENT 404", status=404)
        pin(ts_port, "skill-unknown-404",
            "/v1/skills/" + enc("nope:x", safe=""),
            "skill_read unknown 404", status=404)

        # ── 5. metrics (modulo the process clock) ──
        pin_modulo_clock(ts_port, "metrics", "/v1/metrics",
                         "metrics", ("boot_at", "uptime_s"))
        pin(ts_port, "metrics-post-404", "/v1/metrics",
            "metrics method mismatch", method="POST", status=404)

        # ── 6. agent boot (modulo the nested gateway clock) ──
        boot = pin_modulo_clock(ts_port, "agent-boot",
                                "/v1/agent/boot", "agent/boot", ())
        if boot:
            gw = boot.get("gateway", {})
            # routes/version pinned here; boot_at/uptime_s were
            # shape-checked + stripped by pin_modulo_clock above.
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
            # Boot sections embed the live doors' golden bytes.
            for section, slug in (("lanes", "lanes"),
                                  ("card_tools", "card-tools"),
                                  ("skills", "skills-index")):
                check("boot %s == live %s golden" % (section, section),
                      json.dumps(boot.get(section), indent=2, default=str)
                      .encode() == golden(slug + ".json"))
        pin(ts_port, "agent-boot-post-404", "/v1/agent/boot",
            "agent/boot method mismatch", method="POST", status=404)

        # ── 7. ledgers: skill.read + agent.boot rows, TS-ONLY ──
        ts_rows = journal_rows(ts_state)
        ts_reads = [r for r in ts_rows if r.get("event") == "skill.read"]
        check("skill.read ledgered (11 rows, flow: 404s never journal)",
              len(ts_reads) == 11
              and all(set(r.get("data", {})) == {"id"} for r in ts_reads)
              and [r["data"]["id"] for r in ts_reads] == READ_IDS,
              "ts=%d" % (len(ts_reads),))
        ts_boots = [r for r in ts_rows if r.get("event") == "agent.boot"]
        check("agent.boot ledgered",
              len(ts_boots) == 1
              and all(set(r.get("data", {})) == {"routes", "uptime_s"}
                      and r["data"]["routes"] == 54
                      and isinstance(r["data"]["uptime_s"], float)
                      for r in ts_boots),
              "ts=%d" % (len(ts_boots),))
        check("ledger envelope shape",
              all(set(r) == {"ts", "event", "data"}
                  and isinstance(r.get("ts"), int)
                  for r in ts_rows))

        # ── 8. architecture pin: the native data SSOT — the planes
        # doors read flow declarations + agent/boot catalog/schema
        # from the frozen discovery-catalog.json (no runtime python;
        # the stdio probe is retired). The golden legs above prove the
        # read path byte-for-byte; the text pin below locks it
        # (the discovery wall's no-bridge pin precedent).
        _psrc = (REPO / "packages" / "gateway-doors" / "src" / "doors"
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
        ts, tb, _ = http(ts_port, "/v1/lanes", "GET", b"",
                         {"Authorization": "Bearer " + TOKEN})
        check("auth bearer 200 list",
              ts == 200 and tb == golden("lanes.json"), "st %r" % ts)
        ts, tb, _ = http(ts_port, "/v1/studios/3d/anny/base-body", "GET", b"",
                         {"Authorization": "Bearer " + TOKEN})
        # (shape: the 500 text embeds the fixture root path — status
        # + stable prefix, never bytes.)
        check("auth bearer base-body 500 shape",
              ts == 500 and b"base body unreadable:" in tb
              and b"inference config unreadable" in tb,
              "st %r %r" % (ts, tb[:60]))
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

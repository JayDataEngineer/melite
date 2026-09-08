"""test_cpp_native_cards.py — the native-card boarding wall.

RE-DERIVED 2026-09-08 (mono-engine quarantine, operator order: "we
are building an api caller for comfyui, not having engines anymore"
+ "for the stuff that would completely die, just put it in vendor"):
the estate owns no engines. The retired arms (auto-rig/skintokens,
music-native/audio-cpp, forge/anycreature — estate subprocess
compute, decl-only cards) are QUARANTINED under
vendor/retired-engines/ with their vendors; their door legs died
with them (git history holds the wall that pinned them).

What SURVIVES and what this wall pins now:
- quad-remesh — the ONE native that already made the Law-0 jump: a
  comfyui card whose graph rides the Cordis CLI (the vendored
  melite-autoremesher-nodes extension is the engine side).
- The agent-surface contract (peek / card-tools / lane filter /
  bundle) held to the scan — re-pointed from forge (retired) to
  quad-remesh, the surviving api card.

Script-world shape (check() accumulates, PASS n / FAIL m, nonzero on
failure). No gateway, no GPU, no engine binaries — compose
phase-1/phase-2 only (the CLI emits graphs, never runs them).
"""

import json
import os
import sys

PASS = FAIL = 0


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                            (" — " + str(note)[:160] if note and not ok else "")))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


REPO = os.path.normpath(os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
sys.path.insert(0, os.path.join(REPO, "python"))

from melite_cards import scan_engine_cards  # noqa: E402

CARDS = scan_engine_cards(REPO)

# -- scan visibility (the mono-engine shape) ----------------------------
check("quad-remesh scans", "quad-remesh" in CARDS)
check("comfyui music keeps its id",
      "music" in CARDS and "comfyui" in CARDS["music"][0]
      and "music3" in CARDS["music"][1].families_of())
check("quad-remesh is api", CARDS["quad-remesh"][1].api is True)
# (RETIRED 2026-09-08 with the quarantine: forge / music-native /
# auto-rig scans — their engines live under vendor/retired-engines/.)

# -- quad-remesh doors ---------------------------------------------------
# (ONE-IMPLEMENTATION RULE, 2026-09-07, the cpp→node cutover: the cpp
# arm retired with the lane — declarations stream, so the py card.py
# moved comfyui-side and the render arm is the Cordis TS card now.
# These legs drive the SAME doors through the CLI compose door
# (node --experimental-strip-types), the wall's no-GPU/no-engine-
# binary shape unchanged: the CLI emits graphs, never runs them.)
import shutil as _shutil  # noqa: E402
import subprocess as _sp  # noqa: E402

_QCARD = "quad-remesh"
_QMODEL = "autoremesher"
_QFACTS = os.path.join(REPO, "packages", "engines", "comfyui",
                       "cordis", "data", "model-facts.json")
_QCLI = os.path.join(REPO, "packages", "engines", "comfyui",
                     "cordis", "src", "cli.ts")


def _qcompose(params: dict, run_id: str = "") -> "tuple[int, object, str]":
    """The Cordis door for the quad card: (rc, graph-or-None,
    last-stderr-line). Mirrors tests/walls/suites/test_cordis_compose
    run_cli (same argv, same hermetic env)."""
    argv = [_shutil.which("node") or "node",
            "--experimental-strip-types", "--no-warnings",
            _QCLI, "compose",
            "--card", _QCARD, "--model", _QMODEL,
            "--facts", _QFACTS,
            "--params", json.dumps(params)]
    if run_id:
        argv += ["--run-id", run_id]
    proc = _sp.run(argv, capture_output=True, text=True, timeout=120,
                   env={"PATH": "/usr/bin:/bin:/usr/local/bin",
                        "NODE_OPTIONS": "--no-warnings"},
                   cwd=REPO)
    graph = None
    if proc.returncode == 0:
        try:
            graph = json.loads(proc.stdout)
        except ValueError:
            graph = None
    tail = [l for l in (proc.stderr or "").strip().splitlines()
            if l.strip()]
    return proc.returncode, graph, (tail[-1] if tail else "")


rc, _g, err = _qcompose({})
check("quad phase-1 refuses missing input",
      rc != 0 and "'input'" in (err or ""), err)
rc, _g, err = _qcompose({"input": "x.obj", "smooth_normal": 0.5})
check("quad phase-1 refuses smooth_normal (node hardcodes 0.0)",
      rc != 0 and "smooth_normal" in (err or "")
      and "nodes.py" in (err or ""), err)
rc, g, err = _qcompose({"input": "x.obj", "target_quads": 5000},
                       "run-t")
check("quad phase-2 emits the single-node graph",
      rc == 0 and isinstance(g, dict)
      and list((g or {}).keys()) == ["AutoRemesher.0"], err)
check("quad budget rides the node",
      isinstance(g, dict)
      and (g.get("AutoRemesher.0") or {}).get("inputs", {}).get(
          "target_quads") == 5000)
check("quad prefix is run-scoped",
      isinstance(g, dict)
      and (g.get("AutoRemesher.0") or {}).get("inputs", {}).get(
          "filename_prefix") == "run-t/remeshed")
check("quad preset is the empty budget literal",
      isinstance(g, dict)
      and (g.get("AutoRemesher.0") or {}).get("inputs", {}).get(
          "preset") == "")

# RETIRED with the quarantine (2026-09-08) — subjects under
# vendor/retired-engines/, history at the parent commit:
# - the auto-rig doors (skintokens arms; SKINTOKENS_BIN/MODEL gates)
# - the music-native binary gate (audio-cpp arm; AUDIO_CPP_CLI)
# - the forge doors (anycreature arms; wolf-spec accept, skeleton)

# -- the AGENT-SURFACE wall (born on the 2026-09-06 kimodo 502;
# re-pointed at forge 2026-09-06, RE-PINNED at quad-remesh 2026-09-08
# when forge retired with the anycreature engine) -----
# A card scanned, validated, and RAN, but the DSH lane registrar
# 502'd: lane_disclosure kept a depth-2 walk while every other
# consumer rode the shared plugins walk, so the natives never
# mounted on peek/card-tools/bundle; /v1/card-tools?lane= also
# ignored the lane query (the registrar demands EXACTLY the lane's
# manifest). These pins hold the whole agent surface to the scan.
import lane_disclosure as _ld  # noqa: E402

check("quad card scans", "quad-remesh" in CARDS)

_peek_ids = sorted(r["lane"] for r in _ld.peek()["lanes"]
                   if r["kind"] == "action_card")
check("peek lists quad-remesh", "quad-remesh" in _peek_ids)
check("peek lane ids are unique", len(_peek_ids) == len(set(_peek_ids)),
      [i for i in _peek_ids if _peek_ids.count(i) > 1])
_scan_api = sorted(cid for cid, (_p, cls) in CARDS.items() if cls.api)
check("peek serves every api card (the shared walk)",
      set(_scan_api) <= set(_peek_ids),
      sorted(set(_scan_api) - set(_peek_ids)))

_tool_names = [m["name"] for m in _ld.card_tools()]
check("card-tools serves quad_remesh_card",
      "quad_remesh_card" in _tool_names)
_lane_one = _ld.card_tools("quad-remesh")
check("lane filter serves exactly the lane's manifest",
      [m["name"] for m in _lane_one] == ["quad_remesh_card"])
check("lane filter resolves model ids (autoremesher)",
      [m["name"] for m in _ld.card_tools("autoremesher")]
      == ["quad_remesh_card"])
try:
    _ld.card_tools("no-such-lane")
    check("lane filter refuses unknown lanes", False, "no refusal")
except LookupError:
    check("lane filter refuses unknown lanes", True)

_code, _bundle = _ld.lane_bundle("quad-remesh", "action_card")
check("bundle 200", _code == 200)
check("bundle lane is canonical",
      _bundle.get("lane") == "quad-remesh"
      and _bundle.get("card") == "quad-remesh")
# (the inline agent-doc pin rides the MOTION card — the lane that
# owns an agent doc; the quad card ships none)
_mcode, _mbundle = _ld.lane_bundle("motion", "action_card")
check("motion bundle carries the inline agent doc",
      _mcode == 200 and bool((_mbundle.get("agent") or {}).get("content")))

# (the kimodo compose doors RETIRED with the lane — the comfyui
# kimodo card's doors are pinned by the python-cards walls)

print("PASS %d / FAIL %d" % (PASS, FAIL))
sys.exit(1 if FAIL else 0)

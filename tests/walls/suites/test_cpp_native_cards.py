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
failure). No GPU, no engine binaries — compose phase-1/phase-2 only
(the CLI emits graphs, never runs them); the agent-surface section
boots one scratch TS gateway (no oracle — S-snapshots 2026-09-08).
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

# PURGE S-decls (2026-09-08): the card.py scan is deleted — the
# census reads the TS registry through the shared dumper (the
# single declaration). {id: row}.
import subprocess as _sp  # noqa: E402

_qdump = _sp.run(
    ["node", "--experimental-strip-types", "--no-warnings",
     os.path.join(REPO, "packages", "engines", "comfyui", "cordis",
                   "src", "dump-registry.ts")],
    cwd=REPO, capture_output=True, text=True, timeout=180)
assert _qdump.returncode == 0, \
    "registry dumper rc=%d %s" % (_qdump.returncode,
                                  (_qdump.stderr or "")[-300:])
CARDS = json.loads(_qdump.stdout.strip().splitlines()[-1])["cards"]

# -- registry visibility (the mono-engine shape) -------------------
check("quad-remesh registers", "quad-remesh" in CARDS)
check("comfyui music keeps its id",
      "music" in CARDS
      and "music3" in CARDS["music"]["boarded"])
check("quad-remesh is a serving card",
      len(CARDS["quad-remesh"]["boarded"]) > 0
      and len(CARDS["quad-remesh"]["knobs"]) > 0)
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
#
# (PURGE S-snapshots 2026-09-08: the oracle's snapshot arm died
# with the card-dir tool.json files — this section drives the LIVE
# doors on a scratch TS gateway instead of lane_disclosure. The
# served set is the registry projection now.)
import urllib.request as _url  # noqa: E402
import urllib.error as _urlerr  # noqa: E402
import urllib.parse as _urlp  # noqa: E402
sys.path.insert(0, os.path.join(REPO, "tests"))
from _bootstrap import boot_scratch_gateway as _boot, reap_gateway as _reap  # noqa: E402


def _get(port: int, path: str) -> "tuple[int, object]":
    req = _url.Request("http://127.0.0.1:%d%s" % (port, path), method="GET")
    try:
        with _url.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except _urlerr.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode("utf-8"))
        except ValueError:
            return e.code, None


_ts_port, _ts_proc = _boot(wait_path="/v1/queue", tries=150, sleep=0.2,
                           env=None)
try:
    check("quad card scans", "quad-remesh" in CARDS)

    _st, _lanes = _get(_ts_port, "/v1/lanes?kind=card")
    _peek_ids = sorted(
        r["lane"] for r in (_lanes or {}).get("lanes", [])
        if r["kind"] == "action_card")
    check("peek lists quad-remesh",
          _st == 200 and "quad-remesh" in _peek_ids, _st)
    check("peek lane ids are unique",
          len(_peek_ids) == len(set(_peek_ids)),
          [i for i in _peek_ids if _peek_ids.count(i) > 1])
    # (PURGE S-decls: the served set is the registry now. Peek is the
    # model-lane surface — every card boarding a family must be
    # peek-served. Pure-tool cards (no boarded family) disclose through
    # /v1/tools, pinned by the chrome wall.)
    _scan_api = sorted(cid for cid, row in CARDS.items() if row["boarded"])
    check("peek serves every boarding registry card (the projection)",
          set(_scan_api) <= set(_peek_ids),
          sorted(set(_scan_api) - set(_peek_ids)))

    _st, _ct = _get(_ts_port, "/v1/card-tools")
    _tool_names = [m["name"] for m in (_ct or [])]
    check("card-tools serves quad_remesh_card",
          _st == 200 and "quad_remesh_card" in _tool_names, _st)
    _st, _lane_one = _get(_ts_port, "/v1/card-tools?lane=quad-remesh")
    check("lane filter serves exactly the lane's manifest",
          _st == 200
          and [m["name"] for m in (_lane_one or [])] == ["quad_remesh_card"],
          _st)
    _st, _lane_model = _get(_ts_port, "/v1/card-tools?lane=autoremesher")
    check("lane filter resolves model ids (autoremesher)",
          _st == 200
          and [m["name"] for m in (_lane_model or [])] == ["quad_remesh_card"],
          _st)
    _st, _ = _get(_ts_port, "/v1/card-tools?lane=" + _urlp.quote("no-such-lane"))
    check("lane filter refuses unknown lanes", _st == 404, _st)

    _code, _bundle = _get(_ts_port, "/v1/cards/quad-remesh/bundle")
    check("bundle 200", _code == 200, _code)
    check("bundle lane is canonical",
          (_bundle or {}).get("lane") == "quad-remesh"
          and (_bundle or {}).get("card") == "quad-remesh")
    # (the inline agent-doc pin rides the MOTION card — the lane that
    # owns an agent doc; the quad card ships none)
    _mcode, _mbundle = _get(_ts_port, "/v1/cards/motion/bundle")
    check("motion bundle carries the inline agent doc",
          _mcode == 200 and bool(((_mbundle or {}).get("agent") or {}).get("content")),
          _mcode)
finally:
    _reap(_ts_proc)

# (the kimodo compose doors RETIRED with the lane — the comfyui
# kimodo card's doors are pinned by the python-cards walls)

print("PASS %d / FAIL %d" % (PASS, FAIL))
sys.exit(1 if FAIL else 0)

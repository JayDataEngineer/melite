#!/usr/bin/env python3
"""Tests for py/card_requires.py — card extension requirement validation."""

import sys
from pathlib import Path

from _anchor import REPO  # noqa: F401 — owns the py/ path insert
from card_requires import check_card_requires, EXTENSION_NODE_TYPES


def _ok(label: str, condition: bool, detail: str = "") -> bool:
    status = "PASS" if condition else "FAIL"
    if detail:
        print(f"  {status}  {label} — {detail}")
    else:
        print(f"  {status}  {label}")
    return condition


passed = 0
failed = 0

# ── T1: empty requires ──
ok, msg = check_card_requires([])
r = _ok("T1 empty requires", ok and msg == "")
passed += r; failed += (not r)

# ── T2: None requires ──
ok, msg = check_card_requires(None)
r = _ok("T2 None requires", ok and msg == "")
passed += r; failed += (not r)

# ── T3: known extension with nodes in object_info ──
# 2026-09-05 drift fix: the declaration vocabulary is the BASE pack
# (h3-timeline/nodes.yaml: comfyui-h3-motion-context v0.5.1 — it owns
# the four MiniMaxH3MotionContext class names "under coexistence with
# the MultiRef fork"; the fork name was never a card declaration).
ok, msg = check_card_requires(
    ["comfyui-h3-motion-context"],
    server_url="http://127.0.0.1:18465",
)
r = _ok("T3 installed extension via object_info", ok, msg)
passed += r; failed += (not r)

# ── T4: fake extension with no node mapping and no disk ──
ok, msg = check_card_requires(
    ["FakeNonExistentExtension12345"],
    server_url="http://127.0.0.1:18465",
    custom_nodes_dir="/tmp/nonexistent",
)
r = _ok("T4 fake extension refused", not ok, "correctly refused" if not ok else msg)
passed += r; failed += (not r)

# ── T5: mixed real + fake ──
ok, msg = check_card_requires(
    ["ComfyUI-KJNodes", "FakeNonExistentExtension12345"],
    server_url="http://127.0.0.1:18465",
    custom_nodes_dir="/tmp/nonexistent",
)
r = _ok("T5 mixed real+fake refuses", not ok)
passed += r; failed += (not r)

# ── T6: h3-timeline card's REAL requires (all installed on this
# server) — 2026-09-05 drift fix: the list mirrors the card class
# requires (the video-gen card declares NONE — its families ride core
# + VHS; 'melite-video' is declared once in plugins/melite-video/
# nodes/extensions.yaml, never a card require).
ok, msg = check_card_requires(
    [
        "comfyui-h3-motion-context",
        "ComfyUI-PlagueKind-Nodes",
        "ComfyUI-Frame-Interpolation",
        "ComfyUI-KJNodes",
        "ComfyUI-SeedVR2_VideoUpscaler",
        "ComfyUI-LTXVideo",
    ],
    server_url="http://127.0.0.1:18465",
)
r = _ok("T6 h3-timeline requires all installed", ok, msg)
passed += r; failed += (not r)

# ── T7: unreachable server — graceful fallback ──
ok, msg = check_card_requires(
    ["ComfyUI-KJNodes"],
    server_url="http://127.0.0.1:99999",
    custom_nodes_dir="/tmp/nonexistent",
)
r = _ok("T7 unreachable server refuses (no false positive)", not ok)
passed += r; failed += (not r)

# ── T8: EXTENSION_NODE_TYPES covers all requires fields in card.yaml ──
import yaml
all_reqs = set()
for cy in Path("plugins").rglob("cards/*/card.yaml"):
    cfg = yaml.safe_load(cy.read_text()) or {}
    for ext in cfg.get("requires", []):
        all_reqs.add(ext.strip())
unmapped = all_reqs - set(EXTENSION_NODE_TYPES.keys())
r = _ok("T8 all card requires have node mappings", not unmapped,
        f"unmapped: {unmapped}" if unmapped else "all mapped")
passed += r; failed += (not r)

# ── T9: card.yaml files parse correctly with requires ──
card_count = 0
req_count = 0
for cy in Path("plugins").rglob("cards/*/card.yaml"):
    cfg = yaml.safe_load(cy.read_text()) or {}
    card_count += 1
    reqs = cfg.get("requires", [])
    if reqs:
        req_count += 1
        assert isinstance(reqs, list), f"requires in {cy} is not a list"
        for r in reqs:
            assert isinstance(r, str), f"requires entry in {cy} is not a string: {r}"
r = _ok("T9 card.yaml parse with requires", True,
        f"{req_count}/{card_count} cards have requires")
passed += r; failed += (not r)

# ── T10: every class-declared require resolves (2026-09-06) ──
# card.yaml is extinct; requires rides the card class (requires +
# requires_by_family). Every named id must hit the node-type map or
# the vendor disk — the two strategies that can satisfy the gate.
# (Strategy-3 heuristic names are best-effort by design and stay out.)
from melite_cards import load_card_py  # noqa: E402
_mapped = set(EXTENSION_NODE_TYPES.keys())
_vendor = set()
_vdir = REPO / "vendor" / "comfyui_extensions"
if _vdir.is_dir():
    _vendor = {e.name.lower() for e in _vdir.iterdir()}
_unresolved = set()

discover = set()
for _pat in ("engines/*/cards/*/card.py",
               "engines/*/action_cards/*/card.py",
               "engines/*/action_cards/*/*/card.py",
               "engines/*/action_cards/*/*/py/card.py"):
    discover |= set((REPO / "plugins").glob(_pat))
for _cpy in sorted(discover):
    try:
        _pdir = _cpy.parent
        if _pdir.name == "py":
            _eng = _pdir.parent.parent.parent.parent.name
        elif _pdir.parent.name in ("cards", "action_cards"):
            _eng = _pdir.parent.parent.name
        else:
            _eng = _pdir.parent.parent.parent.name
        _cls = load_card_py(str(_cpy), _eng)
    except Exception:
        continue
    _named = list(getattr(_cls, "requires", ()) or [])
    _fam = getattr(_cls, "requires_by_family", {}) or {}
    if isinstance(_fam, dict):
        for _v in _fam.values():
            _named.extend(list(_v) if isinstance(_v, (tuple, list)) else [_v])
    for _ext in _named:
        if _ext not in _mapped and _ext.lower() not in _vendor:
            _unresolved.add("%s (%s)" % (_ext, _cls.id))
r = _ok("T10 class-declared requires resolve", not _unresolved,
        f"unresolved: {sorted(_unresolved)}" if _unresolved else "all resolve")
passed += r; failed += (not r)

# ── T11: LAW 0 system-binary requirement (2026-09-07) ──
# melite-autorig-nodes shells `blender -b`; the compose gate refuses
# BEFORE any run registers when the binary is unresolvable. Fully
# mocked — deterministic on machines with or without Blender.
import os as _os  # noqa: E402
from unittest import mock  # noqa: E402
from card_requires import SYSTEM_BINARY_REQUIRES  # noqa: E402
r = _ok("T11 autorig pins the blender system requirement",
        SYSTEM_BINARY_REQUIRES.get("melite-autorig-nodes") ==
        (("SKINTOKEN_BLENDER_BIN", "BLENDER_BIN"), "blender"),
        "Law-0 pair drifted")
passed += r; failed += (not r)
_saved_env = {v: _os.environ.get(v) for v in
              ("SKINTOKEN_BLENDER_BIN", "BLENDER_BIN")}
try:
    for v in ("SKINTOKEN_BLENDER_BIN", "BLENDER_BIN"):
        _os.environ.pop(v, None)
    with mock.patch("shutil.which", return_value=None):
        ok, msg = check_card_requires(
            ["melite-autorig-nodes"], server_url=None,
            custom_nodes_dir="/tmp/nonexistent")
    r = _ok("T11 missing blender binary refuses at compose", not ok and
            "blender" in msg, msg if ok else "refused with the need named")
    passed += r; failed += (not r)
    # Env override bypasses the PATH probe (mirrors the pack resolver).
    _os.environ["BLENDER_BIN"] = "/opt/blender/blender"
    with mock.patch("shutil.which", return_value=None):
        ok, msg = check_card_requires(
            ["melite-autorig-nodes"], server_url=None,
            custom_nodes_dir="/tmp/nonexistent")
    r = _ok("T11 BLENDER_BIN override passes the binary leg",
            not ok and "blender" not in msg,
            "binary leg leaked past the override" if ok or
            "blender" in msg else "fell through to the extension check")
    passed += r; failed += (not r)
finally:
    for v, val in _saved_env.items():
        if val is None:
            _os.environ.pop(v, None)
        else:
            _os.environ[v] = val

# ── T12: LAW 0 system-binary requirement for the remesh pack ──
# (2026-09-07, the cpp→node cutover): melite-autoremesher-nodes
# shells the AutoRemesher binary; the arm's resolve_cli gate moved
# to the rim (SYSTEM_BINARY_REQUIRES) with this wall as its
# hermetic pin — same shape as T11, no server, no binary.
r = _ok("T12 autoremesher pins the binary system requirement",
        SYSTEM_BINARY_REQUIRES.get("melite-autoremesher-nodes") ==
        (("AUTOREMESHER_BIN",), "autoremesher"),
        "Law-0 pair drifted")
passed += r; failed += (not r)
_saved12 = _os.environ.get("AUTOREMESHER_BIN")
try:
    _os.environ.pop("AUTOREMESHER_BIN", None)
    with mock.patch("shutil.which", return_value=None):
        ok, msg = check_card_requires(
            ["melite-autoremesher-nodes"], server_url=None,
            custom_nodes_dir="/tmp/nonexistent")
    r = _ok("T12 missing autoremesher binary refuses at compose",
            not ok and "autoremesher" in msg,
            msg if ok else "refused with the need named")
    passed += r; failed += (not r)
    _os.environ["AUTOREMESHER_BIN"] = "/opt/autoremesher/bin/cli"
    with mock.patch("shutil.which", return_value=None):
        ok, msg = check_card_requires(
            ["melite-autoremesher-nodes"], server_url=None,
            custom_nodes_dir="/tmp/nonexistent")
    r = _ok("T12 AUTOREMESHER_BIN override passes the binary leg",
            # the pack name itself contains "autoremesher" — the
            # discriminator is the BINARY hint ("install
            # autoremesher"), which must be gone; the refusal that
            # remains names the missing EXTENSION pack.
            not ok and "install autoremesher" not in msg
            and "melite-autoremesher-nodes" in msg,
            "binary leg leaked past the override" if ok or
            "install autoremesher" in msg
            else "fell through past the extension check: %s" % msg[:120])
    passed += r; failed += (not r)
finally:
    if _saved12 is None:
        _os.environ.pop("AUTOREMESHER_BIN", None)
    else:
        _os.environ["AUTOREMESHER_BIN"] = _saved12

print(f"\n{'PASS' if not failed else 'FAIL'} {passed} / FAIL {failed}")
sys.exit(1 if failed else 0)

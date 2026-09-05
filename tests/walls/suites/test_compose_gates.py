"""Compose-gate wall: no silent knob drops on the card→lane splice.

The audit (2026-09-05, operator order): a card param the compose
lane doesn't know must REFUSE (rc=-3, field-named) — never burn a
GPU slot with the knob silently unspliced. Probed live, three
shapes found:
  - GATED (12 lanes): frozen pydantic Params, extra="forbid" —
    a bogus knob is rc=-3 before registration (anny proven below).
  - RECIPE-GATED (mask_studio): the outputs recipe is strict, but
    TOP-LEVEL knobs are duck-typed .get() reads — a bogus top-level
    knob is rc=0 with the knob absent (proven below).
  - UNGATED (ideogram4): no schema at all — same silent rc=0
    (proven below).

This wall pins (1) the gate SHAPE tree-wide — every arm ships
schema.py, wires it, and every row forbids — with the two open
lanes as EQUALITY-pinned dispensations (a third open lane fails;
a fix deletes its entry), and (2) the drop MECHANICS as
self-inverting probes: they pass while the gap exists and fail
LOUD the day a gate lands (telling the owner to delete the
dispensation entry and flip the probe to the refusal shape) —
or if probe setup broke under churn (telling the owner to repair
the probe, never to delete it).
"""

import importlib.util
import json
import os
import re
import sys
from types import ModuleType

import pytest

from _anchor import REPO

COMPOSE_ROOT = os.path.join(REPO, "plugins", "engines", "comfyui",
                            "compose")
CARDS_ROOT = os.path.join(REPO, "plugins", "engines", "comfyui",
                          "action_cards")

# Open lanes: NONE (2026-09-05 — the duck-typing sweep closed the last
# two: ideogram4 grew IdeogramParams, mask_studio grew _FlatParams over
# its flat top-level). The set is equality-pinned EMPTY: a new gateless
# lane fails this wall, and there must never be one again.
_UNGATED: dict[str, str] = {}

_MODEL_CONFIG_RE = re.compile(r"model_config\s*=\s*(\{[^}]*\}|ConfigDict\([^)]*\))")


def _arms() -> list[tuple[str, str]]:
    out = []
    for genre in sorted(os.listdir(CARDS_ROOT)):
        gd = os.path.join(CARDS_ROOT, genre)
        if not os.path.isdir(gd):
            continue
        for card in sorted(os.listdir(gd)):
            cp = os.path.join(gd, card, "py", "compose.py")
            if os.path.isfile(cp):
                out.append((genre + "/" + card, os.path.join(
                    gd, card, "py")))
    return out


def _load_arm(py_dir: str) -> ModuleType:
    for p in (os.path.join(REPO, "py"), COMPOSE_ROOT):
        if p not in sys.path:
            sys.path.insert(0, p)
    name = "gateprobe_" + os.path.basename(
        os.path.dirname(py_dir)).replace("-", "_")
    path = os.path.join(py_dir, "compose.py")
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def test_every_arm_ships_a_wired_forbid_gate() -> None:
    ungated = set()
    for lane, py_dir in _arms():
        sp = os.path.join(py_dir, "schema.py")
        cp = os.path.join(py_dir, "compose.py")
        src = open(cp, encoding="utf-8").read()
        if not os.path.isfile(sp):
            ungated.add(lane)
            continue
        assert "schema" in src, (
            "%s compose.py never touches its schema.py — a gate "
            "that isn't called is documentation, not a gate" % lane)
        if "parse_card" not in src:
            # a schema wired for a SUB-gate only (mask_studio's
            # recipe) still leaves top-level knobs open — the
            # top-level door is parse_card, nothing else.
            ungated.add(lane)
            continue
        for cfg in _MODEL_CONFIG_RE.findall(
                open(sp, encoding="utf-8").read()):
            assert "forbid" in cfg, (
                "%s schema.py carries a lenient row (%s) — one "
                "non-forbid row is a hole bogus knobs walk through"
                % (lane, cfg))
    assert ungated == set(_UNGATED), (
        "ungated-lane set changed: %s (want exactly %s) — a new "
        "gateless lane (refused) or a gate landed (delete its "
        "_UNGATED entry with the fix)"
        % (sorted(ungated), sorted(_UNGATED)))


def test_gated_arm_refuses_unknown_knob() -> None:
    """Anny is the control: forbid fires at the phase-1 door."""
    anny = os.path.join(CARDS_ROOT, "3d", "anny", "py")
    real = os.path.join(anny, "schema.py")  # any real file passes existence
    rc, _, _, err = _load_arm(anny).compose(
        {"params": {"body_glb": real, "bogus_knob": 7}}, "anny", "")
    assert rc == -3 and err is not None and "refused" in err, (
        "anny's forbid gate stopped refusing bogus knobs: rc=%r "
        "err=%r — a removed gate is a regression, restore it" % (rc, err))


def _drop_probe(lane: str, body: dict[str, dict[str, str | int]], model: str) -> None:
    """Tri-state: gap persists (pass) / gate landed (fail, flip me) /
    setup broke (fail, repair me). Never silently green."""
    arm = _load_arm(os.path.join(CARDS_ROOT, *lane.split("/"), "py"))
    rc, _, extra, err = arm.compose(body, model, "")
    inputs = (extra or {}).get("inputs", {}) or {}
    if rc == 0 and "bogus_knob" not in inputs:
        return  # the gap, documented — _UNGATED tracks it
    if rc != 0 and err and ("bogus_knob" in err or "extra" in err
                            or "not in the card surface" in err):
        pytest.fail(
            "%s grew a gate (bogus knob refused: %s) — delete its "
            "_UNGATED entry and flip this probe to the refusal "
            "shape" % (lane, err))
    pytest.fail(
        "%s drop probe is inconclusive: rc=%r err=%r — probe setup "
        "broke under churn (repair the probe, never delete it)"
        % (lane, rc, err))


def test_ideogram4_gate_refuses_unknown_knob() -> None:
    """Flip of the old drop probe (the gate landed 2026-09-05 with
    the duck-typing sweep): ideogram4 now refuses bogus knobs at the
    phase-1 door instead of dropping them silent — same refusal shape
    as the anny control."""
    lane = os.path.join(CARDS_ROOT, "image", "ideogram4", "py")
    rc, _, _, err = _load_arm(lane).compose(
        {"params": {"prompt": "gate landed probe", "bogus_knob": 7}},
        "ideogram", "")
    assert rc == -3 and err is not None and "bogus_knob" in err, (
        "ideogram4's forbid gate stopped refusing bogus knobs: rc=%r "
        "err=%r — a removed gate is a regression, restore it"
        % (rc, err))


def test_mask_studio_gate_refuses_unknown_top_level_knob() -> None:
    """Flip of the old drop probe (the top-level gate landed
    2026-09-05 with the duck-typing sweep — _FlatParams forbids over
    the stanza-less body): mask_studio refuses a bogus TOP-LEVEL knob
    while its recipe sub-gate stays strict — no lane drops silent."""
    ms = os.path.join(CARDS_ROOT, "image", "mask_studio", "py")
    recipe = json.dumps(
        [{"selection": {"kind": "detect", "class": "face"}}])
    rc, _, _, err = _load_arm(ms).compose(
        {"params": {"input_image": os.path.join(ms, "schema.py"),
                    "outputs": recipe, "bogus_knob": 7}},
        "mask-studio", "")
    assert rc == -3 and err is not None and "bogus_knob" in err, (
        "mask_studio's top-level forbid gate stopped refusing bogus "
        "knobs: rc=%r err=%r — a removed gate is a regression, "
        "restore it" % (rc, err))

#!/usr/bin/env python3
"""P6 verbs-as-decl-data + card_outputs door wall.

Ladder P6 execution stroke ("anny verbs as decl data; card_outputs
enforced in the TS door"): the anny SubAction verbs are wired as code
paths today (py verbs.py classes → mounted on the anny card → TSX
chips posting flows / the tenant-local preset action) with ZERO TS
presence (drift item 5). This wall pins their port as DECL DATA —
packages/gateway-core/src/schema/verbs.ts (verb → card/params table, the
door dispatching table-driven) — and pins the card_outputs settle
gate in the same module (TS outputViolation / applyRunContract,
wired into the TS serve path: doors/flowsRun.ts runOne, no-op
without card context).

ORACLE DEATH 2026-09-08 (operator order verbatim: "we do not need
parity, we need to migrate, not keep the old machinery"): Phases
O02–O05 used to assert the TS refusal bytes == the retired py
serving oracle's output-violation text (a lazy `import gateway`).
They now assert the TS bytes == the frozen TS goldens beside this
suite (golden_ts/test_gateway_verbs_outputs/refusals.json, causes
recorded in its causes.md). The V-phase verb-table legs compared the
TS table against keeper oracles (the verbs.py source module, the
card-decls.json snapshot, the TSX chips).
PURGE S-decls 2026-09-08: the scan oracle (card.py _verbs_ mounts)
+ tools/export_card_decls.verb_meta + the card-decls.json snapshot
are deleted — V01/V03–V06 read the FROZEN_KEEPERS below (transcribed
from those oracles at the cut). The verbs.py module + the TSX chips
stay live witnesses. O01 (CARD_OUTPUTS == decls outputs[]) is
retired with the snapshot: the table is hand-owned, every row's
content pins behaviorally in O02–O05, and O01 now pins row shape +
the deletion.

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

  Phase V — every verb dispatched table-driven:
    V01 the closed 7-verb census: the frozen mount map (5 mounted,
        rig-somax + apply-skin declared-but-unmounted) + the live
        verbs.py module + the two TSX verb tables.
    V02 the TS table names exactly the 7 (no 8th either side).
    V03 per-verb agreement, field-for-field on the dispatch surface
        (label/card/families/engines/writes/requires + every knob's
        name/kind/required/default/options vs the frozen verb_meta
        rows — transcribed from the retired scan oracle at the cut).
    V04 dispatch agreement: each verb resolves to its declared flow
        (queue work) or local action (preset-save never burns a
        serial-GPU slot), with card + writes context.
    V05 unknown-verb refusal: both sides agree the id is unknown; the
        TS text is the new-door contract, pinned exact.
    V06 unknown-engine refusal: same shape, one verb.
    V07 the TS table dispatches only to real targets: every table
        flow loads (flow_mod.load_flow) and every requires pack is
        in-tree (vendor/comfyui_extensions/<pack>).
  Phase O — outputs enforcement (the TS contract, frozen as goldens):
    O01 row shape (labels + patterns non-empty on every row) + the
        retired snapshot stays deleted (mono-engine 2026-09-08:
        auto-rig / forge / music-native retired with their engines,
        quarantine 47e1c583; content pins ride O02–O05).
    O02 golden artifact sets pass the TS side (TS outputViolation):
        mesh + views, multi-row cards, any-of rows,
        case-insensitive suffixes.
    O03 deficient outputs refuse with the frozen TS text (empty,
        None, views-only, second-row-missing on multi-row cards).
    O04 surplus outputs refuse with the frozen TS text (junk present
        but the promise missing — the text echoes the surplus:
        sorted, deduped, first-8, lowercased, falsy-filtered).
    O05 the run-level settle arm: completed + violation flips to
        failed with the frozen TS text; every other status, unknown
        cards, and cardless runs pass through.
    O06 served shape: an engine-down run through the live TS door
        settles failed WITHOUT contract text (the gate only fires on
        completed) and the status body carries no cardId leak.

TS-vs-literal agreement is byte equality on refusal texts, value equality
on tables/dispatch. No GPU, no network (O06 boots the TS door
against a dead engine port — connection-refused, never inference).

Keeper cites: verbs packages/engines/comfyui/models/3d/anny/mods/verbs.py
(EstimateBody 21-33, Dress 36-80, Prop 83-123, RigSomax 126-143,
ApplySkin 145-179, SavePreset 181-200, LoadPreset 203-221); mount
models/3d/anny/model.py:110 (frozen as FROZEN_MOUNTED — model.py is
S-oracle prey, not this stroke); contract python/melite_cards/dsl.py
SubActionMod 857-869 + VerbEngine 822-854 (frozen as
FROZEN_VERB_ORACLE rows); outputs gate
packages/gateway-core/src/schema/verbs.ts outputViolation +
applyRunContract (served via doors/flowsRun.ts runOne); TSX renderer
action_cards/3d/anny/ui/studio/component.tsx
ANNY_VERBS 97-134 + ANNY_PRESET_VERBS 447-448.

Run: python3 tests/walls/suites/test_gateway_verbs_outputs.py
     (or pytest — native test_ functions, no registry booking).
"""

from __future__ import annotations

import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

import pytest

from _anchor import REPO

import flow as flow_mod

TS_VERBS = REPO / "packages" / "gateway-core" / "src" / "schema" / "verbs.ts"
TS_SERVER = REPO / "apps" / "gateway" / "src" / "main.ts"
VERBS_PY = (REPO / "packages" / "engines" / "comfyui" / "models" / "3d"
            / "anny" / "mods" / "verbs.py")
TSX = (REPO / "packages" / "engines" / "comfyui" / "action_cards" / "3d"
       / "anny" / "ui" / "studio" / "component.tsx")
VENDOR_PACKS = REPO / "vendor" / "comfyui_extensions"

# The closed census (V01 pins this exact set from three py witnesses).
EXPECTED_VERBS = sorted([
    "hmr-estimate", "dress", "prop", "rig-somax", "apply-skin",
    "preset-save", "preset-load",
])
# Mount order on the anny card (model.py:110 — mods tuple order).
EXPECTED_MOUNTED = [
    "hmr-estimate", "preset-save", "preset-load", "dress", "prop",
]
EXPECTED_UNMOUNTED = ["rig-somax", "apply-skin"]


# ── node driver (one file, ops argv — the queue-parity pattern) ──

DRIVER = """import * as v from %s;
const op = process.argv[2] ?? "";
const arg = JSON.parse(process.argv[3] ?? "{}");
const out = {};
if (op === "dump") {
  out.verbs = v.VERB_DECLS;
  out.known = v.KNOWN_VERB_IDS;
  out.outputs = v.CARD_OUTPUTS;
} else if (op === "dispatch") {
  out.results = arg.cases.map((c) =>
    v.dispatchVerb(c.verb, c.engine));
} else if (op === "violate") {
  out.results = arg.cases.map((c) =>
    v.outputViolation(c.card, c.artifacts));
} else if (op === "settle") {
  out.results = arg.cases.map((c) => v.applyRunContract(
    { status: c.status, error: c.error }, c.artifacts, c.cardId));
}
console.log(JSON.stringify(out));
"""


def _node() -> str:
    node = shutil.which("node")
    assert node is not None, "node not on PATH"
    return node


@pytest.fixture(scope="module")
def driver() -> Path:
    d = Path(tempfile.gettempdir()) / ("wall-verbs-%d.mts" % os.getpid())
    d.write_text(DRIVER % json.dumps(TS_VERBS.as_uri()))
    return d


def node_run(driver: Path, op: str, arg: dict) -> dict:
    p = subprocess.run(
        [_node(), "--experimental-strip-types", "--no-warnings",
         str(driver), op, json.dumps(arg)],
        cwd=str(REPO), capture_output=True, text=True, timeout=120)
    assert p.returncode == 0, \
        "node %s rc=%d %s" % (op, p.returncode, (p.stderr or "")[-400:])
    try:
        return json.loads(p.stdout.strip().splitlines()[-1])
    except ValueError as e:
        raise AssertionError("node %s unparseable: %r" % (op, e))


@pytest.fixture(scope="module")
def ts_dump(driver: Path) -> dict:
    return node_run(driver, "dump", {})


# ── py oracles ──

def _verbs_module():
    spec = importlib.util.spec_from_file_location(
        "wall_anny_verbs", str(VERBS_PY))
    assert spec is not None and spec.loader is not None
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


# ── frozen verb keepers (purge S-decls 2026-09-08) ──
# Transcribed from the retired oracles at the cut (scan of the
# deleted card.py _verbs_ mounts + tools/export_card_decls.verb_meta
# + the verbs.py module for the unmounted pair). The oracles are
# gone; these literals pin the content the TS table must carry.
# V01/V03–V06 read them; the verbs.py module + TSX chips stay live.
FROZEN_MOUNTED = {'anny': ['hmr-estimate', 'preset-save', 'preset-load', 'dress', 'prop']}

FROZEN_VERB_ORACLE = {
    'apply-skin': {'engines': [{'flow': 'skin-apply', 'id': 'coat', 'local': '', 'refusal': ''}], 'families': [['anny']], 'id': 'apply-skin', 'knobs': [{'default': 'keeper', 'families': [], 'group': '', 'label': 'Kind', 'name': 'kind', 'options': ['keeper', 'ash_nomad', 'villager_elder', 'villager', 'caravan_trader', 'amf_warden', 'cherusci_scrivener', 'marrow_raider', 'amalgam_horror', 'arena_factor', 'bone_crane', 'dune_hound', 'emberwing', 'gloom_tortoise', 'husk_stalker', 'ironvein_construct', 'meld_creature', 'moss_elk', 'ridge_lizard', 'sand_skimmer'], 'placeholder': '', 'required': False, 'tooltip': 'Which meld kind skins the body (tint stays data in the sidecar).', 'type': 'select', 'visibleWhen': '', 'zone': ''}, {'default': 512, 'families': [], 'group': '', 'label': 'Map size', 'name': 'map_size', 'options': ['256', '512', '1024', '2048'], 'placeholder': '', 'required': False, 'tooltip': 'Detail-map resolution (SkinPack + SkinSidecar must agree — one knob feeds both).', 'type': 'select', 'visibleWhen': '', 'zone': ''}, {'default': 20260906, 'families': [], 'group': '', 'label': 'Seed', 'min': 0, 'name': 'seed', 'placeholder': '', 'required': False, 'step': 1, 'tooltip': 'The deterministic detail seed (SKIN_SEED — same seed, same pores).', 'type': 'number', 'visibleWhen': '', 'zone': ''}], 'label': 'Apply skin detail', 'requires': ['melite-poser-nodes'], 'writes': ['body_glb']},
    'dress': {'engines': [{'flow': 'fit-seat', 'id': 'seat', 'local': '', 'refusal': ''}], 'families': ['anny'], 'id': 'dress', 'knobs': [{'families': [], 'group': '', 'label': 'Outfit GLB', 'name': 'prop', 'placeholder': '', 'required': True, 'tooltip': 'The outfit/prop mesh (.glb estate path or run artifact ref).', 'type': 'text', 'visibleWhen': '', 'zone': ''}, {'families': [], 'group': '', 'label': 'Prop name', 'name': 'model_name', 'placeholder': '', 'required': False, 'tooltip': "Unity lookup name — the chip fills the outfit filename stem; empty seats as 'prop'.", 'type': 'text', 'visibleWhen': '', 'zone': ''}, {'default': 'mixamorig:Spine', 'families': [], 'group': '', 'label': 'Bone', 'name': 'bone', 'placeholder': '', 'required': False, 'tooltip': 'Which bone carries the outfit (coat: Spine, hat: mixamorig:Head).', 'type': 'text', 'visibleWhen': '', 'zone': ''}, {'default': 'socket', 'families': [], 'group': '', 'label': 'Law', 'name': 'align', 'options': ['socket', 'fit', 'grip'], 'placeholder': '', 'required': False, 'tooltip': "socket: hang (coat); fit: measure + scale (hat); grip: hand-lock (weapon — the prop verb's default).", 'type': 'select', 'visibleWhen': '', 'zone': ''}, {'default': '0,0,0', 'families': [], 'group': '', 'label': 'Offset', 'name': 'position', 'placeholder': '', 'required': False, 'tooltip': 'x,y,z meters added after the law (grip forbids non-zero).', 'type': 'text', 'visibleWhen': '', 'zone': ''}, {'default': '0,0,0', 'families': [], 'group': '', 'label': 'Rotation', 'name': 'rotation', 'placeholder': '', 'required': False, 'tooltip': 'x,y,z Unity degrees applied pre-seat (grip forbids non-zero).', 'type': 'text', 'visibleWhen': '', 'zone': ''}, {'default': 0, 'families': [], 'group': '', 'label': 'Fit ratio', 'min': 0, 'name': 'fit_ratio', 'placeholder': '', 'required': False, 'step': 0.01, 'tooltip': 'fit law: prop width as a fraction of the bone span (hat: 1).', 'type': 'number', 'visibleWhen': '', 'zone': ''}, {'families': [], 'group': '', 'label': 'Measure to', 'name': 'fit_ref_bone', 'placeholder': '', 'required': False, 'tooltip': "fit law: the span's far bone (required when fit_ratio > 0).", 'type': 'text', 'visibleWhen': '', 'zone': ''}, {'families': [], 'group': '', 'label': 'Measure from', 'name': 'fit_ref_bone2', 'placeholder': '', 'required': False, 'tooltip': "fit law: the span's near bone (hat: mixamorig:Neck).", 'type': 'text', 'visibleWhen': '', 'zone': ''}, {'default': 0.22, 'families': [], 'group': '', 'label': 'Seat ratio', 'max': 1, 'min': 0, 'name': 'seat_ratio', 'placeholder': '', 'required': False, 'step': 0.01, 'tooltip': 'How far down the span the prop seats (hat: 0.22). Grip ignores this.', 'type': 'number', 'visibleWhen': '', 'zone': ''}, {'families': [], 'group': '', 'label': 'Finger bone', 'name': 'finger_bone', 'placeholder': '', 'required': False, 'tooltip': 'grip law: the blade-axis finger (weapon: mixamorig:RightHandMiddle1).', 'type': 'text', 'visibleWhen': '', 'zone': ''}, {'families': [], 'group': '', 'label': 'Thumb bone', 'name': 'thumb_bone', 'placeholder': '', 'required': False, 'tooltip': 'grip law: the clamp thumb (weapon: mixamorig:RightHandThumb1).', 'type': 'text', 'visibleWhen': '', 'zone': ''}, {'default': 0, 'families': [], 'group': '', 'label': 'Target width', 'min': 0, 'name': 'target_width', 'placeholder': '', 'required': False, 'step': 0.01, 'tooltip': 'grip law: scale-then-grip width in meters (sword: 0.25). fit forbids non-zero.', 'type': 'number', 'visibleWhen': '', 'zone': ''}], 'label': 'Dress with outfit', 'requires': ['melite-poser-nodes'], 'writes': ['body_glb']},
    'hmr-estimate': {'engines': [{'flow': 'anny-hmr-commercial', 'id': 'commercial', 'local': '', 'refusal': ''}], 'families': ['anny'], 'id': 'hmr-estimate', 'knobs': [{'default': 0, 'families': [], 'group': '', 'label': 'Person', 'min': 0, 'name': 'person_index', 'placeholder': '', 'required': False, 'step': 1, 'tooltip': 'Which detected person to fit (0 = the most confident detection).', 'type': 'number', 'visibleWhen': '', 'zone': ''}], 'label': 'Estimate body from photo', 'requires': ['melite-kimodo-nodes'], 'writes': ['body_glb']},
    'preset-load': {'engines': [{'flow': 'anny-params', 'id': 'instantiate', 'local': '', 'refusal': ''}], 'families': ['anny'], 'id': 'preset-load', 'knobs': [{'families': [], 'group': '', 'label': 'Preset', 'name': 'preset_id', 'placeholder': '', 'required': True, 'tooltip': 'Estate archetype id or user row id (user-N).', 'type': 'text', 'visibleWhen': '', 'zone': ''}], 'label': 'Load character preset', 'requires': ['melite-kimodo-nodes'], 'writes': ['body_glb']},
    'preset-save': {'engines': [{'flow': None, 'id': 'save', 'local': 'save-preset', 'refusal': ''}], 'families': ['anny'], 'id': 'preset-save', 'knobs': [{'families': [], 'group': '', 'label': 'Preset name', 'name': 'name', 'placeholder': '', 'required': True, 'tooltip': 'Label for the saved character row.', 'type': 'text', 'visibleWhen': '', 'zone': ''}], 'label': 'Save character as preset', 'requires': [], 'writes': []},
    'prop': {'engines': [{'flow': 'fit-seat', 'id': 'seat', 'local': '', 'refusal': ''}], 'families': ['anny'], 'id': 'prop', 'knobs': [{'families': [], 'group': '', 'label': 'Prop GLB', 'name': 'prop', 'placeholder': '', 'required': True, 'tooltip': 'The weapon/prop mesh (.glb estate path or run artifact ref).', 'type': 'text', 'visibleWhen': '', 'zone': ''}, {'families': [], 'group': '', 'label': 'Prop name', 'name': 'model_name', 'placeholder': '', 'required': False, 'tooltip': "Unity lookup name — the chip fills the prop filename stem; empty seats as 'prop'.", 'type': 'text', 'visibleWhen': '', 'zone': ''}, {'default': 'mixamorig:RightHand', 'families': [], 'group': '', 'label': 'Bone', 'name': 'bone', 'placeholder': '', 'required': False, 'tooltip': 'Which bone carries the prop (weapon: the hand).', 'type': 'text', 'visibleWhen': '', 'zone': ''}, {'default': 'grip', 'families': [], 'group': '', 'label': 'Law', 'name': 'align', 'options': ['socket', 'fit', 'grip'], 'placeholder': '', 'required': False, 'tooltip': 'grip: hand-lock (weapon default); socket/fit: hang or measure a carried prop.', 'type': 'select', 'visibleWhen': '', 'zone': ''}, {'default': '0,0,0', 'families': [], 'group': '', 'label': 'Offset', 'name': 'position', 'placeholder': '', 'required': False, 'tooltip': 'x,y,z meters added after the law (grip forbids non-zero).', 'type': 'text', 'visibleWhen': '', 'zone': ''}, {'default': '0,0,0', 'families': [], 'group': '', 'label': 'Rotation', 'name': 'rotation', 'placeholder': '', 'required': False, 'tooltip': 'x,y,z Unity degrees applied pre-seat (grip forbids non-zero).', 'type': 'text', 'visibleWhen': '', 'zone': ''}, {'default': 0, 'families': [], 'group': '', 'label': 'Fit ratio', 'min': 0, 'name': 'fit_ratio', 'placeholder': '', 'required': False, 'step': 0.01, 'tooltip': 'fit law only (grip + socket leave 0).', 'type': 'number', 'visibleWhen': '', 'zone': ''}, {'families': [], 'group': '', 'label': 'Measure to', 'name': 'fit_ref_bone', 'placeholder': '', 'required': False, 'tooltip': "fit law: the span's far bone.", 'type': 'text', 'visibleWhen': '', 'zone': ''}, {'families': [], 'group': '', 'label': 'Measure from', 'name': 'fit_ref_bone2', 'placeholder': '', 'required': False, 'tooltip': "fit law: the span's near bone.", 'type': 'text', 'visibleWhen': '', 'zone': ''}, {'default': 0.22, 'families': [], 'group': '', 'label': 'Seat ratio', 'max': 1, 'min': 0, 'name': 'seat_ratio', 'placeholder': '', 'required': False, 'step': 0.01, 'tooltip': 'socket/fit seating depth. Grip ignores this.', 'type': 'number', 'visibleWhen': '', 'zone': ''}, {'default': 'mixamorig:RightHandMiddle1', 'families': [], 'group': '', 'label': 'Finger bone', 'name': 'finger_bone', 'placeholder': '', 'required': False, 'tooltip': 'grip law: the blade-axis finger.', 'type': 'text', 'visibleWhen': '', 'zone': ''}, {'default': 'mixamorig:RightHandThumb1', 'families': [], 'group': '', 'label': 'Thumb bone', 'name': 'thumb_bone', 'placeholder': '', 'required': False, 'tooltip': 'grip law: the clamp thumb.', 'type': 'text', 'visibleWhen': '', 'zone': ''}, {'default': 0.25, 'families': [], 'group': '', 'label': 'Target width', 'min': 0, 'name': 'target_width', 'placeholder': '', 'required': False, 'step': 0.01, 'tooltip': 'grip law: scale-then-grip width in meters (sword: 0.25).', 'type': 'number', 'visibleWhen': '', 'zone': ''}], 'label': 'Seat prop in hand', 'requires': ['melite-poser-nodes'], 'writes': ['body_glb']},
    'rig-somax': {'engines': [{'flow': 'body-to-somax', 'id': 'convert', 'local': '', 'refusal': ''}], 'families': [['anny']], 'id': 'rig-somax', 'knobs': [], 'label': 'Convert to SOMAX rig', 'requires': ['melite-autorig-nodes'], 'writes': ['body_glb']},
}


def _knob_proj(km: dict) -> dict:
    d: dict = {"name": km["name"], "kind": km["type"],
               "required": bool(km["required"])}
    if "default" in km:
        d["default"] = km["default"]
    if "options" in km:
        d["options"] = list(km["options"])
    return d


def _tsx_ids(block: str) -> list[str]:
    # Verb rows only ({ id: "...", label: ... } — engine rows read
    # { id: "...", flow/local: ... } and must not match).
    return re.findall(r'\{\s*id:\s*"([^"]+)",\s*label:', block)


@pytest.fixture(scope="module")
def tsx_verbs() -> dict[str, list[str]]:
    src = TSX.read_text(encoding="utf-8")
    # Each const block closes with "]" at line start (the chips block
    # carries no trailing semicolon — split on that, never on "];",
    # which first fires inside a LATER unrelated table).
    chips = re.search(r"const ANNY_VERBS[^[]*\[(.*?)\n\]",
                      src, re.S)
    presets = re.search(r"const ANNY_PRESET_VERBS[^[]*\[(.*?)\n\]",
                        src, re.S)
    assert chips is not None and presets is not None
    return {"chips": _tsx_ids(chips.group(1)),
            "presets": _tsx_ids(presets.group(1))}


# ── frozen TS refusal goldens (oracle-death: the py comparison ──
# ── side is gone; the TS bytes are the contract) ────────────────

GOLDEN_DIR = (Path(__file__).resolve().parent / "golden_ts"
              / "test_gateway_verbs_outputs")


@pytest.fixture(scope="module")
def refusal_goldens() -> dict:
    doc = json.loads((GOLDEN_DIR / "refusals.json").read_text(
        encoding="utf-8"))
    # Golden/case skew guard: the frozen cases must BE the in-file
    # case lists — editing a case list without regoldening fails
    # here, never as a mystery mismatch three legs later.
    assert doc["O03-cases"] == [[c, a] for c, a in DEFICIENT_SETS], \
        "refusals.json O03-cases skewed vs DEFICIENT_SETS — regolden"
    assert doc["O04-cases"] == [[c, a] for c, a in SURPLUS_SETS], \
        "refusals.json O04-cases skewed vs SURPLUS_SETS — regolden"
    return doc


# ── Phase V ──

def test_V01_closed_seven_verb_census(
        tsx_verbs: dict[str, list[str]],
) -> None:
    mounted_ids = sorted(
        {v for vs in FROZEN_MOUNTED.values() for v in vs})
    assert FROZEN_MOUNTED.get("anny") == EXPECTED_MOUNTED, FROZEN_MOUNTED
    assert mounted_ids == sorted(EXPECTED_MOUNTED), mounted_ids
    mod = _verbs_module()
    module_ids = sorted(
        v.id for v in vars(mod).values()
        if isinstance(v, type) and v.__module__ == mod.__name__
        and getattr(v, "_is_verb_", False))
    assert module_ids == EXPECTED_VERBS, module_ids
    assert sorted(tsx_verbs["chips"]) == sorted(
        ["hmr-estimate", "dress", "prop", "rig-somax", "apply-skin"])
    assert sorted(tsx_verbs["presets"]) == sorted(
        ["preset-save", "preset-load"])
    assert sorted(FROZEN_VERB_ORACLE) == EXPECTED_VERBS
    for vid in EXPECTED_UNMOUNTED:
        assert vid not in mounted_ids, vid


def test_V02_ts_table_names_exactly_the_seven(ts_dump: dict) -> None:
    assert sorted(ts_dump["known"]) == EXPECTED_VERBS
    assert sorted(v["id"] for v in ts_dump["verbs"]) == EXPECTED_VERBS


def test_V03_per_verb_dispatch_surface_agreement(
        ts_dump: dict) -> None:
    ts = {v["id"]: v for v in ts_dump["verbs"]}
    assert sorted(ts) == EXPECTED_VERBS
    for vid in EXPECTED_VERBS:
        want, got = FROZEN_VERB_ORACLE[vid], ts[vid]
        assert got["label"] == want["label"], vid
        assert got["card"] == "anny", vid
        assert got["families"] == ["anny"], vid
        assert got["writes"] == list(want["writes"]), vid
        assert got["requires"] == list(want["requires"]), vid
        assert got["engines"] == [
            {"id": e["id"], "flow": e["flow"], "local": e["local"],
             "refusal": e["refusal"]} for e in want["engines"]], vid
        assert [k["name"] for k in got["knobs"]] == [
            k["name"] for k in want["knobs"]], (vid, "no dropped knobs")
        assert [_knob_proj(k) for k in want["knobs"]] == [
            {"name": k["name"], "kind": k["kind"],
             "required": k["required"],
             **({"default": k["default"]} if "default" in k else {}),
             **({"options": k["options"]} if "options" in k else {})}
            for k in got["knobs"]], vid


def test_V04_dispatch_resolves_declared_targets(
        driver: Path) -> None:
    cases = [{"verb": vid} for vid in EXPECTED_VERBS]
    cases += [{"verb": "dress", "engine": "seat"},
              {"verb": "preset-save", "engine": "save"}]
    got = node_run(driver, "dispatch", {"cases": cases})["results"]
    assert len(got) == len(cases)
    for case, res in zip(cases, got):
        eng = FROZEN_VERB_ORACLE[case["verb"]]["engines"][0]
        if "engine" in case:
            eng = next(e for e in FROZEN_VERB_ORACLE[case["verb"]]["engines"]
                       if e["id"] == case["engine"])
        if eng["flow"] is not None:
            assert res == {"kind": "flow", "verb": case["verb"],
                           "engine": eng["id"], "flow": eng["flow"],
                           "card": "anny", "writes": list(
                               FROZEN_VERB_ORACLE[case["verb"]]["writes"])}, case
        else:
            assert res["kind"] == "local" and \
                res["action"] == eng["local"], (case, res)
            assert res["verb"] == case["verb"] and res["card"] == "anny"
    by_id = {c["verb"]: r for c, r in zip(cases, got)}
    assert by_id["preset-save"]["kind"] == "local"
    assert by_id["preset-save"]["action"] == "save-preset"
    assert by_id["preset-save"]["writes"] == []


def _py_repr_list(ids: list[str]) -> str:
    return "[" + ", ".join("'%s'" % i for i in ids) + "]"


def test_V05_unknown_verb_refusal_agreement(
        driver: Path) -> None:
    assert "nope" not in FROZEN_VERB_ORACLE
    res = node_run(driver, "dispatch",
                   {"cases": [{"verb": "nope"}]})["results"][0]
    assert res["code"] == "invalid_request"
    assert res["error"] == "unknown verb 'nope' (known: %s)" % \
        _py_repr_list(EXPECTED_VERBS), res["error"]


def test_V06_unknown_engine_refusal_agreement(
        driver: Path) -> None:
    assert [e["id"] for e in FROZEN_VERB_ORACLE["dress"]["engines"]] == ["seat"]
    res = node_run(driver, "dispatch", {"cases": [
        {"verb": "dress", "engine": "bogus"}]})["results"][0]
    assert res["code"] == "invalid_request"
    assert res["error"] == \
        "unknown engine 'bogus' for verb 'dress' (known: ['seat'])", \
        res["error"]


def test_V07_table_dispatches_only_to_real_targets(
        ts_dump: dict) -> None:
    packs = {e for e in os.listdir(VENDOR_PACKS)
             if os.path.isdir(os.path.join(VENDOR_PACKS, e))}
    for v in ts_dump["verbs"]:
        for e in v["engines"]:
            if e["flow"] is not None:
                assert flow_mod.load_flow(e["flow"]) is not None, \
                    (v["id"], e["flow"])
        for req in v["requires"]:
            assert req in packs, (v["id"], req)


# ── Phase O ──

# O01 (retired 2026-09-08 purge S-decls): the TS CARD_OUTPUTS table
# == card-decls.json outputs[] leg died with the snapshot. The table
# is hand-owned now (transcribed once, in verbs.ts); every row's
# CONTENT pins behaviorally — O02 runs every row's golden artifacts,
# O03/O04 pin refusal text carrying each row's labels. What remains
# here: row shape (no empty promises served) + the deletion itself.

def test_O01_outputs_table_shape_and_snapshot_gone(
        ts_dump: dict) -> None:
    outputs = ts_dump["outputs"]
    assert outputs, "CARD_OUTPUTS empty — the contract table is gone"
    for cid, rows in sorted(outputs.items()):
        assert isinstance(rows, list) and rows, (cid, "no rows")
        for row in rows:
            assert isinstance(row.get("label"), str) \
                and row["label"].strip(), (cid, "label-less row")
            assert isinstance(row.get("patterns"), list) \
                and row["patterns"], (cid, "pattern-less row")
    assert not (REPO / "packages" / "engines" / "comfyui" / "cordis"
                / "data" / "card-decls.json").is_file(), \
        "card-decls.json reappeared — the snapshot stays deleted"


GOLDEN_SETS: list[tuple[str, list]] = [
    ("anny", ["r7/body.glb"] + ["r7/turnaround_%05d_.png" % i
                                for i in range(8)]),
    ("anny", ["r7/BODY.GLB"]),
    ("image-gen", ["run/SeedVR2_00001_.png"]),
    ("fit", ["run/prop-seated.glb", "run/fit.json"]),
    ("skin", ["run/albedo.png", "run/normal.png", "run/kind.json"]),
    ("input-prep", ["run/staged.webp"]),
    ("input-prep", ["run/line.WAV"]),
    ("h3-timeline", ["run/f%04d.png" % i for i in range(3)]),
    ("tts", ["run/line.mp3"]),
    ("video-gen", ["run/clip.webm"]),
    ("tagger", ["run/cap.txt"]),
    ("music", ["run/song.flac"]),
    # MONO-ENGINE 2026-09-08: music-native / auto-rig / forge rows
    # retired with their engines (quarantine 47e1c583); unknown cards
    # pass the settle gate vacuously, so dead rows here pinned nothing.
    ("sfx", ["run/hit.WAV"]),
    ("voice-lock", ["run/lock.mp3"]),
    ("mask-studio", ["run/mask.png"]),
    ("upscale-tools", ["run/up.PNG"]),
    ("image-edit", ["run/edit.png"]),
    ("ideogram4", ["run/gen.png"]),
    ("img-to-mesh", ["run/MESH.GLB"]),
    ("quad-remesh", ["run/remesh.glb"]),
    ("motion", ["run/mv.npz"]),
]


def test_O02_golden_artifact_sets_pass_the_ts_side(
        driver: Path) -> None:
    cases = [{"card": c, "artifacts": a} for c, a in GOLDEN_SETS]
    got = node_run(driver, "violate", {"cases": cases})["results"]
    for (card, arts), res in zip(GOLDEN_SETS, got):
        assert res is None, (card, arts, res)


DEFICIENT_SETS: list[tuple[str, object]] = [
    ("anny", []),
    ("anny", None),
    ("anny", ["r7/turnaround_00000_.png", "r7/turnaround_00001_.png"]),
    ("fit", ["run/prop-seated.glb"]),
    ("skin", ["run/albedo.png"]),
    ("input-prep", []),
    ("tts", ["run/cover.png"]),
]


def test_O03_deficient_outputs_refuse_frozen_ts_text(
        driver: Path, refusal_goldens: dict) -> None:
    cases = [{"card": c, "artifacts": a} for c, a in DEFICIENT_SETS]
    got = node_run(driver, "violate", {"cases": cases})["results"]
    want = refusal_goldens["O03"]
    assert len(got) == len(want) == len(DEFICIENT_SETS)
    for (card, arts), res, frozen in zip(DEFICIENT_SETS, got, want):
        assert frozen is not None, (card, arts, "golden is None — regolden")
        assert res == frozen, (card, arts, res, frozen)


def _surplus_ten() -> list[str]:
    return ["run/junk_%02d.mp4" % i for i in range(9, -1, -1)]


SURPLUS_SETS: list[tuple[str, object]] = [
    ("anny", ["run/clip.mp4", "run/voice.wav", "run/notes.txt"]),
    ("anny", _surplus_ten()),
    ("anny", ["run/BODY.PNG", "run/view.JPG"]),
    ("anny", ["", None, 0, False, "run/x.mp4"]),
    ("fit", ["run/fit.json"]),
    ("tagger", ["run/cap.png"]),
]


def test_O04_surplus_outputs_refuse_frozen_ts_text(
        driver: Path, refusal_goldens: dict) -> None:
    cases = [{"card": c, "artifacts": a} for c, a in SURPLUS_SETS]
    got = node_run(driver, "violate", {"cases": cases})["results"]
    want = refusal_goldens["O04"]
    assert len(got) == len(want) == len(SURPLUS_SETS)
    for (card, arts), res, frozen in zip(SURPLUS_SETS, got, want):
        assert frozen is not None, (card, arts, "golden is None — regolden")
        assert res == frozen, (card, arts, res, frozen)
    ten = got[1]
    assert ten is not None and "run/junk_08.mp4" not in ten, ten
    assert "run/junk_00.mp4" in ten and "run/junk_07.mp4" in ten, ten


def test_O05_run_level_settle_arm(
        driver: Path, refusal_goldens: dict) -> None:
    bad = refusal_goldens["O05-bad"]
    assert bad is not None
    cases = [
        {"status": "completed", "error": "",
         "artifacts": ["run/body.glb"], "cardId": "anny"},
        {"status": "completed", "error": "", "artifacts": ["run/x.mp4"],
         "cardId": "anny"},
        {"status": "completed", "error": "earlier",
         "artifacts": ["run/body.glb"], "cardId": "anny"},
        {"status": "stopped", "error": "", "artifacts": ["run/x.mp4"],
         "cardId": "anny"},
        {"status": "failed", "error": "engine blew up",
         "artifacts": ["run/x.mp4"], "cardId": "anny"},
        {"status": "queued", "error": "", "artifacts": ["run/x.mp4"],
         "cardId": "anny"},
        {"status": "completed", "error": "", "artifacts": ["run/x.mp4"],
         "cardId": "no-such-card"},
        {"status": "completed", "error": "", "artifacts": ["run/x.mp4"]},
    ]
    want = [
        {"status": "completed", "error": ""},
        {"status": "failed", "error": bad},
        {"status": "completed", "error": "earlier"},
        {"status": "stopped", "error": ""},
        {"status": "failed", "error": "engine blew up"},
        {"status": "queued", "error": ""},
        {"status": "completed", "error": ""},
        {"status": "completed", "error": ""},
    ]
    got = node_run(driver, "settle", {"cases": cases})["results"]
    assert got == want


# ── O06: served shape (live TS door, dead engine port) ──

WF = {"1": {"class_type": "EmptyLatentImage",
            "inputs": {"width": 64, "height": 64, "batch_size": 1}}}
DID = "wall-verbs-draft-1"
STATUS_KEYS = {"run_id", "status", "stages", "skipped_stages",
               "artifacts", "error", "queue_position"}


def _http(port: int, path: str,
          body: bytes | None = None) -> tuple[int | None, bytes]:
    req = urllib.request.Request(
        "http://127.0.0.1:%d%s" % (port, path), data=body,
        method="POST" if body is not None else "GET",
        headers={"Content-Type": "application/json"} if body else {})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:
        return None, ("TRANSPORT " + str(e)).encode()


def test_O06_served_failed_run_carries_no_contract_text() -> None:
    root = Path(tempfile.mkdtemp(prefix="wall-verbs-ts-"))
    (root / "drafts").mkdir(parents=True)
    (root / "drafts" / (DID + ".json")).write_text(
        json.dumps({"draft_id": DID}))
    env = dict(os.environ, MELITE_STATE_ROOT=str(root),
               COMFYUI_URL="http://127.0.0.1:1")
    proc = subprocess.Popen(
        [_node(), "--experimental-strip-types", "--no-warnings",
         str(TS_SERVER)],
        cwd=str(REPO), stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        text=True, start_new_session=True, env=env)
    try:
        assert proc.stdout is not None
        deadline = time.time() + 25
        port = 0
        while time.time() < deadline:
            line = proc.stdout.readline()
            if line.startswith("READY "):
                port = int(line.split()[1])
                break
            if proc.poll() is not None:
                raise RuntimeError("ts exited rc=%d" % proc.returncode)
        assert port, "ts server did not print READY"
        st, raw = _http(port, "/v1/flows/start", json.dumps({
            "flow_inline": {"id": "wall-run", "stages": [
                {"id": "gen", "engine": "comfyui",
                 "params": {"workflow": WF, "timeout_s": 30}}]},
            "draft_id": DID}).encode())
        assert st == 202, raw[:200]
        run_id = json.loads(raw.decode())["run_id"]
        body: dict = {}
        end = time.time() + 90
        while time.time() < end:
            st, raw = _http(port, "/v1/flows/status/" + run_id)
            assert st == 200, raw[:200]
            body = json.loads(raw.decode())
            if body["status"] not in ("queued", "running"):
                break
            time.sleep(0.5)
        assert body.get("status") == "failed", body
        assert "output contract violation" not in body.get("error", ""), \
            body.get("error")
        assert set(body) == STATUS_KEYS, sorted(body)
    finally:
        proc.terminate()


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-q"]))

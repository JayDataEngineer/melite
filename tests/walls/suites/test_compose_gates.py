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

from __future__ import annotations

import importlib.util
import json
import os
import re
import sys
import typing
from pathlib import Path
from types import GenericAlias, ModuleType, UnionType
from typing import TYPE_CHECKING

import pytest

from _anchor import REPO

if TYPE_CHECKING:
    from melite_cards import Field, Mod
    from pydantic import BaseModel

type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

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


# ── ADMISSION DIRECTION (2026-09-05 image-edit incident) ──────────────
# The mirror of the forbid gate: extra="forbid" must refuse FOREIGN
# knobs while ADMITTING the card's OWN surface. The image-edit rework
# narrowed ImageEditParams to 10 keys against a 35-field card, so
# every plain editor call died with 27 extra_forbidden errors — the
# card refusing its own surface at inference time. The client sends
# full form state (every declared field rides, defaults included), so
# a surface key the schema won't admit is a guaranteed run-time 400.
# These tests pin BOTH sides of the contract: the schema admits the
# surface (no extra_forbidden on a full-surface payload, every arm),
# and the served family schemas (the frontend click-time gate's
# source) cover the same surface.

_KIND_DUMMY: dict[str, object] = {
    "Text": "wall probe", "Textarea": "wall probe",
    "Image": "wall-probe.png", "Audio": "wall-probe.wav",
    "Video": "wall-probe.mp4", "File": "wall-probe.bin",
    "Number": 1, "Slider": 1, "Seed": 7,
    "Boolean": False, "Select": "",
}


def _compose_pkg() -> ModuleType:
    """The canonical arm loader (the production mechanism — package
    aliases, `from . import schema` resolves)."""
    for p in (os.path.join(REPO, "py"),
              os.path.join(REPO, "plugins", "engines", "comfyui"),
              COMPOSE_ROOT):
        if p not in sys.path:
            sys.path.insert(0, p)
    import compose as pkg
    return pkg


def _model_classes() -> dict[str, type[object]]:
    from melite_models import scan_engine_models
    return {getattr(cls, "id", ""): cls
            for _, cls in scan_engine_models(REPO).values()}


def _card_fields(card_id: str) -> list[Field] | None:
    """Declared fields of a card id (hyphen + underscore spellings) —
    None when the card won't load (unboarded lane: skipped, never
    pinned)."""
    from melite_cards import load_card_py
    cands = sorted({card_id, card_id.replace("-", "_")})
    for cand in cands:
        for genre in sorted(os.listdir(CARDS_ROOT)):
            cp = os.path.join(CARDS_ROOT, genre, cand, "py", "card.py")
            if os.path.isfile(cp):
                try:
                    cls = load_card_py(cp, "comfyui")
                except Exception:
                    return None
                return list(getattr(cls, "_fields_", ()))
    return None


def _surface_payload(fields: list[Field],
                     model_defaults: dict[str, JsonValue] | None = None,
                     ) -> dict[str, JsonValue]:
    """Full-surface dummy payload, editor-seeded: the MODEL default
    when the lane declares one (width/height ride 1024, never a kind
    dummy), else the field default, else a kind dummy (mirrors
    useFormController seeding + buildPayload stripping —
    nulls/empties never ride, so an undefaulted media slot is ABSENT,
    never a dummy filename)."""
    model_defaults = model_defaults or {}
    out = {}
    for f in fields:
        if f.name in model_defaults:
            out[f.name] = model_defaults[f.name]
            continue
        d = getattr(f, "default", None)
        if d is not None:
            out[f.name] = d
            continue
        if getattr(f, "type", None) == "image_list":
            out[f.name] = []
            continue
        # TILE BAGS (2026-09-05 button order: Loras/Mask mod-bag fields
        # the Mods button writes): the plain call carries NO tiles —
        # an empty bag never rides (buildPayload strips empties), so
        # the editor-seeded plain state is [], never a kind dummy (a
        # "wall probe" string would iterate as chars in the loras door).
        if type(f).__name__ in ("Loras", "Mask"):
            out[f.name] = []
            continue
        if type(f).__name__ in ("Image", "Audio", "Video", "File"):
            continue
        out[f.name] = _KIND_DUMMY.get(type(f).__name__, "wall probe")
    return out


def _no_extra_forbidden(err: str | None) -> bool:
    return (err or "").find("Extra inputs are not permitted") < 0 \
        and (err or "").find("extra_forbidden") < 0


# Narrow lanes (2026-09-05 image-edit incident class: the schema row
# admits FEWER keys than the card declares — the editor's own form
# state 400s at run time). Equality-pinned: an owner widens the row
# to the declared surface and DELETES the entry; a new narrow lane,
# or a changed refused-set on a listed one, fails. There must never
# be an entry again.
# 2026-09-05 mod-audit follow-up: audio/music SPENT (3 knobs
# admitted+wired, 4 unwirable knobs removed from the card).
# image/image-gen SPENT the same day (the dormant `preset` Select —
# options permanently [], no serve path, no frontend writer — was
# removed from the card; a knob that could ONLY 400).
# audio/voice-lock SPENT the same day (QvoiceMod descoped from the
# EXPORT family — consumption mod on a producing card; the dead
# qvoice/voice_pca_strengths knobs died with it).
_NARROW: dict[str, list[str]] = {}

_EXTRA_RE = re.compile(r"^([a-z_0-9]+)\n  Extra inputs", re.M)


def test_schema_admits_card_surface_every_arm() -> None:
    """No arm refuses its own surface: a full-surface payload through
    the phase-1 door must never come back extra_forbidden — except the
    _NARROW dispensations above. Any OTHER refusal
    (required-presence voice, template/input_dir environment,
    semantic value errors) passes — this pins ADMISSION, nothing
    else."""
    pkg = _compose_pkg()
    by_id = _model_classes()
    probed, skipped = 0, []
    for lane, py_dir in _arms():
        sp = os.path.join(py_dir, "schema.py")
        if not os.path.isfile(sp):
            skipped.append(lane + " (no schema.py)")
            continue
        card = os.path.basename(os.path.dirname(py_dir))
        fields = _card_fields(card)
        if not fields:
            skipped.append(lane + " (card won't load)")
            continue
        model = next((mid for mid, cls in by_id.items()
                      if getattr(cls, "card", None) in
                      (card, card.replace("_", "-"),
                       card.replace("-", "_"))), card)
        try:
            arm = pkg._load_arm_package(lane)
        except Exception:
            try:
                arm = _load_arm(py_dir)
            except Exception as e:
                skipped.append("%s (arm won't load: %s)" % (lane, e))
                continue
        try:
            rc, _, _, err = arm.compose(
                {"params": _surface_payload(
                    fields,
                    dict(getattr(by_id.get(model), "defaults",
                                 None) or {}))}, model, "")
        except Exception as e:
            pytest.fail(
                "%s phase 1 CRASHED on its own surface payload (%s) — "
                "the validation door must refuse (rc=-3), never raise"
                % (lane, e))
        if _no_extra_forbidden(err):
            assert lane not in _NARROW, (
                "%s admits its surface now — delete its _NARROW entry "
                "(the dispensation is spent)" % lane)
        else:
            refused = sorted(set(_EXTRA_RE.findall(err or "")))
            assert lane in _NARROW, (
                "%s refused its OWN surface: rc=%r err=%r — the "
                "image-edit class (schema narrower than the card); "
                "widen the row to the declared surface (or dispense "
                "it in _NARROW with the refused set)" % (lane, rc, err))
            assert refused == _NARROW[lane], (
                "%s refused-set changed: %s (want exactly %s) — the "
                "lane drifted under its dispensation" % (lane, refused,
                                                         _NARROW[lane]))
        probed += 1
    assert probed > 0, "no arm probed — probe setup broke (%s)" % skipped


_IMAGE_EDIT_FIRING = [
    # (knob, firing value, the field the refusal must name)
    ("lanpaint_enabled", True, "lanpaint_enabled"),
    ("input_mask", "m.png", "input_mask"),
    ("outpaint_top", 64, "outpaint_top"),
    ("image2", "b.png", "image2"),
    ("image3", "c.png", "image3"),
    ("reference_images", ["r.png"], "reference_images"),
    ("preset", "fast", "preset"),
    ("use_stock_nodes", True, "use_stock_nodes"),
    ("double_reference", True, "double_reference"),
    ("width", 512, "width"),
    ("height", 512, "height"),
    ("mask_mode", "crop_stitch", "mask_mode"),
    ("mask_context_pad", 128, "mask_context_pad"),
    ("mask_grow", 16, "mask_grow"),
    ("mask_feather", 16, "mask_feather"),
    ("mask_threshold", 0.5, "mask_threshold"),
    ("mask_invert", True, "mask_invert"),
    ("lanpaint_num_steps", 10, "lanpaint_num_steps"),
    ("lanpaint_step_size", 0.5, "lanpaint_step_size"),
    ("lanpaint_lambda", 0.9, "lanpaint_lambda"),
    ("lanpaint_beta", 0.9, "lanpaint_beta"),
    ("lanpaint_friction", 0.9, "lanpaint_friction"),
    ("lanpaint_prompt_mode", "positive", "lanpaint_prompt_mode"),
    ("outpaint_overlap", 32, "outpaint_overlap"),
]


def _image_edit_arm(tmp_path: Path) -> ModuleType:
    pkg = _compose_pkg()
    arm = pkg._load_arm_package("image/image-edit")
    with open(os.path.join(str(tmp_path), "anchor.png"), "wb") as fh:
        fh.write(b"\x89PNG\r\n\x1a\n" + b"\x00" * 32)
    # phase-2 tmp input dirs ride monkeypatch, never the estate dir.
    anchor_dir = str(tmp_path)
    arm.input_dir = lambda: anchor_dir
    return arm


def _image_edit_plain() -> dict[str, JsonValue]:
    """The editor's plain call, editor-seeded: lane-promise defaults
    for every mod knob, a prompt, an anchor. (2026-09-05: this exact
    shape 400'd with 27 extra_forbidden errors.)"""
    fields = _card_fields("image-edit")
    assert fields, "image-edit card won't load — probe setup broke"
    by_id = _model_classes()
    qwen = by_id.get("qwen-img-edit-2511")
    payload = _surface_payload(
        fields, dict(getattr(qwen, "defaults", None) or {}))
    payload.update({"prompt": "make it dusk at the wall",
                    "input_image": "anchor.png"})
    # 37 field names, ALL defaulted (2026-09-05 compile-time
    # incident: input_mask was the ONE undefaulted media slot — its
    # seeded null died at BOTH gates (no envelope default, no class
    # coercion). It now declares default '' = the schema row's absent
    # sentinel, like image2/image3 — so it SURVIVES stripping and its
    # null square is legal. The count moved 32 → 34 → 36 → 37.)
    assert len(payload) == 37, (
        "image-edit surface changed shape: %d keys (want 37) — update "
        "the incident pin deliberately" % len(payload))
    return payload


def test_image_edit_plain_call_compiles(tmp_path: Path) -> None:
    arm = _image_edit_arm(tmp_path)
    rc, _, _, err = arm.compose(
        {"params": _image_edit_plain()}, "qwen-img-edit-2511", "")
    assert rc == 0, (
        "plain image-edit call refused at the phase-1 door: %r — the "
        "2026-09-05 incident regressed (the card refusing its own "
        "surface)" % (err,))


@pytest.mark.parametrize("knob,value,field", _IMAGE_EDIT_FIRING)
def test_image_edit_firing_refuses_field_named(
        tmp_path: Path, knob: str, value: str | int | float | bool | list[str],
        field: str) -> None:
    """MOD FIRING LAW: a firing request the plain-edit cut cannot
    honor refuses LOUD and field-named — never extra_forbidden (the
    schema admits the surface), never a silent plain edit."""
    arm = _image_edit_arm(tmp_path)
    payload = _image_edit_plain()
    payload[knob] = value
    rc, _, _, err = arm.compose(
        {"params": payload}, "qwen-img-edit-2511", "")
    assert rc == -3, (
        "%s=%r compiled (rc=0) — the plain graph cannot honor it; a "
        "silent plain edit is the drop class" % (knob, value))
    assert field in (err or "") and _no_extra_forbidden(err), (
        "%s=%r refusal must name the field (got %r)" % (knob, value, err))


def test_image_edit_garbage_knob_refuses_field_named(tmp_path: Path) -> None:
    arm = _image_edit_arm(tmp_path)
    payload = _image_edit_plain()
    payload["definitely_not_a_param"] = 1
    rc, _, _, err = arm.compose(
        {"params": payload}, "qwen-img-edit-2511", "")
    assert rc == -3 and "definitely_not_a_param" in (err or ""), (
        "forbid gate stopped naming foreign knobs: rc=%r err=%r"
        % (rc, err))


# ── THE LORAS DOOR + THE MASK TILE (2026-09-05 button order) ────
# Operator order, verbatim: "THE LORAS DON'T MAP, I DON'T SEE MY
# KREA2 LORAS... RUNTIME VALIDATION". The edit lane boards the loras
# channel with no rows of its own: picks resolve against the RUNTIME
# CATALOG (family rows first, then the estate union — the same rule
# the form-spec options serve), unknown ids refuse LOUD naming the
# known catalog, wrong-typed bags refuse instead of iterating
# silently. The mask tile flattens bag[0] onto the flat lane wire
# before the gate (one tile — max_stack 1 served).


def test_image_edit_loras_door_resolves_runtime_catalog(tmp_path: Path) -> None:
    """The operator's krea2 lora validates on the EDIT lane (phase 1
    echoes the resolved pick: catalog filename + row strength)."""
    arm = _image_edit_arm(tmp_path)
    payload = _image_edit_plain()
    payload["loras"] = [{"id": "krea2_realism_lora"}]
    rc, _, extra, err = arm.compose(
        {"params": payload}, "qwen-img-edit-2511", "")
    assert rc == 0, "known lora refused on the edit lane: %r" % (err,)
    picks = ((extra or {}).get("inputs") or {}).get("loras")
    assert picks == [{"filename": "krea-2/krea2_realism_lora.safetensors",
                      "strength": 0.7}], picks


def test_image_edit_loras_door_refuses_unknown_loud(tmp_path: Path) -> None:
    """RUNTIME VALIDATION: an unknown id refuses naming the known
    catalog — never a hidden picker, never a silent drop."""
    arm = _image_edit_arm(tmp_path)
    payload = _image_edit_plain()
    payload["loras"] = [{"id": "nope_xyz"}]
    rc, _, _, err = arm.compose(
        {"params": payload}, "qwen-img-edit-2511", "")
    assert rc == -3 and "nope_xyz" in (err or "") \
        and "krea2_realism_lora" in (err or ""), (
        "unknown lora must refuse naming the catalog: rc=%r err=%r"
        % (rc, err))


def test_image_edit_loras_door_refuses_wrong_typed_bag(tmp_path: Path) -> None:
    """A string loras bag is a stated wrong value — a loud refusal,
    never a char-iteration (the wall dummy is a string)."""
    arm = _image_edit_arm(tmp_path)
    payload = _image_edit_plain()
    payload["loras"] = "wall probe"
    rc, _, _, err = arm.compose(
        {"params": payload}, "qwen-img-edit-2511", "")
    assert rc == -3 and "loras" in (err or ""), (
        "wrong-typed loras bag must refuse: rc=%r err=%r" % (rc, err))


def test_image_edit_mask_tile_flattens_to_flat_wire(tmp_path: Path) -> None:
    """params.mask = [{input_mask, ...}] flattens onto the flat lane
    knobs BEFORE the gate — the tile fires the existing inpaint
    builder gate field-named (loud, exact), proving the bag reached
    the wire (an unflattened bag would die as extra_forbidden)."""
    arm = _image_edit_arm(tmp_path)
    payload = _image_edit_plain()
    payload["mask"] = [{"input_mask": "m.png", "mask_grow": 12}]
    rc, _, _, err = arm.compose(
        {"params": payload}, "qwen-img-edit-2511", "")
    assert rc == -3 and "input_mask" in (err or "") \
        and "extra_forbidden" not in (err or ""), (
        "mask tile must flatten to the flat wire: rc=%r err=%r"
        % (rc, err))


def test_image_edit_mask_kind_serves_one_tile_cap() -> None:
    """The served mask kind carries max_stack 1 (the drawer refuses
    the second tile LOUD); cap-less kinds serve NO max_stack key
    (the wire contract pins ABSENT — model_dump's None is stripped
    at the gate, never served as null)."""
    import editor_forms
    st, spec = editor_forms.form_spec(REPO, "qwen-img-edit-2511")
    assert st == 200, "edit spec refused: %r" % (spec,)
    kinds = {m["kind"]: m for m in spec["features"]["modifiers"]}
    assert kinds["mask"].get("max_stack") == 1, kinds["mask"]
    assert "max_stack" not in kinds["lora"], kinds["lora"]


# ── THE COMPILE-TIME INCIDENT (2026-09-05, operator verbatim) ───
# "Parameter validation failed ... reference_images: expected array,
# got string ... input_mask: is null but has no default". The class
# verdict, in-process: ImageEditParams refused reference_images=""
# and input_mask=None while ADMITTING the numeric/boolean strings
# laxly — the click-time mirror was stricter than the class on 6 of
# 8 keys. The class now states its admission explicitly (the empty
# sentinels it already treats as absent), and the envelope derives
# the input_mask default from the card field — no hand-mirror.


def test_image_edit_class_admits_operator_payload(tmp_path: Path) -> None:
    """The operator's exact failing shape passes phase 1: strings
    for numbers/booleans (lax), '' for reference_images, null for
    the un-tiled input_mask. The check runs against the CLASS
    (the schema row), never a projection."""
    arm = _image_edit_arm(tmp_path)
    payload = _image_edit_plain()
    payload.update({
        "reference_images": "",
        "width": "1024", "height": "1024", "steps": "30", "cfg": "4.5",
        "use_stock_nodes": "false", "double_reference": "false",
        "input_mask": None,
    })
    rc, _, _, err = arm.compose(
        {"params": payload}, "qwen-img-edit-2511", "")
    assert rc == 0, "class refused the editor's empty serializations: %r" % (err,)


def test_image_edit_envelope_serves_mask_default() -> None:
    """The served envelope derives input_mask's default ('') from the
    card field — the click-time mirror cannot refuse what the class
    coerces. reference_images keeps its [] default."""
    import editor_runs
    editor_runs._FAMILY_PROPS_CACHE.pop("qwen-img-edit-2511", None)
    props = editor_runs._family_surface_props("qwen-img-edit-2511")
    assert props is not None, "edit envelope won't resolve"
    assert props["input_mask"] == {"type": "string", "default": ""}, props["input_mask"]
    assert props["reference_images"] == {"type": "array", "default": []}, props["reference_images"]


def test_image_edit_nonempty_string_array_still_refuses(tmp_path: Path) -> None:
    """The admission is the EMPTY serializations only — a non-empty
    string for an array is ambiguous and refuses (never a split-guess)."""
    arm = _image_edit_arm(tmp_path)
    payload = _image_edit_plain()
    payload["reference_images"] = "a.png"
    rc, _, _, err = arm.compose(
        {"params": payload}, "qwen-img-edit-2511", "")
    assert rc == -3 and "reference_images" in (err or ""), (
        "non-empty string for an array must refuse: rc=%r err=%r" % (rc, err))


def test_served_family_schemas_cover_card_surfaces() -> None:
    """The frontend click-time gate's source covers every boarded
    card's surface: served properties ⊇ card field names. (2026-09-05:
    the endpoint served EMPTY envelopes, so the click-time validator
    deferred always and 27 schema errors fired at run time.)"""
    import editor_runs
    by_id = _model_classes()
    fams = editor_runs.catalog_family_ids(os.path.join(REPO, "plugins"))
    served = editor_runs.family_param_schemas(fams)
    uncovered = []
    for fid in fams:
        cls = by_id.get(fid)
        card = getattr(cls, "card", None) if cls is not None else None
        if not card:
            continue  # unboarded lane: the click-time gate defers
        fields = _card_fields(str(card))
        if not fields:
            continue  # card won't load: same deferral, owner's wall
        props = served[fid].get("properties") or {}
        missing = [f.name for f in fields if f.name not in props]
        if missing:
            uncovered.append((fid, missing))
    assert not uncovered, (
        "served family schemas miss card-surface keys %s — the "
        "click-time gate would refuse the editor's own form state "
        "(or defer, blinding it)" % (uncovered,))


# ── MOD-AUDIT PINS (2026-09-05 follow-up: "WE CAN'T HAVE LEAKS") ─────
# The audit read every leak path in the mod system. The machinery is
# tight BY CONSTRUCTION — these tests pin the four load-bearing
# properties so a future edit can't silently loosen them:
# frozen fields (shared by reference across flavors/cards — mutation
# would be cross-lane contamination), replace-on-absorb (the card's
# copy carries its families tag, the mod's object stays clean),
# fresh merged_defaults (no shared dict to poison), and the loras
# allowlist (entries resolve against the model's OWN catalog rows —
# an arbitrary filename can never ride the channel).

def _mod_classes() -> list[type[Mod]]:
    from melite_cards import Mod
    out = []

    def walk(cls: type[Mod]) -> None:
        for sub in cls.__subclasses__():
            out.append(sub)
            walk(sub)
    walk(Mod)
    return out


def test_mod_fields_frozen() -> None:
    """Every Field object on every Mod (and card) refuses attribute
    sets — flavors share non-overridden field objects BY REFERENCE
    (proved: 12 shared LanPaintMod→Lanpaint), so mutability would be
    a cross-lane leak by construction."""
    import dataclasses
    probed = 0
    for cls in _mod_classes():
        for f in getattr(cls, "_fields_", ()):
            probed += 1
            with pytest.raises(dataclasses.FrozenInstanceError):
                object.__setattr__  # placeholder (real check below)
                setattr(f, "default", "mutation probe")
    assert probed > 0, "no mod fields probed — probe setup broke"


def test_flavor_override_never_back_mutates() -> None:
    """The Lanpaint flavor's required anchor must not leak back into
    the generic LanPaintMod (optional there — t2i families don't
    anchor on it)."""
    from melite_cards import LanPaintMod
    base = {f.name: f for f in LanPaintMod._fields_}
    assert base["input_image"].required is False, (
        "LanPaintMod.input_image flipped to required — a flavor "
        "override leaked back into the generic mod")
    by_id = _model_classes()
    qwen = by_id.get("qwen-img-edit-2511")
    assert qwen is not None, "qwen family missing — probe setup broke"
    flavor = next(m for m in (qwen.mods or ())
                  if getattr(m, "pack", "") == "lanpaint")
    fl = {f.name: f for f in flavor._fields_}
    assert fl["input_image"].required is True, (
        "Lanpaint flavor lost its required anchor — the edit lane's "
        "declaration regressed")
    assert base["input_image"].required is False  # again, after load


def test_absorb_models_copies_fields() -> None:
    """The card's absorbed mod fields are COPIES (families-tagged),
    never the mod's own objects — tagging must not write home."""
    from melite_cards import LanPaintMod
    fields = _card_fields("image-edit")
    assert fields, "image-edit card won't load — probe setup broke"
    base = {f.name: f for f in LanPaintMod._fields_}
    card = {f.name: f for f in fields}
    for name, bf in base.items():
        if name in card:
            assert card[name] is not bf, (
                "card field %r IS the mod's object — families tagging "
                "would write home to the shared mod" % name)


def test_merged_defaults_fresh_per_call() -> None:
    """merged_defaults returns a fresh dict — poisoning one caller's
    copy must not reach the next caller or the class."""
    by_id = _model_classes()
    qwen = by_id.get("qwen-img-edit-2511")
    assert qwen is not None, "qwen family missing — probe setup broke"
    first = qwen.merged_defaults()
    first["steps"] = 999
    first["injected"] = True
    second = qwen.merged_defaults()
    assert second.get("steps") != 999 and "injected" not in second, (
        "merged_defaults shares state across calls — a LEAK")
    assert qwen.defaults.get("steps") != 999, (
        "merged_defaults wrote home into cls.defaults — a LEAK")


def test_loras_channel_allowlisted(tmp_path: Path) -> None:
    """The loras channel resolves entries against the model's OWN
    catalog rows only — an unknown id refuses naming it (no
    arbitrary filename rides), and a family with no loras mod has
    the channel closed (qwen edit: loras_of() == ())."""
    pkg = _compose_pkg()
    by_id = _model_classes()
    qwen = by_id.get("qwen-img-edit-2511")
    assert qwen is not None, "qwen family missing — probe setup broke"
    assert tuple(qwen.loras_of()) == (), (
        "qwen-img-edit-2511 grew a loras catalog — the edit lane has "
        "no governed LoRAs; the external Lightning LoRA must NEVER "
        "stack on these weights (double distillation)")
    arm = pkg._load_arm_package("image/image-gen")
    tmp = str(tmp_path)
    with open(os.path.join(tmp, "anchor.png"), "wb") as fh:
        fh.write(b"\x89PNG\r\n\x1a\n" + b"\x00" * 32)
    arm.input_dir = lambda: tmp
    from melite_cards import load_card_py
    import glob as _glob
    cp = _glob.glob(os.path.join(
        CARDS_ROOT, "image", "image-gen", "py", "card.py"))[0]
    gcls = load_card_py(cp, "comfyui")
    # krea-2: the image-gen family WITH a loras mod (anima has none —
    # its "channel closed" refusal is a different, also-correct gate).
    model = "krea-2"
    assert by_id[model].card == "image-gen", (
        "krea-2 left the image-gen card — re-target this pin")
    payload = _surface_payload(
        list(gcls._fields_),
        dict(getattr(by_id[model], "defaults", None) or {}))
    payload.update({"prompt": "wall probe",
                    "loras": [{"id": "no-such-lora-anywhere"}]})
    # preset is this lane's own _NARROW gap (unrelated to the loras
    # channel) — drop it so the refusal names the lora, not preset.
    payload.pop("preset", None)
    rc, _, _, err = arm.compose({"params": payload}, model, "")
    assert rc == -3 and "no-such-lora-anywhere" in (err or ""), (
        "loras channel admitted an uncataloged id: rc=%r err=%r — "
        "the allowlist is the double-distillation guard" % (rc, err))


def test_envelope_service_never_reaches_params() -> None:
    """Routing chrome is envelope, never params: card_compose_body
    strips `service` (the editor bakes it into generate payloads;
    no backend reader consumes it — before the strip every forbid
    row 400'd naming 'service')."""
    sys.path.insert(0, os.path.join(REPO, "py"))
    import gateway as _gw
    body = {"model": "qwen-img-edit-2511", "service": "image-edit",
            "prompt": "x", "draft_id": "d", "test": True}
    lifted = _gw.card_compose_body(body)
    assert set(lifted.keys()) == {"params"}, (
        "envelope lift changed shape: %s" % sorted(lifted.keys()))
    assert "service" not in lifted["params"], (
        "'service' fell through into params — the 400 class is back")
    assert lifted["params"].get("prompt") == "x"


# ── VARIANT ROUTE WALLS (2026-09-05 mod-audit stroke) ─────────────────
# A route id (a variant cell's route, e.g. qwen-img-edit-2511-lightning4)
# is what the editor posts as {model}. Before the stroke both doors
# refused it ("no model unit for model: ..." at resolve; "edit graph
# template missing" at find_template) — the picker OFFERED a route the
# backend could not compile: an inference-time failure class, caught
# here at compile time instead.

def _route_wall_card(mid_fam: str) -> type[object] | None:
    """The card class for a family id (generic plugin data), or None."""
    sys.path.insert(0, os.path.join(REPO, "py"))
    import melite_models as _mm
    for _p, cls in _mm.scan_engine_models(str(REPO)).values():
        if cls.id == mid_fam:
            card_id = getattr(cls, "card", None)
            if not card_id:
                return None
            from melite_cards import load_card_py as _load
            plugins = os.path.join(REPO, "plugins")
            for root, _dirs, files in os.walk(plugins):
                if "card.py" not in files or os.sep + "py" + os.sep \
                        not in root + os.sep:
                    continue
                engine = os.path.basename(os.path.dirname(
                    os.path.dirname(os.path.dirname(root))))
                try:
                    ccls = _load(os.path.join(root, "card.py"), engine)
                except Exception:
                    continue
                if ccls.id == card_id:
                    return ccls
            return None
    return None


def test_variant_routes_compile_through_gateway_door(tmp_path: Path) -> None:
    """Every route id a served variant row names resolves THROUGH the
    gateway validate door (resolve_card_model): the skeleton addresses
    the OWNING family, phase 1 composes, and the route's served
    defaults (family row + variant resolver_defaults) ride the pool —
    the bare/API path compiles the SAME recipe the picker promised.
    (Before this wall: no arm applied the variant layer; krea-2-raw
    silently compiled the turbo recipe with cfg 4.5.)"""
    sys.path.insert(0, os.path.join(REPO, "py"))
    import gateway as _gw
    import melite_models as _mm
    import editor_forms as _ef

    offered: set[str] = set()
    for _card, blob in _ef.forms(str(REPO))["forms"].items():
        offered.update(blob.get("covers") or [])

    routes: dict[str, tuple[str, dict]] = {}
    for _p, cls in _mm.scan_engine_models(str(REPO)).values():
        if cls.id not in offered:
            continue      # unboarded data-family: never on the picker
        fam_defaults = dict(getattr(cls, "defaults", None) or {})
        for rid, (variant, _cell) in (getattr(cls, "_routes", None)
                                      or {}).items():
            stamps = dict(fam_defaults)
            stamps.update(variant.resolver_defaults or {})
            routes[rid] = (cls.id, stamps)
    assert routes, "no offered model declares _routes — probe broke"

    # the gateway door reads the REAL ComfyUI input dir (data/input)
    # — an existing file serves read-only; a scratch dotfile is
    # dropped only when the mount is empty (removed in finally).
    # the anchor rides as an /v1/assets artifact URL — the one ref
    # shape EVERY lane's phase-1 law accepts (the gateway sweep
    # resolves it under data/runs/output, the lanes' mounts honor
    # it; a data/input filename or an absolute path each fail SOME
    # lane's own existence law). Scratch artifact only when the
    # runs tree is empty (removed in finally).
    _out_root = os.path.join(REPO, "data", "runs", "output")
    _scratch_dir = None
    _runs = sorted(os.listdir(_out_root)) if os.path.isdir(_out_root) \
        else []
    _scratch_dir = None
    anchor = None
    for _rn in _runs:
        _rd = os.path.join(_out_root, _rn)
        for _fn in sorted(os.listdir(_rd)) if os.path.isdir(_rd) else []:
            if _fn.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                anchor = "/v1/assets/runs/%s/%s" % (_rn, _fn)
                break
        if anchor:
            break
    if anchor is None:
        _scratch_dir = os.path.join(_out_root, "run-wall-route-probe")
        os.makedirs(_scratch_dir, exist_ok=True)
        with open(os.path.join(_scratch_dir, "anchor.png"), "wb") as _fh:
            _fh.write(b"\x89PNG\r\n\x1a\n")
        anchor = "/v1/assets/runs/run-wall-route-probe/anchor.png"
    # the same artifact as a literal disk path (3D lanes' grammar)
    anchor_abs = os.path.join(_out_root, *anchor[len(
        "/v1/assets/runs/"):].split("/"))
    try:
        checked = []
        skipped = []
        for rid, (fam, stamps) in sorted(routes.items()):
            body = {"model": rid}
            ccls = _route_wall_card(fam)
            for f in getattr(ccls, "_fields_", ()) if ccls else ():
                if not getattr(f, "required", False):
                    continue
                name = getattr(f, "name", "")
                body[name] = "wall probe" if name not in (
                    "input_image", "image", "ref_image", "source") \
                    else "__ANCHOR__"
            # lanes' input-existence grammars differ (image-edit
            # resolves /v1/assets URLs; the 3D lanes take literal
            # paths; the artifact-root lanes refuse paths outside
            # data/runs/output) — the anchor is probed per lane in
            # both shapes; any NON-input refusal fails the wall.
            compiled = None
            last_err = None
            for cand in (anchor, anchor_abs):
                probe = dict(body)
                for k, v in probe.items():
                    if v == "__ANCHOR__":
                        probe[k] = cand
                try:
                    compiled = _gw.resolve_card_model(probe, rid)
                    break
                except Exception as e:      # noqa: BLE001
                    last_err = str(e)
            if compiled is None:
                skipped.append((rid, (last_err or "")[:120]))
                continue
            skeleton, _etype, extra = compiled
            assert skeleton.name == fam, (
                "route %r resolved to skeleton %r (want family %r) — "
                "the graph is addressed by the owning family"
                % (rid, skeleton.name, fam))
            pool = (extra or {}).get("inputs", {})
            for key, val in stamps.items():
                if key not in pool:
                    continue
                same = False
                try:
                    same = float(pool[key]) == float(val)
                except (TypeError, ValueError):
                    same = str(pool[key]) == str(val)
                assert same, (
                    "route %r: stamp %s=%r never rode (pool says %r) — "
                    "variant semantics ride resolver stamps"
                    % (rid, key, val, pool[key]))
            checked.append(rid)
        for rid, why in skipped:
            print("route wall SKIP %s: %s" % (rid, why))
        assert "qwen-img-edit-2511-lightning4" in checked, (
            "the incident's route vanished — probe needs re-aiming")
        assert "krea-2-raw" in checked, (
            "the turbo/raw leak route vanished — probe needs re-aiming")
    finally:
        if _scratch_dir is not None:
            import shutil as _sh
            _sh.rmtree(_scratch_dir, ignore_errors=True)


def test_variant_route_lens_never_stamps_the_family_spec() -> None:
    """Route-lens anti-leak: fetching a ROUTE's form-spec must leave
    the FAMILY's spec unstamped. (The lens stamps defaults onto the
    family spec it serves; the stamp is copy-based since this stroke —
    the wall holds even if a cache layer ever aliases served rows.
    The 2026-09-05 route audit found the in-place stamp harmless only
    because every dict was rebuilt per call: a footgun, now pinned.)

    (2026-09-06: the family steps FIELD default is 4 by CARD
    declaration now — the frontend-impossible stroke declared the
    lane defaults on the card (== the schema row). A "family field
    != route stamp" proxy can no longer distinguish a stamp from the
    card's own default, so this pins the property DIRECTLY: the
    family spec before the route fetch is identical after it.)"""
    sys.path.insert(0, os.path.join(REPO, "py"))
    import editor_forms as _ef

    fam = "qwen-img-edit-2511"
    route = fam + "-lightning4"
    st_0, spec_0 = _ef.form_spec(str(REPO), fam)
    assert st_0 == 200, "family spec refused: %r" % (spec_0,)

    st_r, spec_r = _ef.form_spec(str(REPO), route)
    assert st_r == 200, "route spec refused: %r" % (spec_r,)
    assert spec_r["model"] == route
    assert str(spec_r["defaults"].get("steps")) == "4", (
        "route lens lost its variant stamps: %r"
        % (spec_r["defaults"],))

    st_f, spec_f = _ef.form_spec(str(REPO), fam)
    assert st_f == 200
    assert spec_f["model"] == fam, "family spec carries a route id"
    assert spec_f == spec_0, (
        "family spec MUTATED by the route fetch — the stamp leaked "
        "through a shared row (copy-based stamping broken)")


def test_route_stamped_field_defaults_are_native_typed() -> None:
    """C RETIREMENT: a new fossil in the wire is a bug, not heritage.
    The route lens stamped _wire_str-stringified base defaults (the C
    wire's raw string form) under native resolver values — one form,
    two types for one kind (krea-2-raw served width '1024' next to
    steps 52). Stamped FIELD defaults ride NATIVE now; the
    stringified top-level `defaults` contract is untouched (pinned
    above). A numeric/boolean card field serving a string default is
    the fossil back."""
    sys.path.insert(0, os.path.join(REPO, "py"))
    import editor_forms as _ef
    by_id = _model_classes()
    probed, skipped, seen = 0, [], set()
    for _mid, cls in sorted(by_id.items()):
        for route in sorted(getattr(cls, "_routes", None) or {}):
            if route in seen:
                continue
            seen.add(route)
            owner = _ef._route_owner(REPO, route)
            if owner is None:
                skipped.append(route + " (no owner)")
                continue
            status, spec = _ef._form_spec_routed(REPO, owner, route)
            assert status == 200, "%s route broke: %r" % (route, spec)
            kinds = {f.name: type(f).__name__
                     for f in (_card_fields(str(spec.get("form") or ""))
                               or [])}
            for f in spec.get("fields", []):
                d = f.get("default")
                if d is None:
                    continue
                kind = kinds.get(f.get("name"))
                if kind in ("Number", "Slider", "Seed"):
                    assert isinstance(d, (int, float)) and not \
                        isinstance(d, bool), (
                        "%s field %s serves stringified %r — route "
                        "stamps ride native" % (route, f.get("name"), d))
                    probed += 1
                elif kind == "Boolean":
                    assert isinstance(d, bool), (
                        "%s field %s serves %r — route stamps ride "
                        "native" % (route, f.get("name"), d))
                    probed += 1
    assert probed > 0, "no route field probed — the wall is blind: %r" % (
        skipped,)


# ── RECIPE ROWS (2026-09-05, "write it up cleanly, with pydantic
#    classes") ────────────────────────────────────────────────────────
# A recipe is a PATCH-ONLY Variant row (group="Recipe", no route, no
# cells) whose declared `defaults` stamp the draft on click; firing
# rides the EXISTING loras door. The 2026-08-era chips it replaces
# wrote `loras_selected` — a key the backend never read (the LoRA
# never actually loaded). These walls pin the real thing end-to-end.

def test_recipe_picks_resolve_in_their_catalogs() -> None:
    """Recipe SSOT: every routeless variant row's loras picks exist in
    the OWNING family's catalog (LoraRow ids). A pick naming a lora no
    row declares is a chip that 400s one click later — this wall
    refuses it at boot instead (compile-time, not click-time)."""
    sys.path.insert(0, os.path.join(REPO, "py"))
    from melite_models import scan_engine_models

    recipes = 0
    for _p, cls in scan_engine_models(str(REPO)).values():
        catalog = {r.id for r in getattr(cls, "loras_of", lambda: ())()}
        for v in getattr(cls, "variants", ()) or ():
            picks = (v.defaults or {}).get("loras")
            if not picks:
                continue
            assert not v.route, (
                "family %s variant %r carries loras stamps AND a route — "
                "recipes are patch-only rows; routed variants stamp "
                "resolver_defaults (the overlay owns route stamps)"
                % (cls.id, v.id))
            recipes += 1
            for ent in picks:
                lid = ent.get("id", "")
                assert lid in catalog, (
                    "family %s recipe %r picks lora %r — not in its "
                    "catalog (known: %s)"
                    % (cls.id, v.id, lid, ", ".join(sorted(catalog)) or
                       "NONE — the family declares no loras mod"))
    assert recipes >= 1, (
        "no recipe rows anywhere — the krea-2 Realism row was the "
        "founding case; if it moved, this wall follows it")


def test_recipe_realism_auto_loads_the_lora() -> None:
    """The operator's memory, made REAL this time: apply the Realism
    recipe's stamps (the pick, no restated strength) → compose phase 1
    resolves the catalog row → strength DERIVES from the row (0.7,
    rung 6) → the run pool carries the wired filename. Validation
    door only — no GPU, no registration."""
    sys.path.insert(0, os.path.join(REPO, "py"))
    import plugins as _pg

    body = {"model": "krea-2",
            "params": {"prompt": "wall probe",
                       # the recipe's stamp verbatim: id only — the
                       # strength derives from the LoraRow
                       "loras": [{"id": "krea2_realism_lora"}]}}
    graph, extra = _pg.compose(dict(body), "krea-2", "", None,
                               ("comfyui",))
    picks = (extra or {}).get("inputs", {}).get("loras")
    assert picks == [{
        "filename": "krea-2/krea2_realism_lora.safetensors",
        "strength": 0.7,
    }], "the realism recipe did not auto-load its lora: %r" % (picks,)


def test_recipe_unknown_pick_refuses_at_the_door() -> None:
    """The compile-time catch: a pick outside the catalog refuses at
    the validation door, naming the known ids — never a silent drop,
    never a GPU slot."""
    sys.path.insert(0, os.path.join(REPO, "py"))
    import plugins as _pg

    body = {"model": "krea-2",
            "params": {"prompt": "wall probe",
                       "loras": [{"id": "krea2_typo_lora"}]}}
    with pytest.raises(_pg.ValidationError) as ei:
        _pg.compose(dict(body), "krea-2", "", None, ("comfyui",))
    msg = str(ei.value)
    assert "krea2_typo_lora" in msg and "krea2_realism_lora" in msg, (
        "refusal must name the pick and the catalog: %r" % msg)


def test_recipe_serves_patch_only_on_the_wire() -> None:
    """The serve shape: the Recipe row rides spec.variants with group
    Recipe, route '' (falsy — handleVariantPick's patch path), and its
    stamps INTACT (the old serve forced defaults {} for every row and
    would have gutted the recipe); the family's declared VariantGroup
    rows serve as variant_groups (the hardcoded pair starved them);
    the lora modifier's options ARE the catalog rows, strength seeded
    from the LoraRow — the one strength source."""
    sys.path.insert(0, os.path.join(REPO, "py"))
    import editor_forms as _ef

    st, spec = _ef.form_spec(str(REPO), "krea-2")
    assert st == 200, spec

    row = next((v for v in spec["variants"] if v["id"] == "realism"), None)
    assert row is not None, "realism recipe row missing from spec.variants"
    assert row["group"] == "Recipe"
    assert not row["route"], "recipe row must be patch-only (route falsy)"
    assert row["defaults"] == {"loras": [{"id": "krea2_realism_lora"}]}, (
        "recipe stamps gutted at serve: %r" % (row["defaults"],))

    groups = spec["features"]["variant_groups"]
    assert "Recipe" in groups and groups["Recipe"].get("tooltip"), (
        "declared VariantGroup rows not serving: %r" % groups)

    lora_mod = next((m for m in spec["features"]["modifiers"]
                     if m.get("kind") == "lora"), None)
    assert lora_mod is not None, "no lora modifier on the krea-2 spec"
    opts = {o["value"]: o for o in lora_mod["options"]}
    assert "krea2_realism_lora" in opts, (
        "catalog rows not serving as lora options: %r" % list(opts))
    realism = opts["krea2_realism_lora"]
    assert realism["defaults"] == {"strength": 0.7}, (
        "strength must seed from the LoraRow (the one source): %r"
        % (realism,))
    assert not lora_mod["declaration_only"], (
        "a family WITH catalog rows must not serve declaration_only")


# ── THE FRONTEND-IMPOSSIBLE STROKE (2026-09-06) ──────────────────────
#
# Incident: the suite above passed while EVERY untouched numeric/bool
# knob 400'd at the click — the served family envelope was derived
# from the card.py UI fields (whose defaults are almost always None),
# while the backend wire gate enforces the schema.py frozen row (whose
# defaults are the lane values). The envelope carried no default for
# duration/width/steps/..., the editor seeds "" for exactly those,
# and the click gate refused ""→null as "null but has no default".
# The fix: the envelope PROJECTS the schema.py row (defaults
# included), and the frontend omits null/UNSET-"" for defaulted
# fields (absent rides the backend default — explicit null refuses
# on every numeric row). These walls pin the backend half: the served
# envelope IS the schema projection, every card surface name rides
# it, and numeric/bool UI defaults equal the lane defaults (seed,
# display, AND run one value).
def _wall_schema_row(card_py_path: str) -> type[BaseModel] | None:
    """The card's enforcement row, resolved INDEPENDENTLY of the
    serve path (this wall must not share the implementation it pins):
    sibling schema.py loaded standalone, parse_card's return
    annotation when it names a pydantic model, else the module's
    single model. None when unresolvable (fallback lane)."""
    import typing as _t
    schema_py = os.path.join(os.path.dirname(card_py_path), "schema.py")
    if not os.path.isfile(schema_py):
        return None
    name = "wallrow_" + re.sub(r"[^0-9A-Za-z_]", "_", schema_py)
    spec = importlib.util.spec_from_file_location(name, schema_py)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    try:
        spec.loader.exec_module(mod)
    except Exception:
        return None
    try:
        from pydantic import BaseModel as _BM
    except Exception:
        return None
    parse_card = getattr(mod, "parse_card", None)
    if callable(parse_card):
        # Unevaluated return annotation first (2026-09-06, sculpt
        # draft repair): mirrors the serve path's rule — an
        # unresolvable PARAM annotation must not sink the return
        # pick, and multi-model modules resolve exactly.
        try:
            ret = getattr(parse_card, "__annotations__", {}).get("return")
            if isinstance(ret, str):
                ret = getattr(mod, ret, None)
            if isinstance(ret, type) and issubclass(ret, _BM):
                return ret
        except Exception:
            pass
        try:
            ret = _t.get_type_hints(parse_card).get("return")
            if isinstance(ret, type) and issubclass(ret, _BM):
                return ret
        except Exception:
            pass
    try:
        cands = [v for v in vars(mod).values()
                 if isinstance(v, type) and issubclass(v, _BM)
                 and getattr(v, "__module__", "") == name]
        if len(cands) == 1:
            return cands[0]
    except Exception:
        pass
    return None


def _wall_project_row(row_cls: type[BaseModel]) -> dict[str, dict[str, JsonValue]] | None:
    """Independent envelope projection of a schema row: name → JSON
    type + default (None defaults INCLUDED — the class's own
    null-admission for Optional slots/bags). Untyped annotations
    (object/Any/dict/mixed unions) carry NO type key."""
    import typing as _t

    def jtype(ann: type[object] | UnionType | GenericAlias
              | typing._GenericAlias | str | None) -> str | None:
        if ann is None:
            return None
        origin = _t.get_origin(ann)
        args = _t.get_args(ann)
        if origin is not None and str(origin) == "typing.Annotated":
            return jtype(args[0]) if args else None
        if origin is _t.Union or str(origin).endswith("|"):
            rest = [a for a in args
                    if a is not type(None) and a is not _t.Any]
            if len(rest) == 1:
                return jtype(rest[0])
            if rest and all(a in (int, float) for a in rest):
                return "number"
            flat = {jtype(a) for a in rest} - {None}
            return flat.pop() if len(flat) == 1 else None
        if ann is str:
            return "string"
        if ann is bool:
            return "boolean"
        if ann in (int, float):
            return "number"
        if origin in (list, tuple, set, frozenset):
            return "array"
        return None

    try:
        model_fields = getattr(row_cls, "model_fields")
        if not model_fields:
            return None
    except Exception:
        return None
    out = {}
    for fname, fld in model_fields.items():
        entry: dict = {}
        t = jtype(getattr(fld, "annotation", None))
        if t is not None:
            entry["type"] = t
        try:
            dflt = fld.get_default(call_default_factory=True)
        except Exception:
            pass
        else:
            try:
                from pydantic_core import PydanticUndefined as _U
                has = dflt is not _U
            except Exception:
                has = dflt is not None or not getattr(
                    fld, "is_required", lambda: True)()
            if has and (dflt is None or isinstance(
                    dflt, (str, int, float, bool, list, dict))):
                entry["default"] = dflt
        out[str(fname)] = entry
    return out or None


def _wall_card_py(card_id: str) -> str | None:
    cands = sorted({card_id, card_id.replace("-", "_")})
    for cand in cands:
        for genre in sorted(os.listdir(CARDS_ROOT)):
            cp = os.path.join(CARDS_ROOT, genre, cand, "py", "card.py")
            if os.path.isfile(cp):
                return cp
    return None


def test_served_envelope_projects_schema_row() -> None:
    """The served family envelope IS the schema.py projection: same
    names, same types, same defaults. A revert to card.py derivation
    fails here (music numerics lose their defaults first)."""
    sys.path.insert(0, os.path.join(REPO, "py"))
    import editor_runs as _er
    by_id = _model_classes()
    probed, fallback, skipped = 0, [], []
    for mid, cls in sorted(by_id.items()):
        card = getattr(cls, "card", None)
        if not card:
            continue
        card_py = _wall_card_py(str(card))
        if card_py is None:
            skipped.append("%s (no card.py)" % mid)
            continue
        row = _wall_schema_row(card_py)
        served = _er._family_surface_props(mid)
        assert served is not None, (
            "%s serves NO envelope — the click gate defers always "
            "(the 2026-09-05 image-edit incident returns)" % mid)
        if row is None:
            fallback.append(mid)
            continue
        want = _wall_project_row(row)
        assert want is not None, (
            "%s resolves a row the wall cannot project — repair the "
            "wall, never delete it" % mid)
        assert served == want, (
            "%s envelope drifted from its schema row:\nserved=%r\n"
            "schema=%r" % (mid, served, want))
        probed += 1
    assert probed > 0, "no family probed — the wall is blind: %r" % skipped
    # Fallback lane (card.py derivation, no resolvable row): pinned
    # CLOSED — today only the h3 lane rides it (their parse doors
    # don't resolve to a single row), and each must grow a
    # resolvable row to leave. (ideogram4 HAS IdeogramParams since
    # the 2026-09-05 sweep — it projects from its row, not here;
    # mask-studio left 2026-09-06 — the unevaluated-annotation row
    # pick resolves its door where get_type_hints could not.)
    assert sorted(fallback) == ["h3", "h3-keyframe", "h3-timeline"], (
        "fallback-lane set changed: %r — a new unresolvable row "
        "(refused) or a row landed (the envelope upgraded itself; "
        "delete the entry)" % sorted(fallback))


def test_card_surface_names_ride_the_envelope() -> None:
    """Every card.py field name is a served envelope key: the click
    gate must never flag the editor's own surface as unknown."""
    sys.path.insert(0, os.path.join(REPO, "py"))
    import editor_runs as _er
    by_id = _model_classes()
    probed = 0
    for mid, cls in sorted(by_id.items()):
        card = getattr(cls, "card", None)
        if not card:
            continue
        fields = _card_fields(str(card))
        if not fields:
            continue
        served = _er._family_surface_props(mid)
        assert served is not None, "%s serves no envelope" % mid
        missing = [f.name for f in fields if f.name not in served]
        assert not missing, (
            "%s envelope drops card surface names %r — the click "
            "gate would refuse the editor's own fields" % (mid, missing))
        probed += 1
    assert probed > 0, "no family probed — the wall is blind"


def test_card_knob_defaults_match_lane_defaults() -> None:
    """Number/Slider/Boolean card.py defaults ARE the schema.py lane
    defaults: seed, display, AND run one value. (Strings/slots/bags
    are exempt by design — emit() never serves '' and the draft
    seeds ''/null by convention; Seed is exempt — the -1 RANDOM
    sentinel is the widget's contract, not the row's 0.)"""
    probed = 0
    for lane, py_dir in _arms():
        card_py = os.path.join(py_dir, "card.py")
        row = _wall_schema_row(card_py)
        if row is None:
            continue
        card = os.path.basename(os.path.dirname(py_dir))
        fields = _card_fields(card)
        if not fields:
            continue
        try:
            row_defaults = {
                n: f.get_default(call_default_factory=True)
                for n, f in row.model_fields.items()}
        except Exception:
            continue
        for f in fields:
            if type(f).__name__ not in ("Number", "Slider", "Boolean"):
                continue
            cd = getattr(f, "default", None)
            rd = row_defaults.get(f.name)
            assert cd == rd, (
                "%s.%s card default %r != schema default %r — an "
                "untouched knob displays one value and runs another "
                "(the 2026-09-06 frontend-impossible class)" % (
                    lane, f.name, cd, rd))
            probed += 1
    assert probed > 0, "no knob probed — the wall is blind"


def test_editor_stripped_shape_parses_per_card() -> None:
    """The exact body the FIXED frontend POSTs parses at the phase-1
    door: schema defaults overlaid with the minimal required surface,
    NO nulls (the frontend omits null/UNSET-"" for defaulted fields —
    explicit null refuses on every numeric row, so the POST must
    never carry one)."""
    pkg = _compose_pkg()
    by_id = _model_classes()
    probed, skipped = 0, []
    for lane, py_dir in _arms():
        card_py = os.path.join(py_dir, "card.py")
        row = _wall_schema_row(card_py)
        if row is None:
            skipped.append(lane + " (no resolvable row)")
            continue
        proj = _wall_project_row(row)
        if proj is None:
            skipped.append(lane + " (row unprojectable)")
            continue
        try:
            arm = pkg._load_arm_package(lane)
        except Exception:
            try:
                arm = _load_arm(py_dir)
            except Exception as e:
                skipped.append("%s (arm won't load: %s)" % (lane, e))
                continue
        from pydantic_core import PydanticUndefined as _U
        raw_defaults = {}
        for n, f in row.model_fields.items():
            try:
                raw_defaults[n] = f.get_default(
                    call_default_factory=True)
            except Exception:
                continue
        # The frontend strip rule, mirrored: no PydanticUndefined, no
        # null for TYPED fields (explicit null refuses on every
        # numeric row); null rides ONLY for untyped-with-default bags
        # (the class's own None-coercion owns them).
        params = {}
        for k, v in raw_defaults.items():
            if v is _U:
                continue
            if v is None and "type" in proj.get(k, {}):
                continue
            params[k] = v
        # The editor always types a prompt; slots/bags stay absent
        # (empty squares never ride).
        if "prompt" in params:
            params["prompt"] = "wall probe"
        card = os.path.basename(os.path.dirname(py_dir))
        model = next((mid for mid, cls in by_id.items()
                      if getattr(cls, "card", None) in
                      (card, card.replace("_", "-"),
                       card.replace("-", "_"))), card)
        try:
            rc, _, _, err = arm.compose({"params": params}, model, "")
        except Exception as e:  # noqa: BLE001 — the door must not crash
            raise AssertionError(
                "%s stripped shape crashed the door: %r" % (lane, e))
        # rc == -3 with a NON-admission refusal (required-presence
        # voice, artifact environment) still proves the shape PARSED —
        # only extra_forbidden / ValidationError-shape failures fail.
        assert _no_extra_forbidden(err), (
            "%s stripped shape refused at admission: %r" % (lane, err))
        probed += 1
    assert probed > 0, "no lane probed — the wall is blind: %r" % skipped

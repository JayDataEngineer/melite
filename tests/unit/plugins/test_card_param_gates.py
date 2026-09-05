"""CARD PARAM GATES — the 11 comfyui card schema walls.

The 2026-09-05 duck-typing sweep found every comfyui card arm read
its params with bare `.get()` chains: a typo'd knob name
(``durations``) silently rendered at the DEFAULT (GPU cycles on
wrong params, zero errors — the silent-garbage class), and garbage
typed values (``seed: "later"``) silently re-defaulted through
float()/int() guards. The cpp cards and h3-timeline already carried
frozen schema.py gates; the comfyui family now does too (one frozen
extra="forbid" row per card — swept by the pydantic strictness wall
like every other row in the estate).

This suite pins, for EVERY gated card:

  * the defaults contract — no params stanza / empty stanza builds
    the defaults row (the compose door's own required-param guards
    keep their exact card-voice refusals; the gate never re-voices
    them);
  * the dead-rider law — an unknown key refuses, field-named;
  * the garbage-typing law — ``seed: "later"`` refuses loudly
    instead of silently re-defaulting;
  * string numerics coerce (the editor sends "1024" — lax wire ints
    are legal, garbage is not);
  * the compose door refuses a typo'd knob with rc=-3 (the arm maps
    ValidationError to the refusal contract) and admits a clean body.

mask_studio is EXCLUDED (mid-migration; its top-level gate lands with
that lane's merge). ideogram4's gate landed 2026-09-05 with this
sweep and is INCLUDED in the table below."""

import importlib.util
import sys
from pathlib import Path
from types import ModuleType

import pytest
from pydantic import ValidationError

REPO = Path(__file__).resolve().parents[3]

# One parametrized gate row: (card id, params-class name, schema
# module, the card's numeric knob under test).
GateRow = tuple[str, str, ModuleType, str]

GATED = {
    "3d/anny": ("AnnyParams", {"body_glb": "x.glb"}, "resolution"),
    "3d/img_to_mesh": ("ImgToMeshParams", {"input_image": "x.png"},
                       "seed"),
    "audio/music": ("MusicParams", {"prompt": "song"}, "seed"),
    "audio/sfx": ("SfxParams", {"prompt": "thunder"}, "seed"),
    "audio/tts": ("TtsParams", {"text": "hello"}, "seed"),
    "audio/voice-lock": ("VoiceLockParams",
                         {"voice_name": "v",
                          "style_instruction": "warm"}, "seed"),
    "image/image-edit": ("ImageEditParams",
                         {"prompt": "hat", "input_image": "x.png"},
                         "seed"),
    "image/image-gen": ("ImageGenParams", {"prompt": "a cat"}, "seed"),
    "image/ideogram4": ("IdeogramParams", {"prompt": "sign"}, "seed"),
    "image/upscale-tools": ("UpscaleParams", {}, "seed"),
    "motion/motion": ("MotionGenParams", {"prompt": "walk"}, "seed"),
    "video/video-gen": ("VideoGenParams", {"prompt": "clip"}, "seed"),
}

_sys_paths = []


def _schema_mod(card: str) -> ModuleType:
    p = REPO / "plugins/engines/comfyui/action_cards" / card / "py" \
        / "schema.py"
    name = "gate_" + card.replace("/", "_")
    if name in sys.modules:
        return sys.modules[name]
    spec = importlib.util.spec_from_file_location(name, p)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture(scope="module", params=sorted(GATED))
def gate(request: pytest.FixtureRequest) -> GateRow:
    card = request.param
    mod = _schema_mod(card)
    return card, GATED[card][0], mod, GATED[card][2]


# ── the defaults contract ──────────────────────────────────────────

def test_no_params_stanza_builds_defaults(gate: GateRow) -> None:
    card, cls, mod, _num = gate
    doc = mod.parse_card({})
    doc2 = mod.parse_card({"model": "whatever"})   # no params stanza
    assert type(doc).__name__ == cls
    assert type(doc2).__name__ == cls


def test_empty_params_stanza_builds_defaults(gate: GateRow) -> None:
    _card, _cls, mod, _num = gate
    assert mod.parse_card({"params": {}}) is not None


# ── the dead-rider law ─────────────────────────────────────────────

def test_unknown_knob_refuses_field_named(gate: GateRow) -> None:
    card, _cls, mod, _num = gate
    with pytest.raises(ValidationError) as ei:
        mod.parse_card({"params": {"__dead_rider__": 1}})
    assert ei.value.errors()[0]["type"] == "extra_forbidden"
    assert "__dead_rider__" in str(ei.value)


def test_typo_knob_refuses_not_silently_defaults(gate: GateRow) -> None:
    """THE sin this gate kills: `durations` must NOT render at the
    default duration — it refuses, naming the unknown key."""
    _card, _cls, mod, _num = gate
    with pytest.raises(ValidationError, match="durations"):
        mod.parse_card({"params": {"durations": 30}})


# ── the garbage-typing law ─────────────────────────────────────────

def test_garbage_numeric_refuses_loudly(gate: GateRow) -> None:
    _card, _cls, mod, num = gate
    with pytest.raises(ValidationError):
        mod.parse_card({"params": {num: "later"}})


def test_string_numerics_coerce(gate: GateRow) -> None:
    """The editor sends wire ints as strings — lax coercion is the
    contract; only true garbage refuses."""
    _card, _cls, mod, num = gate
    doc = mod.parse_card({"params": {num: "42"}})
    assert getattr(doc, num) in (42, 42.0)


# ── every row rides the strictness config ──────────────────────────

def test_every_gate_row_is_frozen_and_closed(gate: GateRow) -> None:
    _card, cls, mod, _num = gate
    row = getattr(mod, cls)
    assert row.model_config.get("frozen") is True
    assert row.model_config.get("extra") == "forbid"


# ── the compose door maps refusal to rc=-3 ─────────────────────────

def _load_compose(card: str) -> ModuleType:
    p = REPO / "plugins/engines/comfyui/action_cards" / card / "py" \
        / "compose.py"
    name = "arm_" + card.replace("/", "_")
    if name in sys.modules:
        return sys.modules[name]
    for d in (REPO / "plugins/engines/comfyui/compose",
              p.parent):
        if str(d) not in sys.path:
            sys.path.insert(0, str(d))
            _sys_paths.append(str(d))
    spec = importlib.util.spec_from_file_location(name, p)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


COMPOSE_CASES = {
    "audio/sfx": ("moss-sfx", {"prompt": "thunder crack"}),
    "audio/tts": ("qwen3-tts", {"text": "hello world"}),
    "image/image-gen": ("z-image", {"prompt": "a cat", "width": "768"}),
    "motion/motion": ("soma", {"prompt": "walk cycle"}),
}


@pytest.mark.parametrize("card", sorted(COMPOSE_CASES))
def test_compose_door_admits_clean_and_refuses_typos(card: str) -> None:
    model, good = COMPOSE_CASES[card]
    arm = _load_compose(card)
    rc, _y, _extra, err = arm.compose(
        {"params": dict(good)}, model, "")
    assert rc == 0, "clean body refused: %s" % err
    rc, _y, _extra, err = arm.compose(
        {"params": dict(good, typo_knob_xyz=1)}, model, "")
    assert rc == -3
    assert "typo_knob_xyz" in (err or "")

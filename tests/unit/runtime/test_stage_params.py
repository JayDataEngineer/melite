"""Stage-params lattice — the action-card ↔ flow type gap close (Path C,
2026-09-05). Design record: docs/queue/card-stage-typing.md.

The wall pins the four properties the lattice promises:

  1. Registry: one frozen CardSchemaRow per action card; the
     import list is hand-pinned and wall-verified against the
     on-disk schema.py tree (drift in either direction is a
     failure).

  2. Body gate: a stage with `card=` set has its `params`
     validated against the card's schema at Flow construction.
     A typo'd knob refuses LOUD, named after the field.

  3. Kind contract: a stage with `card=` set has its effective
     outputs and expected inputs filled from the registry. The
     kind check has a contract to compare against — a card stage
     wired wrong refuses the Flow(...) line, the same lever the
     flow-typed-edges check uses.

  4. Inline path: {flow_inline} gains the same gates. An AI-
     constructed multi-step flow that uses `card=` is gate-
     checked the same way an on-disk flow.py is.

Engine-only stages (card="") are unchanged: the engine's own
Phase-1 validation owns the body. The lattice is ADDITIVE.
"""

import importlib.util
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

import flow
from flow import Flow, Stage, FromInitial, FromStage, Kind

import stage_params
from melite_cards.serialize import scan_engine_cards


REPO = Path(__file__).resolve().parents[3]
COMFYUI = REPO / "plugins" / "engines" / "comfyui"


# ── helpers: mount the card packages so the lazy imports in
#    stage_params._SCHEMA_BY_CARD resolve. This mirrors what the
#    comfyui bus does at runtime (plugins.py EngineRef.load +
#    compose/_load_arm_package); the test does it once per session
#    so every test sees the same mounted set.

_CARDS_MOUNTED = False


def _mount_cards():
    global _CARDS_MOUNTED
    if _CARDS_MOUNTED:
        return
    sys.path.insert(0, str(COMFYUI))
    for py_dir in sorted((COMFYUI / "action_cards").glob("*/*/py")):
        if not (py_dir / "__init__.py").is_file():
            continue
        pkg_name = py_dir.parent.name.replace("-", "_")
        if pkg_name in sys.modules:
            continue
        spec = importlib.util.spec_from_file_location(
            pkg_name, py_dir / "__init__.py",
            submodule_search_locations=[str(py_dir)])
        if spec is None:
            continue
        pkg = importlib.util.module_from_spec(spec)
        sys.modules[pkg_name] = pkg
        spec.loader.exec_module(pkg)
    _CARDS_MOUNTED = True


@pytest.fixture(scope="module", autouse=True)
def _mount():
    _mount_cards()


# ── 1. registry: hand-pinned, wall-verified ─────────────────────────


def test_registry_declares_every_action_card_schema():
    """The card class table (the SSOT — melite_cards.scan_engine_cards)
    matches the registry's card_ids.

    Drift rule: every ActionCard that the editor serves must
    have a row in the registry. A card class without a row
    would be a body that never gets gated. A row in the
    registry without a card class is OK only for cards in
    stage_params._CARDS_WITHOUT_SCHEMA (today: ideogram4 — the
    form is its surface, the gate is a no-op).
    """

    cards = scan_engine_cards(str(REPO))
    on_disk = set(cards.keys())
    registered = set(stage_params.REGISTRY.card_ids())
    missing = on_disk - registered
    assert not missing, (
        "card class on disk without a registry row: %s — either add "
        "the row to stage_params.REGISTRY or document the card as "
        "schema-less in _CARDS_WITHOUT_SCHEMA"
        % sorted(missing))


def test_registry_does_not_claim_phantom_cards():
    """A row in the registry whose card id is NOT served by any
    ActionCard class is a phantom — the gate would activate for
    a card nobody can compose against. Refused loud."""
    cards = scan_engine_cards(str(REPO))
    on_disk = set(cards.keys())
    registered = set(stage_params.REGISTRY.card_ids())
    phantom = registered - on_disk - stage_params._CARDS_WITHOUT_SCHEMA
    assert not phantom, (
        "registry claims card_ids %s that no ActionCard serves — "
        "either remove the row or add the card class"
        % sorted(phantom))


def test_registry_unique_card_ids():
    """The cross-row invariant is enforced AT CONSTRUCTION (the
    model_validator in ParamSchemaRegistry). Constructing a
    duplicate-id table is the loud refusal."""
    from stage_params import CardSchemaRow, ParamSchemaRegistry
    with pytest.raises(ValidationError, match="duplicate card_id"):
        ParamSchemaRegistry(rows=(
            CardSchemaRow(card_id="dup", engine="comfyui"),
            CardSchemaRow(card_id="dup", engine="comfyui"),
        ))


def test_registry_kind_must_be_closed_vocabulary():
    """A typo'd kind value (e.g. "imag" instead of "image")
    refuses AT CONSTRUCTION of the row — PYTHON SHAPE LAW rung 3
    (closed vocabularies as enums, no stringly handshakes)."""
    from stage_params import CardSchemaRow
    with pytest.raises(ValidationError, match="closed vocabulary"):
        CardSchemaRow(
            card_id="bad-kind", engine="comfyui",
            kind_outputs={"default": "imag"})


def test_registry_schema_must_be_frozen_pydantic_model():
    """A non-frozen (or non-BaseModel) schema_class refuses
    AT CONSTRUCTION — PYTHON SHAPE LAW rung 2 (frozen, validated
    at construction, no post-hoc walks)."""
    from pydantic import BaseModel
    from stage_params import CardSchemaRow
    class NotFrozen(BaseModel):
        model_config = {}  # not frozen
        x: int = 0
    with pytest.raises(ValidationError, match="frozen=True"):
        CardSchemaRow(
            card_id="bad-schema", engine="comfyui",
            schema_class=NotFrozen)


# ── 2. body gate: Stage(card=...) validates params ─────────────────


def test_card_stage_unknown_knob_refused_at_construction():
    """The lever the lattice closes: a typo'd knob name refuses
    the Flow(...) line, named after the field. The duck-typed
    era let `durations` render at default duration — silent
    garbage on the GPU. This is the AI's main failure mode."""
    with pytest.raises((flow.FlowError, ValidationError)) as exc:
        Flow(id="typo-knob", stages=(
            Stage(id="m", engine="comfyui", card="music",
                  inputs={"prompt": FromInitial(key="prompt")},
                  params={"prompt": "hi", "durations": 5.0}),
        ))
    msg = str(exc.value)
    assert "durations" in msg, "must name the offending field: %r" % msg
    assert "music" in msg, "must name the card: %r" % msg
    assert "Extra inputs" in msg, "must name the failure: %r" % msg


def test_card_stage_clean_body_constructs():
    """The gate does not over-refuse: a clean body that matches
    the schema row constructs, the kind check uses the registry's
    kind_inputs to fill effective_expected, and to_graph() stamps
    the registry's kind_outputs into the NodeRow sidecar."""
    fl = Flow(id="clean-card", stages=(
        Stage(id="m", engine="comfyui", card="music",
              inputs={"prompt": FromInitial(key="prompt")},
              params={"prompt": "hi", "duration": 5.0}),
    ))
    # the row is unchanged (the lattice does not stamp over
    # explicit rows; the fill is local to the check)
    assert fl.stages[0].expected == {}
    # but the kind check ran and the sidecar carries the typed
    # chain past construction (the runtime promise: MCP
    # introspection / editor graph view see the kinds)
    g = fl.to_graph()
    assert g.nodes[0].outputs == {"default": "audio"}


def test_card_stage_schema_refused_for_unknown_card():
    """A card id that is not in the registry is a LOUD refusal
    at construction. The card may exist in a future estate —
    but until it joins the registry (and the schema.py on disk
    is the same), the lattice refuses. The error names the
    missing card."""
    with pytest.raises((flow.FlowError, ValidationError)) as exc:
        Flow(id="unknown-card", stages=(
            Stage(id="x", engine="comfyui", card="no-such-card",
                  params={}),
        ))
    msg = str(exc.value)
    assert "no-such-card" in msg, "must name the card: %r" % msg
    assert "ParamSchemaRegistry" in msg, "must point to the registry: %r" % msg


def test_engine_only_stage_skips_body_gate():
    """The lattice is ADDITIVE: a stage without `card=` does not
    gate its params (the engine's own Phase-1 validation owns
    the body shape). Regression: existing flows keep working
    without touching them."""
    fl = Flow(id="engine-only", stages=(
        Stage(id="a", engine="comfyui",
              inputs={"prompt": FromInitial(key="prompt")},
              expected={"prompt": Kind.text},
              params={"workflow": {"1": {"class_type": "Foo"}}}),
    ))
    # no card= → no body gate
    assert fl.stages[0].card == ""
    g = fl.to_graph()
    assert g.nodes[0].node_type == "comfyui"


# ── 3. kind contract: registry fills outputs/expected ──────────────


def test_card_stage_outputs_filled_from_registry():
    """The kind contract: a card stage that omits `outputs` has
    its effective outputs filled from the registry's
    `kind_outputs`. The flow-typed-edges check then has a
    contract to compare against. This is the lever the lattice
    adds — a kind contract for cards."""
    fl = Flow(id="card-outputs", stages=(
        Stage(id="m", engine="comfyui", card="music",
              inputs={"prompt": FromInitial(key="prompt")},
              params={"prompt": "hi"}),
    ))
    g = fl.to_graph()
    # registry says music outputs default -> audio
    assert g.nodes[0].outputs == {"default": "audio"}


def test_card_stage_expected_filled_from_registry():
    """Symmetric fill: a card stage that omits `expected` has
    its effective expected kinds filled from the registry's
    `kind_inputs`. The AI's first typo class — forgetting
    `expected=` on the receiving stage — has a typed fallback
    when the stage names a card.

    The fill is local to the kind check (effective_expected in
    _kinds_ok); the row's `expected` field is unchanged. The
    observable contract is: a chain whose upstream produces the
    right Kind passes the kind check even when the receiving
    stage omits `expected=`."""
    # Upstream: text-producing card stage (image-gen with a text
    # source). Downstream: tts (text -> audio) with NO expected=.
    # The lattice fills tts's expected={"prompt": text} from
    # the registry, the kinds match, the chain passes.
    fl = Flow(id="card-expected-fill", stages=(
        Stage(id="src", engine="comfyui",  # engine-only text producer
              inputs={"prompt": FromInitial(key="prompt")},
              outputs={"txt": Kind.text},
              expected={"prompt": Kind.text},
              params={"workflow": {"1": {"class_type": "Foo"}}}),
        Stage(id="tts", engine="comfyui", card="tts",
              inputs={"prompt": FromStage(stage="src", output="txt")},
              # no expected= — the registry fills it
              params={"text": "hi"}),
    ))
    # the construction succeeded — the kind check used the
    # registry's kind_inputs["prompt"]=text to fill
    # effective_expected, the kinds matched
    assert fl.stages[1].expected == {}  # row is unchanged
    g = fl.to_graph()
    # tts's output is audio (the registry filled it on to_graph)
    assert g.nodes[1].outputs == {"default": "audio"}


def test_kind_mismatch_against_card_outputs_refused():
    """The lattice's main lever: an image-gen output (Kind.image)
    wired into a video-gen input that expects Kind.text
    refuses the Flow(...) line. The error names both kinds and
    the off-ending stage/input/output channel — same shape as
    the existing flow-typed-edges check."""
    with pytest.raises((flow.FlowError, ValidationError)) as exc:
        Flow(id="img-to-text", stages=(
            Stage(id="gen", engine="comfyui", card="image-gen",
                  inputs={"prompt": FromInitial(key="prompt")},
                  params={"prompt": "a cat"}),
            Stage(id="vid", engine="comfyui", card="video-gen",
                  inputs={"prompt": FromStage(stage="gen",
                                              output="default")},
                  params={"prompt": "cat moves"}),
        ))
    msg = str(exc.value)
    assert "expected text" in msg
    assert "got image" in msg
    assert "must be text" in msg
    assert "stage 'vid' input 'prompt'" in msg
    assert "'gen' output 'default'" in msg


def test_kind_mismatch_image_to_text_input_refused():
    """Another kind: image-gen (image) wired into motion's
    prompt input (text). The image cannot masquerade as a
    text prompt."""
    with pytest.raises((flow.FlowError, ValidationError)) as exc:
        Flow(id="img-to-motion", stages=(
            Stage(id="gen", engine="comfyui", card="image-gen",
                  inputs={"prompt": FromInitial(key="prompt")},
                  params={"prompt": "a cat"}),
            Stage(id="m", engine="comfyui", card="motion",
                  inputs={"prompt": FromStage(stage="gen",
                                              output="default")},
                  params={}),
        ))
    assert "expected text" in str(exc.value)
    assert "got image" in str(exc.value)


def test_valid_kind_chain_image_to_mesh_passes():
    """The lattice does not over-refuse: a chain whose kinds
    line up constructs and to_graph() stamps the typed outputs
    into the sidecar."""
    fl = Flow(id="img-to-mesh", stages=(
        Stage(id="gen", engine="comfyui", card="image-gen",
              inputs={"prompt": FromInitial(key="prompt")},
              params={"prompt": "a cat"}),
        Stage(id="im", engine="comfyui", card="img-to-mesh",
              inputs={"input_image": FromStage(stage="gen",
                                              output="default")},
              params={}),
    ))
    g = fl.to_graph()
    out = {n.node_id: n.outputs for n in g.nodes}
    assert out == {"gen": {"default": "image"},
                   "im":  {"default": "mesh"}}


def test_explicit_outputs_override_registry():
    """Stage.outputs is the author-explicit override; the
    registry's kind_outputs is the fallback. The author wins."""
    fl = Flow(id="override", stages=(
        Stage(id="m", engine="comfyui", card="music",
              outputs={"mp3": Kind.audio},  # override
              inputs={"prompt": FromInitial(key="prompt")},
              expected={"prompt": Kind.text},
              params={"prompt": "hi"}),
    ))
    g = fl.to_graph()
    assert g.nodes[0].outputs == {"mp3": "audio"}


def test_card_io_explicit_override():
    """Stage.card_io is the rare explicit-override channel
    (a flow author who needs the card to declare a different
    output channel than the registry's default). Sits between
    Stage.outputs (author explicit) and the registry."""
    fl = Flow(id="card-io", stages=(
        Stage(id="m", engine="comfyui", card="music",
              card_io={"ogg": Kind.audio},
              inputs={"prompt": FromInitial(key="prompt")},
              params={"prompt": "hi"}),
    ))
    g = fl.to_graph()
    assert g.nodes[0].outputs == {"ogg": "audio"}


# ── 4. inline path: flow_from_body has the same gates ─────────────


def test_inline_flow_validates_schema():
    """The {flow_inline} JSON path gains the same body gate as
    the on-disk Flow() literal. An AI constructing a flow with
    a typo'd knob refuses the compile door (4xx, no GPU)."""
    body = {
        "id": "inline-typo",
        "stages": [
            {"id": "m", "engine": "comfyui", "card": "music",
             "inputs": {"prompt": {"initial": "prompt"}},
             "params": {"prompt": "hi", "durations": 5.0}},
        ],
    }
    with pytest.raises(flow.FlowError) as exc:
        flow.flow_from_body(body)
    msg = str(exc.value)
    assert "durations" in msg
    assert "music" in msg


def test_inline_flow_kind_mismatch_refused():
    """The {flow_inline} kind check is the same as the on-disk
    check. Image-gen -> video-gen (image into text) refuses."""
    body = {
        "id": "inline-mismatch",
        "stages": [
            {"id": "gen", "engine": "comfyui", "card": "image-gen",
             "inputs": {"prompt": {"initial": "prompt"}},
             "params": {"prompt": "a cat"}},
            {"id": "vid", "engine": "comfyui", "card": "video-gen",
             "inputs": {"prompt": {"stage": "gen",
                                   "output": "default"}},
             "params": {"prompt": "cat moves"}},
        ],
    }
    with pytest.raises(flow.FlowError) as exc:
        flow.flow_from_body(body)
    assert "expected text" in str(exc.value)
    assert "got image" in str(exc.value)


def test_inline_flow_clean_card_constructs():
    """The {flow_inline} path accepts a clean card flow the
    same way the on-disk literal does."""
    body = {
        "id": "inline-clean",
        "stages": [
            {"id": "gen", "engine": "comfyui", "card": "image-gen",
             "inputs": {"prompt": {"initial": "prompt"}},
             "params": {"prompt": "a cat"}},
            {"id": "anny", "engine": "comfyui", "card": "anny",
             "inputs": {"source_image": {"stage": "gen",
                                         "output": "default"}},
             "params": {}},
        ],
    }
    fl = flow.flow_from_body(body)
    g = fl.to_graph()
    out = {n.node_id: n.outputs for n in g.nodes}
    assert out == {"gen":  {"default": "image"},
                   "anny": {"default": "mesh"}}


def test_inline_flow_unknown_card_refused():
    """An inline body naming a card that is not in the registry
    refuses — same lever as the on-disk path."""
    body = {
        "id": "inline-unknown",
        "stages": [
            {"id": "x", "engine": "comfyui", "card": "no-such-card",
             "params": {}},
        ],
    }
    with pytest.raises(flow.FlowError) as exc:
        flow.flow_from_body(body)
    assert "no-such-card" in str(exc.value)


# ── 5. precedence ladder: outputs > card_io > registry > engine ───


def test_precedence_explicit_outputs_win_over_card_io():
    """Stage.outputs (most explicit) wins over Stage.card_io."""
    fl = Flow(id="prec1", stages=(
        Stage(id="m", engine="comfyui", card="music",
              outputs={"wav": Kind.audio},
              card_io={"mp3": Kind.audio},
              inputs={"prompt": FromInitial(key="prompt")},
              expected={"prompt": Kind.text},
              params={"prompt": "hi"}),
    ))
    g = fl.to_graph()
    assert g.nodes[0].outputs == {"wav": "audio"}


def test_precedence_card_io_wins_over_registry():
    """Stage.card_io wins over the registry's kind_outputs."""
    fl = Flow(id="prec2", stages=(
        Stage(id="m", engine="comfyui", card="music",
              card_io={"wav": Kind.audio},
              inputs={"prompt": FromInitial(key="prompt")},
              params={"prompt": "hi"}),
    ))
    g = fl.to_graph()
    assert g.nodes[0].outputs == {"wav": "audio"}


# ── 6. existing flows (regression) ────────────────────────────────


def test_existing_flows_still_load():
    """The two on-disk flows (audio-native-tts, kimodo-native) are
    engine-only and must still load without touching them. The
    lattice is additive — no behavior change for card="".
    """
    fl = flow.load_flow("audio-native-tts")
    assert fl.id == "audio-native-tts"
    assert fl.stages[0].engine == "comfyui"
    assert fl.stages[0].card == ""
    fl = flow.load_flow("kimodo-native")
    assert fl.id == "kimodo-native"
    assert fl.stages[0].engine == "comfyui"
    assert fl.stages[0].card == ""

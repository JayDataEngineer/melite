"""DRIFT WALL — spec-vs-wire alignment on chain-backed re-runs.

(QUEUE LANE LAW, 2026-09-05) specBaseline is the C-era re-run diff
source: when a chain-backed run re-runs, the spec's CURRENT stage
params are diffed against the specBaseline (the spec values at the
time the run was originally composed) so the user sees WHAT CHANGED.
A drifted spec — the spec loses a step, the spec renames a service,
the spec removes a param — would re-run with a different graph than
the one the user originally composed. The drift class is the
index-alignment break: a re-run whose stage indices no longer line
up with the original run's stages.

This wall pins the drift refusal: every shape that drifts from the
compose-time Flow refuses AT CONSTRUCTION (extra=forbid, the typed-
edges contract, the engine registry, the unique-id check). The
refusal is loud — FlowError, never a partial run, never a silent
drop. The compile-time feedback the AI iterates on is the same
door the run uses, so what compiles here is what runs.

No GPU, no network."""

from _anchor import REPO  # noqa: E402

import pytest  # noqa: E402

import flow as flow_mod  # noqa: E402
from flow import Kind  # noqa: E402


# A real two-stage inline flow (comfyui engine — the live engine in
# this repo). Wiring rides inputs: {"name": {"stage": id, "output":
# name} | {"initial": key}}; typed edges come from expected/outputs.
TWOSTEP = {
    "id": "drift-test",
    "description": "wall fixture: two stages wired by typed edges",
    "stages": [
        # stage 0: no inputs, no expected (the schema requires
        # inputs.keys() == expected.keys() — both empty is fine).
        {"id": "gen",
         "engine": "comfyui",
         "description": "first stage",
         "params": {"prompt": "first"},
         "outputs": {"out": Kind.text}},
        {"id": "edit",
         "engine": "comfyui",
         "description": "second stage",
         "params": {},
         "inputs": {"prompt": {"stage": "gen", "output": "out"}},
         "expected": {"prompt": Kind.text},
         "outputs": {"out": Kind.text}},
    ],
}


# A. drift detection: the schema refuses every shape that drifts
# from the compose-time contract. Each refusal is a FlowError
# naming the offending surface — the same compile-time feedback
# the AI iterates on.

def test_drift_extra_top_level_key_refuses():
    """The body carries a top-level key the schema doesn't declare.
    extra=forbid refuses AT CONSTRUCTION. (2026-09-05 retirement:
    a fossil flow spec carrying the yaml-era `edges` key refuses
    loud, never a partial run.)"""
    drifted = dict(TWOSTEP)
    drifted["fossil_field"] = "creature-flow"
    with pytest.raises(flow_mod.FlowError) as e:
        flow_mod.flow_from_body(drifted)
    assert "fossil_field" in str(e.value)


def test_drift_yaml_era_top_key_refuses():
    """The `edges` key from the yaml flow format retired 2026-09-05.
    A body carrying it refuses loud (the schema's _INLINE_TOP_KEYS
    is {id, description, stages}; edges is a dead key)."""
    drifted = dict(TWOSTEP)
    drifted["edges"] = [{"from": "gen", "to": "edit"}]
    with pytest.raises(flow_mod.FlowError) as e:
        flow_mod.flow_from_body(drifted)
    assert "edges" in str(e.value)


def test_drift_stage_unknown_field_refuses():
    """A stage row carries a field the Stage pydantic doesn't
    declare. extra=forbid refuses AT CONSTRUCTION. (The fossil
    yamlFlow/yamlRunId names retired — a stage row that names one
    refuses loud, never a silent accept.)"""
    drifted = {
        "id": "drift-stage-field",
        "stages": [
            {"id": "gen", "engine": "comfyui",
             "params": {"prompt": "x"},
             "outputs": {"out": Kind.text},
             "fossil_field": "creature-flow"},  # the dead key
        ],
    }
    with pytest.raises(flow_mod.FlowError) as e:
        flow_mod.flow_from_body(drifted)
    assert "fossil_field" in str(e.value)


def test_drift_unknown_engine_refuses():
    """The spec renames a stage's engine to a name the plugin
    registry doesn't declare. The Flow constructor runs
    validate_engines (plugin bus) HERE and refuses the unknown
    engine — a drifted engine refuses at construction, not on the
    GPU cycle."""
    drifted = {
        "id": "drift-engine",
        "stages": [
            {"id": "gen", "engine": "no-such-engine-xyz",
             "params": {"prompt": "x"},
             "outputs": {"out": Kind.text}},
        ],
    }
    with pytest.raises(flow_mod.FlowError) as e:
        flow_mod.flow_from_body(drifted)
    assert "no-such-engine-xyz" in str(e.value)


def test_drift_wire_to_nonexistent_stage_refuses():
    """A stage's input names a stage that doesn't exist. The
    typed-edge validation refuses — a wire that names a node that
    isn't in the graph can't be resolved (it would index-align
    against a ghost)."""
    drifted = {
        "id": "drift-wire",
        "stages": [
            {"id": "gen", "engine": "comfyui",
             "params": {"prompt": "x"},
             "expected": {"prompt": Kind.text},
             "outputs": {"out": Kind.text}},
            {"id": "edit", "engine": "comfyui",
             "params": {},
             "inputs": {"prompt": {"stage": "ghost", "output": "out"}},
             "expected": {"prompt": Kind.text},
             "outputs": {"out": Kind.text}},
        ],
    }
    with pytest.raises(flow_mod.FlowError) as e:
        flow_mod.flow_from_body(drifted)
    assert "ghost" in str(e.value)


def test_drift_duplicate_stage_id_refuses():
    """Two stages share an id. The Flow schema's unique-id check
    refuses — the graph can't be index-aligned with duplicates
    (a re-run would round-robin between them and never know which
    one the specBaseline referred to)."""
    drifted = {
        "id": "drift-dup-id",
        "stages": [
            {"id": "s0", "engine": "comfyui",
             "params": {"prompt": "x"},
             "expected": {"prompt": Kind.text},
             "outputs": {"out": Kind.text}},
            {"id": "s0", "engine": "comfyui",
             "params": {"prompt": "y"},
             "expected": {"prompt": Kind.text},
             "outputs": {"out": Kind.text}},
        ],
    }
    with pytest.raises(flow_mod.FlowError) as e:
        flow_mod.flow_from_body(drifted)
    assert "s0" in str(e.value)


# B. happy path: a Flow compiled from a JSON body equals the
# same flow loaded from its module — index-aligned, same stages,
# same edges. The compile door is the SAME validation the run door
# runs; what compiles here is what runs.

def test_compiled_flow_equals_module_flow():
    """The compile door is the run door: a body that compiles
    produces a Flow identical to the module's declaration (same
    stages, same edges, same kinds). The drift wall is symmetric
    with the compile wall — no shape can pass compile and fail
    run."""
    fl = flow_mod.flow_from_body(TWOSTEP)
    assert fl.id == "drift-test"
    assert len(fl.stages) == 2
    assert fl.stages[0].id == "gen"
    assert fl.stages[1].id == "edit"
    # the wire survives compile
    assert fl.stages[1].inputs["prompt"].stage == "gen"

"""The flow declaration layer (py/flow.py + flows/*/) — PYTHON SHAPE
LAW pins: validation AT CONSTRUCTION, structural edges, declarer-wins
loading, and the {flow} door's refusal contract (QUEUE LANE LAW).
No GPU, no network — the schema is the wall. Design record:
docs/queue/flows.md."""

import pytest
from pydantic import ValidationError

import flow as flow_mod
from flow import Flow, Stage, FromInitial, FromStage, validate_engines


# ── registry sweep: every declared flow loads + is sound ──────────

def test_registry_has_the_converted_lanes():
    ids = flow_mod.scan_flow_ids()
    for must in ("audio-native-tts", "kimodo-native", "trellis2-gate"):
        assert must in ids, "converted lane missing: %s" % must


def test_every_flow_loads_and_matches_its_dir():
    assert flow_mod.scan_flow_ids(), "no flows declared"
    for name in flow_mod.scan_flow_ids():
        fl = flow_mod.load_flow(name)
        assert fl.id == name
        assert len(fl.stages) >= 1


def test_converted_flows_keep_their_engine_params():
    """The conversion is FAITHFUL: the comfyui engine surface rides
    verbatim (workflow_file+inject for tts/trellis, inline workflow
    for kimodo) and NO server_url fossil survives (QUEUE LANE LAW:
    the engine's config/env seam owns the endpoint)."""
    tts = flow_mod.load_flow("audio-native-tts")
    (st,) = tts.stages
    assert st.engine == "comfyui"
    assert st.params["inject"] == {"2.prompt": "$prompt", "2.seed": 42}
    assert "server_url" not in st.params
    assert st.params["timeout_s"] == 1200

    trellis = flow_mod.load_flow("trellis2-gate")
    (st,) = trellis.stages
    assert "server_url" not in st.params
    assert st.params["inject"]["CLIPTextEncode.0.text"] == "$prompt"

    kimodo = flow_mod.load_flow("kimodo-native")
    (st,) = kimodo.stages
    assert st.params["workflow"]["2"]["class_type"] == "KimodoTextToPose"


# ── construction refusals (an unbuildable flow cannot be declared) ─

def test_duplicate_stage_ids_refused():
    with pytest.raises(ValueError, match="duplicate stage id"):
        Flow(id="x", stages=(
            Stage(id="a", engine="comfyui"),
            Stage(id="a", engine="comfyui")))


def test_forward_wire_refused():
    with pytest.raises(ValueError, match="EARLIER"):
        Flow(id="x", stages=(
            Stage(id="a", engine="comfyui",
                  inputs={"mesh": FromStage(stage="b", output="glb")}),
            Stage(id="b", engine="comfyui")))


def test_wire_to_missing_stage_refused():
    with pytest.raises(ValueError, match="EARLIER"):
        Flow(id="x", stages=(
            Stage(id="a", engine="comfyui",
                  inputs={"mesh": FromStage(stage="ghost", output="glb")}),))


def test_illegal_stage_id_refused():
    with pytest.raises(ValueError, match="identifier"):
        Stage(id="../etc", engine="comfyui")


def test_unknown_stage_field_refused():
    with pytest.raises(ValueError):
        Stage(id="a", engine="comfyui", no_such_field=1)


def test_engineless_stage_refused():
    with pytest.raises(ValueError):
        Stage(id="a", engine="")


def test_empty_flow_refused():
    with pytest.raises(ValueError):
        Flow(id="x", stages=())


def test_unknown_engine_refused_at_validation():
    fl = Flow(id="x", stages=(Stage(id="a", engine="no-such-engine"),))
    with pytest.raises(flow_mod.FlowError, match="no-such-engine"):
        validate_engines(fl)


# ── edges: structural rows, runtime refs exactly the graph's food ──

def test_edge_refs():
    assert FromInitial(key="prompt").ref() == "__initial__.prompt"
    assert FromStage(stage="forge", output="glb").ref() == "forge.glb"


def test_to_graph_emits_the_executor_contract():
    fl = Flow(
        id="probe", description="d",
        stages=(
            Stage(id="a", engine="comfyui",
                  inputs={"prompt": FromInitial(key="prompt")},
                  expected={"prompt": flow_mod.Kind.text},
                  outputs={"glb": flow_mod.Kind.mesh}),
            Stage(id="b", engine="comfyui",
                  inputs={"mesh": FromStage(stage="a", output="glb")},
                  expected={"mesh": flow_mod.Kind.mesh}),
        ))
    g = fl.to_graph()
    import flow_graph
    assert isinstance(g, flow_graph.FlowGraph)
    a, b = g.nodes
    assert a.input_from == ("__initial__.prompt",)
    assert b.input_from == ("a.glb",)
    assert b.node_type == "comfyui"


# ── the {flow} door (through the gateway's resolver) ───────────────

def test_flow_door_resolves():
    from gateway import resolve_request
    g = resolve_request({"flow": "audio-native-tts"})
    assert g.name == "audio-native-tts"
    assert [n.node_type for n in g.nodes] == ["comfyui"]


def test_flow_door_unknown_refused():
    from gateway import ValidationError, resolve_request
    with pytest.raises(ValidationError, match="no flow at flows/"):
        resolve_request({"flow": "no-such-flow"})


def test_flow_door_traversal_refused():
    from gateway import ValidationError, resolve_request
    with pytest.raises(ValidationError, match="legal identifier"):
        resolve_request({"flow": "../etc"})


def test_yaml_door_is_dead():
    """The yaml text door retired with the parser (NO LEGACY: no
    fallbacks). A body carrying it is a NO-SELECTION refusal now."""
    from gateway import ValidationError, resolve_request
    with pytest.raises(ValidationError, match="flow or model"):
        resolve_request({"yaml": "audio-native-tts"})


def test_runtime_flow_module_loads_and_cleans_up():
    """test_05's pattern: a lane may WRITE a flow module at runtime,
    submit through the door, and remove it — the loader reads disk
    per request, no boot cache to fight."""
    import shutil
    lane = flow_mod.FLOWS_ROOT / "unit-probe-flow"
    lane.mkdir(parents=True, exist_ok=True)
    try:
        (lane / "flow.py").write_text(
            "from flow import Flow, Stage, FromInitial, Kind\n"
            "FLOW = Flow(id='unit-probe-flow', stages=(\n"
            "    Stage(id='only', engine='comfyui',\n"
            "          inputs={'prompt': FromInitial(key='prompt')},\n"
            "          expected={'prompt': Kind.text},\n"
            "          outputs={'png': Kind.image}),))\n",
            encoding="utf-8")
        fl = flow_mod.load_flow("unit-probe-flow")
        assert fl.stages[0].engine == "comfyui"
    finally:
        shutil.rmtree(lane, ignore_errors=True)
    with pytest.raises(flow_mod.FlowError):
        flow_mod.load_flow("unit-probe-flow")


# ── TYPED EDGES — flow-typed-edges.md (2026-09-04) ────────────────
# The pre-compile validation: a wrong-Kind edge refuses at
# Flow(...) construction, not on the GPU. The AI iterates without
# burning a single queue slot.

def test_kind_refuses_image_into_text_at_construction():
    """The main lever: image_gen -> tts refuses loud, the AI swaps
    the upstream stage, no GPU cycle."""
    with pytest.raises((flow_mod.FlowError, ValidationError)) as exc:
        Flow(id="x", stages=(
            Stage(id="gen", engine="comfyui",
                  outputs={"png": flow_mod.Kind.image}),
            Stage(id="tts", engine="comfyui",
                  inputs={"prompt": FromStage(stage="gen", output="png")},
                  expected={"prompt": flow_mod.Kind.text}),
        ))
    msg = str(exc.value)
    assert "expected text" in msg
    assert "got image" in msg
    assert "must be text" in msg
    assert "stage 'tts' input 'prompt'" in msg


def test_kind_refuses_text_into_image_at_construction():
    """Symmetric refusal: text into an image stage."""
    with pytest.raises((flow_mod.FlowError, ValidationError)) as exc:
        Flow(id="x", stages=(
            Stage(id="src", engine="comfyui",
                  outputs={"txt": flow_mod.Kind.text}),
            Stage(id="upscale", engine="comfyui",
                  inputs={"frame": FromStage(stage="src", output="txt")},
                  expected={"frame": flow_mod.Kind.image}),
        ))
    msg = str(exc.value)
    assert "expected image" in msg
    assert "got text" in msg
    assert "must be image" in msg


def test_inputs_expected_mismatch_wired_but_untyped_refused():
    """Every input must have an expected Kind (the AI's first typo
    class: forgetting `expected=` on the receiving stage)."""
    with pytest.raises((flow_mod.FlowError, ValidationError)) as exc:
        Flow(id="x", stages=(
            Stage(id="a", engine="comfyui",
                  outputs={"png": flow_mod.Kind.image}),
            Stage(id="b", engine="comfyui",
                  inputs={"frame": FromStage(stage="a", output="png")}),
                  # no expected=
        ))
    msg = str(exc.value)
    assert "wired but untyped" in msg
    assert "'frame'" in msg


def test_inputs_expected_mismatch_typed_but_unwired_refused():
    """Symmetric: expected without a wire."""
    with pytest.raises((flow_mod.FlowError, ValidationError)) as exc:
        Flow(id="x", stages=(
            Stage(id="b", engine="comfyui",
                  expected={"frame": flow_mod.Kind.image}),
                  # no inputs=
        ))
    msg = str(exc.value)
    assert "typed but unwired" in msg
    assert "'frame'" in msg


def test_engine_default_output_used_when_stage_omits_outputs():
    """A stage with no `outputs` falls back to the engine's
    DEFAULT_OUTPUT. The comfyui default is Kind.image; a stage
    taking that downstream with expected=Kind.image is fine."""
    Flow(id="x", stages=(
        Stage(id="a", engine="comfyui"),  # no outputs — defaults to image
        Stage(id="b", engine="comfyui",
              inputs={"frame": FromStage(stage="a", output="default")},
              expected={"frame": flow_mod.Kind.image}),
    ))  # no exception — the construction succeeds


def test_unknown_upstream_output_name_refused():
    """A FromStage(output='png') on a stage whose outputs are
    {'thumb': Kind.image} refuses loud (typo class)."""
    with pytest.raises((flow_mod.FlowError, ValidationError)) as exc:
        Flow(id="x", stages=(
            Stage(id="a", engine="comfyui",
                  outputs={"thumb": flow_mod.Kind.image}),
            Stage(id="b", engine="comfyui",
                  inputs={"frame": FromStage(stage="a", output="png")},
                  expected={"frame": flow_mod.Kind.image}),
        ))
    msg = str(exc.value)
    assert "no output named 'png'" in msg
    assert "declared outputs: ['thumb']" in msg


def test_kind_is_closed_enum():
    """The Kind vocabulary is closed — a typo at a flow site is a
    construction refusal (PYTHON SHAPE LAW rung 3)."""
    with pytest.raises((ValueError, TypeError)):
        flow_mod.Kind("nope")
    # and the members are exactly the eight
    assert set(flow_mod.Kind.__members__) == {
        "text", "image", "video", "audio", "mesh", "num", "lora", "seg"}


def test_engine_default_output_attribute_is_present():
    """The engine contract (flow-typed-edges.md): every engine
    module exposes DEFAULT_OUTPUT as a Kind member. Refuses at
    validate_engines if it's missing or non-Kind."""
    for etype in ("comfyui", "anycreature", "autoremesher", "kimodo",
                  "audio_cpp", "ffmpeg_concat"):
        import plugins
        mod = plugins.load_engine(etype)
        assert hasattr(mod, "DEFAULT_OUTPUT"), \
            "engine %r missing DEFAULT_OUTPUT" % etype
        assert isinstance(mod.DEFAULT_OUTPUT, flow_mod.Kind), \
            "engine %r DEFAULT_OUTPUT is %r, expected Kind member" % (
                etype, mod.DEFAULT_OUTPUT)

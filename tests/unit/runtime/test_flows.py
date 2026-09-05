"""The flow declaration layer (py/flow.py + flows/*/) — PYTHON SHAPE
LAW pins: validation AT CONSTRUCTION, structural edges, declarer-wins
loading, and the {flow} door's refusal contract (QUEUE LANE LAW).
No GPU, no network — the schema is the wall. Design record:
docs/queue/flows.md."""

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

import flow as flow_mod
from flow import Flow, Stage, FromInitial, FromStage, validate_engines


# ── registry sweep: every declared flow loads + is sound ──────────

def test_registry_has_the_converted_lanes() -> None:
    ids = flow_mod.scan_flow_ids()
    for must in ("audio-native-tts", "kimodo-native"):
        assert must in ids, "converted lane missing: %s" % must


def test_every_flow_loads_and_matches_its_dir() -> None:
    assert flow_mod.scan_flow_ids(), "no flows declared"
    for name in flow_mod.scan_flow_ids():
        fl = flow_mod.load_flow(name)
        assert fl.id == name
        assert len(fl.stages) >= 1


def test_converted_flows_keep_their_engine_params() -> None:
    """The conversion is FAITHFUL: the comfyui engine surface rides
    verbatim (workflow_file+inject for tts, inline workflow for
    kimodo) and NO server_url fossil survives (QUEUE LANE LAW:
    the engine's config/env seam owns the endpoint).

    Trellis retired 2026-09-05: the broken flow
    flows/trellis2-gate/flow.py bypassed the img-to-mesh action
    card with a raw engine call that injected into nodes the live
    native ComfyUI template doesn't have (CLIPTextEncode, KSampler
    — the native template is a pure mesh processor: UnwrapMesh →
    BakeTextureFromVoxel → ApplyTextureToMesh). The card IS the
    trellis lane — {model: "trellis2-native", input_image: ...} —
    not a flow. Verified live: a single run produced
    trellis2_native_00007.glb (24MB) via the model door. The
    estate has 2 flows: audio-native-tts, kimodo-native."""
    tts = flow_mod.load_flow("audio-native-tts")
    (st,) = tts.stages
    assert st.engine == "comfyui"
    assert st.params["inject"] == {"2.prompt": "$prompt", "2.seed": 42}
    assert "server_url" not in st.params
    assert st.params["timeout_s"] == 1200

    kimodo = flow_mod.load_flow("kimodo-native")
    (st,) = kimodo.stages
    assert st.params["workflow"]["2"]["class_type"] == "KimodoTextToPose"


# ── construction refusals (an unbuildable flow cannot be declared) ─

def test_duplicate_stage_ids_refused() -> None:
    with pytest.raises(ValueError, match="duplicate stage id"):
        Flow(id="x", stages=(
            Stage(id="a", engine="comfyui"),
            Stage(id="a", engine="comfyui")))


def test_forward_wire_refused() -> None:
    with pytest.raises(ValueError, match="EARLIER"):
        Flow(id="x", stages=(
            Stage(id="a", engine="comfyui",
                  inputs={"mesh": FromStage(stage="b", output="glb")}),
            Stage(id="b", engine="comfyui")))


def test_wire_to_missing_stage_refused() -> None:
    with pytest.raises(ValueError, match="EARLIER"):
        Flow(id="x", stages=(
            Stage(id="a", engine="comfyui",
                  inputs={"mesh": FromStage(stage="ghost", output="glb")}),))


def test_illegal_stage_id_refused() -> None:
    with pytest.raises(ValueError, match="identifier"):
        Stage(id="../etc", engine="comfyui")


def test_unknown_stage_field_refused() -> None:
    with pytest.raises(ValueError):
        Stage(id="a", engine="comfyui", no_such_field=1)


def test_engineless_stage_refused() -> None:
    with pytest.raises(ValueError):
        Stage(id="a", engine="")


def test_empty_flow_refused() -> None:
    with pytest.raises(ValueError):
        Flow(id="x", stages=())


def test_unknown_engine_refused_at_validation() -> None:
    fl = Flow(id="x", stages=(Stage(id="a", engine="no-such-engine"),))
    with pytest.raises(flow_mod.FlowError, match="no-such-engine"):
        validate_engines(fl)


# ── edges: structural rows, runtime refs exactly the graph's food ──

def test_edge_refs() -> None:
    assert FromInitial(key="prompt").ref() == "__initial__.prompt"
    assert FromStage(stage="forge", output="glb").ref() == "forge.glb"


def test_to_graph_emits_the_executor_contract() -> None:
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

def test_flow_door_resolves() -> None:
    from gateway import resolve_request
    g = resolve_request({"flow": "audio-native-tts"})
    assert g.name == "audio-native-tts"
    assert [n.node_type for n in g.nodes] == ["comfyui"]


def test_flow_door_unknown_refused() -> None:
    from gateway import ValidationError, resolve_request
    with pytest.raises(ValidationError, match="no flow at flows/"):
        resolve_request({"flow": "no-such-flow"})


def test_flow_door_traversal_refused() -> None:
    from gateway import ValidationError, resolve_request
    with pytest.raises(ValidationError, match="legal identifier"):
        resolve_request({"flow": "../etc"})


def test_yaml_door_is_dead() -> None:
    """The yaml text door retired with the parser (NO LEGACY: no
    fallbacks). A body carrying it is a NO-SELECTION refusal now."""
    from gateway import ValidationError, resolve_request
    with pytest.raises(ValidationError, match="no flow selected"):
        resolve_request({"yaml": "audio-native-tts"})


def test_runtime_flow_module_loads_and_cleans_up() -> None:
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

def test_kind_refuses_image_into_text_at_construction() -> None:
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


def test_kind_refuses_text_into_image_at_construction() -> None:
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


def test_inputs_expected_mismatch_wired_but_untyped_refused() -> None:
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


def test_inputs_expected_mismatch_typed_but_unwired_refused() -> None:
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


def test_engine_default_output_used_when_stage_omits_outputs() -> None:
    """A stage with no `outputs` falls back to the engine's
    DEFAULT_OUTPUT. The comfyui default is Kind.image; a stage
    taking that downstream with expected=Kind.image is fine."""
    Flow(id="x", stages=(
        Stage(id="a", engine="comfyui"),  # no outputs — defaults to image
        Stage(id="b", engine="comfyui",
              inputs={"frame": FromStage(stage="a", output="default")},
              expected={"frame": flow_mod.Kind.image}),
    ))  # no exception — the construction succeeds


def test_unknown_upstream_output_name_refused() -> None:
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


def test_kind_is_closed_enum() -> None:
    """The Kind vocabulary is closed — a typo at a flow site is a
    construction refusal (PYTHON SHAPE LAW rung 3)."""
    with pytest.raises((ValueError, TypeError)):
        flow_mod.Kind("nope")
    # and the members are exactly the eight
    assert set(flow_mod.Kind.__members__) == {
        "text", "image", "video", "audio", "mesh", "num", "lora", "seg"}


def test_engine_default_output_attribute_is_present() -> None:
    """The engine contract (flow-typed-edges.md): every engine
    module exposes DEFAULT_OUTPUT as a Kind member. Refuses at
    validate_engines if it's missing or non-Kind."""
    for etype in ("comfyui", "anycreature", "autoremesher", "kimodo",
                  "audio_cpp"):
        # ffmpeg_concat retired 2026-09-04 (concat rides comfyui's
        # VHS / melite-audio-nodes); see audit round 8.
        import plugins
        mod = plugins.load_engine(etype)
        assert hasattr(mod, "DEFAULT_OUTPUT"), \
            "engine %r missing DEFAULT_OUTPUT" % etype
        assert isinstance(mod.DEFAULT_OUTPUT, flow_mod.Kind), \
            "engine %r DEFAULT_OUTPUT is %r, expected Kind member" % (
                etype, mod.DEFAULT_OUTPUT)


def test_to_graph_stamps_typed_outputs_into_noderow() -> None:
    """Gap #2: the flow-typed-edges contract is visible PAST
    construction — the NodeRow carries the resolved outputs so
    the sidecar / MCP introspection / editor graph view see the
    typed chain. Explicit outputs win; engine DEFAULT_OUTPUT fills
    the unnamed 'default' channel when the stage omits outputs."""
    fl = Flow(
        id="kind-stamp-probe",
        stages=(
            # explicit outputs
            Stage(id="img2mesh", engine="comfyui",
                  inputs={"prompt": FromInitial(key="prompt")},
                  expected={"prompt": flow_mod.Kind.text},
                  outputs={"glb": flow_mod.Kind.mesh}),
            # omitted outputs — engine DEFAULT_OUTPUT (comfyui → image)
            # fills the unnamed "default" channel
            Stage(id="upscale", engine="comfyui",
                  inputs={"frame": FromStage(stage="img2mesh", output="glb")},
                  expected={"frame": flow_mod.Kind.mesh}),
        ))
    g = fl.to_graph()
    img2mesh, upscale = g.nodes
    assert img2mesh.outputs == {"glb": "mesh"}, \
        "explicit outputs must stamp: %r" % img2mesh.outputs
    # comfyui engine default = Kind.image → "default": "image"
    assert upscale.outputs == {"default": "image"}, \
        "engine DEFAULT_OUTPUT must fill 'default': %r" % upscale.outputs


def test_to_graph_stamps_default_output_for_audio_engine() -> None:
    """Same lever for audio_cpp — Stage omits outputs, engine default
    fills the 'default' channel with Kind.audio."""
    fl = Flow(
        id="audio-default-probe",
        stages=(
            Stage(id="tts", engine="audio_cpp",
                  inputs={"text": FromInitial(key="text")},
                  expected={"text": flow_mod.Kind.text}),
        ))
    g = fl.to_graph()
    (tts,) = g.nodes
    assert tts.outputs == {"default": "audio"}, \
        "audio_cpp default must be audio: %r" % tts.outputs


# ── live door: the operator's "iterates without GPU" promise, pinned ──

@pytest.fixture
def live_gateway_url() -> str:
    """Skip if the operator gateway is not up — the live door
    test is for environments where the live restart dance has run.
    CI runs this wall only when the operator gateway is up."""
    import os
    url = os.environ.get("GATEWAY_URL", "http://127.0.0.1:33081")
    import urllib.request, urllib.error
    try:
        with urllib.request.urlopen(url + "/v1/queue", timeout=2) as r:
            assert r.status == 200
    except (urllib.error.URLError, OSError, AssertionError):
        pytest.skip("operator gateway not up at %s" % url)
    return url


def test_live_door_refuses_wrong_kind_with_4xx(live_gateway_url: str, tmp_path: Path) -> None:
    """Gap #1 (the operator's lever, pinned end-to-end):
    POST a flow that wires an image stage into a text stage. The
    live {flow} door must return 4xx, name BOTH kinds, and
    register NO run (no sidecar, no GPU claim)."""
    import urllib.request, urllib.error
    import shutil
    probe_dir = flow_mod.FLOWS_ROOT / "_gap1_probe"
    try:
        probe_dir.mkdir(parents=True, exist_ok=True)
        (probe_dir / "flow.py").write_text(
            "from flow import Flow, Stage, FromStage, Kind\n"
            "FLOW = Flow(id='_gap1_probe', stages=(\n"
            "    Stage(id='gen', engine='comfyui',\n"
            "          outputs={'png': Kind.image}),\n"
            "    Stage(id='tts', engine='comfyui',\n"
            "          inputs={'prompt': FromStage(stage='gen', output='png')},\n"
            "          expected={'prompt': Kind.text}),\n"
            "))\n",
            encoding="utf-8")
        # probe: assert no run is in the queue BEFORE our POST
        with urllib.request.urlopen(live_gateway_url + "/v1/queue",
                                    timeout=3) as r:
            before = json.loads(r.read().decode())
        before_ids = set(before.get("queued_ids", []) or [])
        with urllib.request.urlopen(live_gateway_url + "/v1/queue",
                                    timeout=3) as r:
            before_running = json.loads(r.read().decode())["running"]
        # POST the broken flow
        body = json.dumps({"flow": "_gap1_probe"}).encode()
        req = urllib.request.Request(
            live_gateway_url + "/v1/flows/start",
            data=body, headers={"Content-Type": "application/json"})
        try:
            urllib.request.urlopen(req, timeout=5)
            raised = None
        except urllib.error.HTTPError as e:
            raised = e
        # must be 4xx (not 5xx, not 200)
        assert raised is not None, "broken flow must 4xx; it accepted"
        assert 400 <= raised.code < 500, \
            "expected 4xx, got %d" % raised.code
        err = json.loads(raised.read().decode())["error"]
        assert "expected text" in err, "must name the expected kind: %r" % err
        assert "got image" in err, "must name the got kind: %r" % err
        assert "_gap1_probe" in err, "must name the flow id: %r" % err
        # NO run was registered — the queue is unchanged
        with urllib.request.urlopen(live_gateway_url + "/v1/queue",
                                    timeout=3) as r:
            after = json.loads(r.read().decode())
        assert after.get("running") == before_running, \
            "broken flow must not claim a run: %r" % after
        after_ids = set(after.get("queued_ids", []) or [])
        assert after_ids == before_ids, \
            "broken flow must not enqueue: before=%r after=%r" % (
                before_ids, after_ids)
    finally:
        shutil.rmtree(probe_dir, ignore_errors=True)


# ── unused Kinds earn their place in the closed vocabulary ──────────
# Gap #3: num, lora, seg were declared but no real flow used them.
# These pins exercise each in a real flow shape so the AI can copy.

def test_kind_num_for_seed_or_cfg_between_stages() -> None:
    """`num` is the inter-stage scalar channel: a stage produces a
    number (e.g. an image-to-prompt embedding stage that returns a
    seed), the next stage consumes it. The kind system refuses
    the wrong scalar the same way it refuses wrong media types."""
    Flow(id="num-probe", stages=(
        Stage(id="seedgen", engine="comfyui",
              outputs={"seed": flow_mod.Kind.num}),
        Stage(id="sample", engine="comfyui",
              inputs={"seed_in": FromStage(stage="seedgen", output="seed")},
              expected={"seed_in": flow_mod.Kind.num}),
    ))  # no exception
    # and a wrong-num refusal (num into text) refuses loud
    with pytest.raises((flow_mod.FlowError, ValidationError)) as exc:
        Flow(id="num-probe", stages=(
            Stage(id="seedgen", engine="comfyui",
                  outputs={"seed": flow_mod.Kind.num}),
            Stage(id="tts", engine="comfyui",
                  inputs={"prompt": FromStage(stage="seedgen", output="seed")},
                  expected={"prompt": flow_mod.Kind.text}),
        ))
    assert "expected text" in str(exc.value)
    assert "got num" in str(exc.value)


def test_kind_lora_for_lora_conditioned_image_stages() -> None:
    """`lora` is the LoRA-set channel: a stage produces a lora
    selection (the comfyui LoRA loader's output), the next stage
    consumes it as a weight conditioner. The shape is symmetric
    with media kinds — same construction-time refusal."""
    Flow(id="lora-probe", stages=(
        Stage(id="lorapick", engine="comfyui",
              outputs={"lora_set": flow_mod.Kind.lora}),
        Stage(id="img", engine="comfyui",
              inputs={"lora_in": FromStage(stage="lorapick", output="lora_set")},
              expected={"lora_in": flow_mod.Kind.lora}),
    ))  # no exception
    # image output cannot masquerade as a lora set
    with pytest.raises((flow_mod.FlowError, ValidationError)) as exc:
        Flow(id="lora-probe", stages=(
            Stage(id="img", engine="comfyui",
                  outputs={"png": flow_mod.Kind.image}),
            Stage(id="with_lora", engine="comfyui",
                  inputs={"lora_in": FromStage(stage="img", output="png")},
                  expected={"lora_in": flow_mod.Kind.lora}),
        ))
    assert "expected lora" in str(exc.value)
    assert "got image" in str(exc.value)


def test_kind_seg_for_mask_driven_inpaint_stages() -> None:
    """`seg` is the segmentation/mask channel: a detect stage
    produces a mask, an inpaint stage consumes it (the comfyui
    image-edit card's SAM3-driven flow is the live target)."""
    Flow(id="seg-probe", stages=(
        Stage(id="detect", engine="comfyui",
              outputs={"mask": flow_mod.Kind.seg}),
        Stage(id="inpaint", engine="comfyui",
              inputs={"mask_in": FromStage(stage="detect", output="mask")},
              expected={"mask_in": flow_mod.Kind.seg}),
    ))  # no exception
    # image output cannot masquerade as a seg
    with pytest.raises((flow_mod.FlowError, ValidationError)) as exc:
        Flow(id="seg-probe", stages=(
            Stage(id="img", engine="comfyui",
                  outputs={"png": flow_mod.Kind.image}),
            Stage(id="inpaint", engine="comfyui",
                  inputs={"mask_in": FromStage(stage="img", output="png")},
                  expected={"mask_in": flow_mod.Kind.seg}),
        ))
    assert "expected seg" in str(exc.value)
    assert "got image" in str(exc.value)

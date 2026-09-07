"""ROW 4 wall (2026-09-07): image-upscale is THE first two-card
flow — make (card="image-gen") → polish (card="upscale-tools"), the
artifact handoff riding a typed FromStage edge. This suite pins the
conversion's three laws:

  1. CONSTRUCTION: the flow names CARDS, never nodes — both stages
     carry card= + requires_model rows, the edge is kind-checked,
     and the effective expected (the registry kind_inputs fill)
     reaches the executor's NodeRow so FILE-kind absolutization
     sees the artifact slot.

  2. THE DOC SPELL SEAM: a card doc value may be a $spell naming a
     WIRED INPUT ("$image"). The per-stage path expands it at the
     card bridge from the resolved inputs; the merged path lets it
     survive (the pool carries initials only) and plan_merge
     rewrites it to the upstream producer link IN-GRAPH. The arm's
     phase-1 never isfile-checks the runtime's vocabulary.

  3. ONE SUBMIT: both bridged stages merge into ONE graph with both
     Save producers bound — the two-card flow's normal path.

Design record: docs/design/row4-executor-tts-lane.md §image-upscale.
"""

from __future__ import annotations

import copy
import json

import pytest

import flow as flow_mod
import gateway
import stage_params
from flow import Flow, FlowToolOverlay, FromInitial, FromStage, Kind, Stage


def _load():
    return flow_mod.load_flow("image-upscale")


# ── 1. construction ─────────────────────────────────────────────────

def test_both_stages_are_card_stages() -> None:
    fl = _load()
    (make, polish) = fl.stages
    assert make.card == "image-gen"
    assert polish.card == "upscale-tools"
    assert make.engine == polish.engine == "comfyui"
    # no stage carries a workflow — a card= flow never names nodes
    for st in (make, polish):
        assert not (st.params.get("workflow")
                    or st.params.get("workflow_file"))


def test_the_edge_is_typed_and_filereachable() -> None:
    g = _load().to_graph()
    (make, polish) = g.nodes
    # the handoff: make.image → polish.image, Kind.image both sides
    assert make.outputs == {"image": "image"}
    assert polish.input_names == {"image": "make.image"}
    # the EFFECTIVE expected (registry kind_inputs fill) reaches
    # the row — without it FILE-kind absolutization is blind on a
    # card= stage and the artifact ref never resolves to disk
    assert polish.expected == {"image": "image"}
    assert make.expected == {"prompt": "text"}


def test_upscale_input_name_is_the_registry_key() -> None:
    # the wired input NAME must match the card's kind_inputs key —
    # the "input_image" doc key is the ARM's knob, not the wire
    row = stage_params.REGISTRY.get("upscale-tools")
    fl = _load()
    (polish,) = [s for s in fl.stages if s.id == "polish"]
    assert set(polish.inputs) == set(row.kind_inputs)


def test_requires_model_refused_both_stages() -> None:
    with pytest.raises(Exception, match="requires params.model"):
        Flow(id="no-make-model", stages=(
            Stage(id="m", engine="comfyui", card="image-gen",
                  inputs={"prompt": FromInitial(key="prompt")},
                  params={"prompt": "$prompt"}),))
    with pytest.raises(Exception, match="requires params.model"):
        Flow(id="no-polish-model", stages=(
            Stage(id="g", engine="comfyui", card="image-gen",
                  inputs={"prompt": FromInitial(key="prompt")},
                  params={"model": "krea-2", "prompt": "$prompt"}),
            Stage(id="p", engine="comfyui", card="upscale-tools",
                  inputs={"image": FromStage(stage="g", output="image")},
                  params={"input_image": "$image",
                          "filename_prefix": "x"}),))


def test_registry_rows_mark_requires_model() -> None:
    for card in ("image-gen", "upscale-tools"):
        row = stage_params.REGISTRY.get(card)
        assert row is not None and row.requires_model is True, card


# ── 2. the doc spell seam ───────────────────────────────────────────

def test_expand_doc_spells_resolves_wired_names() -> None:
    out = gateway._expand_doc_spells(
        {"input_image": "$image", "note": "a $100 bill stays",
         "model": "seedvr2_ema"},
        {"image": "/abs/run/make.png"})
    assert out["input_image"] == "/abs/run/make.png"
    # unknown $-strings ride untouched (the "$100 bill" law — the
    # arm's own guards refuse what stays unresolved)
    assert out["note"] == "a $100 bill stays"
    assert out["model"] == "seedvr2_ema"


def test_bridge_expands_spells_from_stage_inputs(tmp_path) -> None:
    # the per-stage path: the resolved inputs publish the artifact
    # path under the wire name — the bridge substitutes BEFORE the
    # arm composes (an arm with a file-existence gate must see the
    # resolved value, never the spell)
    img = tmp_path / "make.png"
    img.write_bytes(b"\x89PNG\r\n\x1a\n")
    g = _load().to_graph()
    polish = [n for n in g.nodes if n.node_id == "polish"][0]
    out = gateway._card_bridge(
        polish, copy.deepcopy(dict(polish.params)), "probe-run",
        inputs={"image": str(img)})
    wf = json.dumps(out["workflow"])
    assert "$image" not in wf
    assert str(img) in wf


def test_bridge_leaves_spells_the_pool_cannot_name() -> None:
    # the merged path: the pool carries initials only — a FromStage
    # spell SURVIVES the bridge (there is no file yet; the input
    # becomes an in-graph link) and plan_merge rewrites it later
    g = _load().to_graph()
    polish = [n for n in g.nodes if n.node_id == "polish"][0]
    out = gateway._card_bridge(
        polish, copy.deepcopy(dict(polish.params)), "probe-run",
        inputs={"prompt": "a fox"})
    assert "$image" in json.dumps(out["workflow"])


def test_arm_phase1_tolerates_the_spell() -> None:
    # phase-1 (run_id="") validates SHAPE, never isfile-checks the
    # runtime's $-vocabulary — the validation door stays open for
    # flow construction (the kind gate owns the wire). Probed at
    # the plugin bus directly: phase-1 returns the input pool, no
    # graph, no refusal.
    import plugins as _plugins
    graph, extra = _plugins.compose(
        {"params": {"input_image": "$image", "seed": 42}},
        "seedvr2_ema", "", None, ["comfyui"])
    assert graph is None
    assert "input_image" in (extra or {}).get("inputs", {})


def test_arm_phase1_still_refuses_nonspell_garbage() -> None:
    import plugins as _plugins
    with pytest.raises(Exception, match="not a file on this estate"):
        _plugins.compose(
            {"params": {"input_image": "/no/such/file.png",
                        "seed": 42}},
            "seedvr2_ema", "", None, ["comfyui"])


# ── 3. the path this flow takes ─────────────────────────────────────

def _merged_rows(pool):
    g = _load().to_graph()
    rows = []
    for n in g.nodes:
        params = dict(n.params or {})
        if n.card:
            params = gateway._card_bridge(n, params, "probe",
                                          inputs=pool)
        eng = gateway.load_engine(n.node_type)
        rows.append({"stage_id": n.node_id,
                     "workflow": eng.stage_workflow(params),
                     "input_names": dict(n.input_names),
                     "outputs": dict(n.outputs),
                     "output_nodes": params.get("output_nodes") or {},
                     "params": params})
    return eng, rows


def test_plan_refuses_link_in_file_slot() -> None:
    # LIVE-PROBED (run-c97e67b10fb8): the upscale arm renders its
    # wired input through LoadImage — a producer link cannot land in
    # a FILE slot (the server refused the mangled filename at POST
    # /prompt, past the fallback point). The plan gate refuses
    # BEFORE any submit, naming the loader; the gateway falls back
    # per-stage, where the disk handoff (artifact → $image
    # substitution at the bridge) completes the flow.
    eng, rows = _merged_rows({"prompt": "a fox"})
    with pytest.raises(Exception, match="file slot"):
        eng.plan_merge(rows, {"prompt": "a fox"})


def test_gateway_probe_falls_back_before_running() -> None:
    # _try_merged's own plan dry-run: the refusal must surface HERE
    # (return False → the per-stage loop owns the run), never at
    # execute_flow's POST /prompt where stages are already marked
    # running (the run-c97e67b10fb8 class)
    import inspect
    src = inspect.getsource(gateway.Gateway._try_merged)
    assert "plan_merge" in src, \
        "the merged probe must dry-run the plan before committing"


def test_overlay_paths_speak_the_card_doc() -> None:
    fl = _load()
    assert fl.tool is not None
    paths = {(o.stage, o.param): tuple(o.path) for o in fl.tool.overlays}
    assert paths[("make", "image_model")] == ("model",)
    assert paths[("make", "seed")] == ("seed",)
    assert paths[("polish", "seed")] == ("seed",)
    # a workflow-path overlay on a card stage is a dead shape: the
    # gate refuses at the lever's own door (compile) — before it,
    # the stamp landed silently as a doc key the schema forbids
    bad = fl.model_copy(update={"tool": fl.tool.model_copy(
        update={"overlays": fl.tool.overlays + (
            FlowToolOverlay(param="image_model", stage="make",
                            path=("workflow",)),)})})
    with pytest.raises(Exception,
                       match="speaks the CARD DOC"):
        bad.compile({"flow": "image-upscale", "prompt": "x",
                     "image_model": "krea-2"})

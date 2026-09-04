"""RUN WIRE WALL — validation on the reconstruction family
(operator order, 2026-09-05, verbatim: "This is an issue clearly that
occurs because you aren't testing the reconstruction stuff with
pydantic, there is no validation on workflow outputs or
reconstructions" / "Everything is extensively tested in our
repository, that is the goal. This whole flow is a complete and total
blindspot").

Scope: every reconstruction the runs / flows / drafts doors serve —
GET /v1/flows/runs rows, the flow-doc detail, the flow list, the
drafts index — is CONSTRUCTED as a frozen pydantic row (py/
run_wire.py) and every served payload round-trips through the same
models. The wall pins:

  * every LIVE estate flow doc parses and builds FlowDetailEnvelope
    (the `>-` block-scalar indicator leak on creature-flow/prop-flow,
    shipped for weeks by the C-parity string surgery, cannot return);
  * shape refusals happen AT CONSTRUCTION (PYTHON SHAPE LAW: a bad
    status, a negative epoch, an unlisted artifact type, an extra key
    — all unbuildable);
  * drifted sources degrade LOUDLY: a bad run sidecar or draft doc
    skips its row with a logged reason and the listing continues
    (RESILIENCE LAW), never ships garbage;
  * the studio's consumption contract survives: steps carry
    family/service/title/params, artifacts carry url under the
    /v1/assets/runs prefix (Phase 2 consolidation).

No GPU, no network. Fixture trees under tmp_path; live estate flow
docs read from flows/."""

import json
import sys
from pathlib import Path

import pytest
import yaml as pyyaml

from _anchor import REPO  # noqa: E402

sys.path.insert(0, str(REPO / "py"))

import editor_runs  # noqa: E402
import run_wire  # noqa: E402


# ── fixtures ───────────────────────────────────────────────────────

FLOW_DOC = """\
name: fixture-flow
api: true
description: >-
  A folded block-scalar description spanning
  multiple lines — the string-surgery era shipped the block
  indicator here instead of this text.
steps:
  - id: concept
    type: image-gen
    description: Generate a concept
  - id: mesh
    type: pixal3d_native
    params:
      - {name: preset, value: creature}
  - id: views
"""


@pytest.fixture()
def flow_tree(tmp_path):
    root = tmp_path / "flows"
    (root / "fixture-flow").mkdir(parents=True)
    (root / "fixture-flow" / "flow.yaml").write_text(FLOW_DOC, encoding="utf-8")
    return root


def _run_dir(state, run_id, sidecar, media=None):
    d = state / "output" / run_id
    d.mkdir(parents=True)
    if sidecar is not None:              # None = legacy dir, no sidecar
        (d / "_flow.json").write_text(json.dumps(sidecar), encoding="utf-8")
    for m in media or []:
        (d / m).write_bytes(b"x" * 16)
    return d


GOOD_SIDECAR = {
    "model": "krea-2", "status": "completed", "created_at": 1788563119,
    "prompt": "a test", "seed": 42, "draft_id": "",
}


@pytest.fixture()
def state_tree(tmp_path):
    root = tmp_path / "state"
    root.mkdir()
    (root / "drafts").mkdir()
    return root


# ── A. every live estate flow doc reconstructs ─────────────────────

def test_every_estate_flow_doc_builds():
    flows_root = REPO / "flows"
    names = [p.parent.name for p in sorted(flows_root.glob("*/flow.yaml"))]
    assert len(names) >= 3
    for name in names:
        code, body = editor_runs.yaml_detail(str(flows_root), name)
        assert code == 200, (name, body)
        env = run_wire.FlowDetailEnvelope.model_validate(body)
        assert env.name == name
        assert len(env.nodes) >= 1 and len(env.steps) == len(env.nodes)


def test_block_scalar_indicator_leak_is_dead(flow_tree):
    """The regression that opened this wall: creature-flow and
    prop-flow served description: ">-" because the reconstruction was
    read-to-newline string surgery over the yaml TEXT."""
    code, body = editor_runs.yaml_detail(str(flow_tree), "fixture-flow")
    assert code == 200
    env = run_wire.FlowDetailEnvelope.model_validate(body)
    assert env.description.startswith("A folded block-scalar")
    assert ">-" not in env.description


def test_step_wire_shape_is_the_studio_contract(flow_tree):
    code, body = editor_runs.yaml_detail(str(flow_tree), "fixture-flow")
    env = run_wire.FlowDetailEnvelope.model_validate(body)
    fams = [(s.family, s.service, s.title) for s in env.steps]
    assert fams == [("image-gen", "image-gen", "concept"),
                    ("pixal3d_native", "pixal3d_native", "mesh"),
                    ("node", "node", "views")]
    assert env.steps[1].params == [{"name": "preset", "value": "creature"}]


def test_unparseable_flow_refuses_loudly(flow_tree):
    bad = flow_tree / "fixture-flow" / "flow.yaml"
    bad.write_text("description: [unclosed\n  bad: {", encoding="utf-8")
    code, body = editor_runs.yaml_detail(str(flow_tree), "fixture-flow")
    assert code == 400 and "does not parse" in body["error"]


def test_non_mapping_flow_refuses(flow_tree):
    (flow_tree / "fixture-flow" / "flow.yaml").write_text("- a\n- b\n")
    code, body = editor_runs.yaml_detail(str(flow_tree), "fixture-flow")
    assert code == 400 and "not a mapping" in body["error"]


def test_step_without_string_id_refuses(flow_tree):
    (flow_tree / "fixture-flow" / "flow.yaml").write_text(
        "steps:\n  - type: image-gen\n")
    code, body = editor_runs.yaml_detail(str(flow_tree), "fixture-flow")
    assert code == 400 and "string id" in body["error"]


# ── B. shape refusals happen AT CONSTRUCTION ───────────────────────

def _row(**over):
    base = dict(
        run_id="run-abc123-def456", name="krea-2", flow="krea-2",
        status="completed", created_at=1788563119, prompt="", seed=1,
        thumbnail="", artifacts=[], params={"seed": 1}, draft_id="")
    base.update(over)
    return base


def test_run_row_refuses_unknown_status():
    with pytest.raises(run_wire.ValidationError):
        run_wire.RunRow.model_validate(_row(status="runnng"))


def test_run_row_refuses_negative_epoch():
    with pytest.raises(run_wire.ValidationError):
        run_wire.RunRow.model_validate(_row(created_at=-1))


def test_run_row_refuses_non_run_id():
    with pytest.raises(run_wire.ValidationError):
        run_wire.RunRow.model_validate(_row(run_id="../../etc/passwd"))


def test_run_row_refuses_extra_keys():
    with pytest.raises(run_wire.ValidationError):
        run_wire.RunRow.model_validate(_row(surprise=1))


def test_run_row_refuses_unlisted_artifact_type():
    with pytest.raises(run_wire.ValidationError):
        run_wire.RunRow.model_validate(_row(artifacts=[
            {"name": "a.obj", "path": "./x", "bytes": 1,
             "url": "/v1/assets/runs/r/a.obj", "type": "mesh", "size": 1}]))


def test_run_row_closed_status_vocab_is_complete():
    served = {"running", "completed", "failed", "stopped", "success",
              "unknown"}
    assert served == {s.value for s in run_wire.RunStatus}


# ── C. drifted sources degrade LOUDLY, listing continues ───────────

def test_runs_listing_round_trips_and_serves_artifact_rows(state_tree):
    _run_dir(state_tree, "run-good0001-cafe", GOOD_SIDECAR,
             media=["SaveImage.0_gen_00001_.png"])
    out = editor_runs.runs(str(state_tree), limit=50)
    env = run_wire.RunsEnvelope.model_validate(out)
    assert env.count == 1 and len(env.runs) == 1
    row = env.runs[0]
    assert row.run_id == "run-good0001-cafe"
    assert isinstance(row.created_at, int)
    art = row.artifacts[0]
    assert isinstance(art, run_wire.ArtifactRow)
    assert art.url.startswith("/v1/assets/runs/run-good0001-cafe/")
    assert art.type == "image"


def test_c_epoch_created_key_still_reads(state_tree):
    """The C-era `created` fallback is contract (2026-09-04 live bug:
    py runs read epoch 0 and buried fresh generations)."""
    _run_dir(state_tree, "run-old000001-beef",
             {"model": "krea-2", "status": "completed", "created": 100},
             media=["SaveImage.0_gen_00001_.png"])
    env = run_wire.RunsEnvelope.model_validate(
        editor_runs.runs(str(state_tree)))
    assert env.runs[0].created_at == 100


def test_legacy_dir_without_sidecar_reads_success(state_tree):
    _run_dir(state_tree, "run-leg000001-face", None, media=["out.png"])
    env = run_wire.RunsEnvelope.model_validate(
        editor_runs.runs(str(state_tree)))
    assert env.runs[0].status is run_wire.RunStatus.SUCCESS


def test_sidecar_without_status_reads_unknown(state_tree):
    _run_dir(state_tree, "run-unst000001-aaaa", {"model": "krea-2"})
    env = run_wire.RunsEnvelope.model_validate(
        editor_runs.runs(str(state_tree)))
    assert env.runs[0].status is run_wire.RunStatus.UNKNOWN


def test_zombie_running_sidecar_reads_failed(state_tree):
    _run_dir(state_tree, "run-zmb000001-bbbb",
             {"model": "krea-2", "status": "running", "created_at": 5})
    env = run_wire.RunsEnvelope.model_validate(
        editor_runs.runs(str(state_tree)))
    assert env.runs[0].status is run_wire.RunStatus.FAILED


# ── D. flow list + drafts index ────────────────────────────────────

def test_flow_list_serves_gated_docs_only(flow_tree):
    (flow_tree / "not-api").mkdir()
    (flow_tree / "not-api" / "flow.yaml").write_text("name: not-api\n")
    out = editor_runs.yaml_list(str(flow_tree))
    env = run_wire.FlowListEnvelope.model_validate(out)
    assert [f.name for f in env.flows] == ["fixture-flow"]
    assert env.flows[0].filename == "fixture-flow.yaml"


def test_drafts_index_round_trips_with_fallback_fields(state_tree):
    dr = state_tree / "drafts"
    (dr / "draft-11111111-a.json").write_text(
        json.dumps({"model": "krea-2", "name": " titled "}), encoding="utf-8")
    (dr / "draft-22222222-b.json").write_text(
        json.dumps({"intent": "an intent", "title": "a title"}),
        encoding="utf-8")
    env = run_wire.DraftsEnvelope.model_validate(
        editor_runs.drafts_list(str(dr)))
    by_id = {d.draft_id: d for d in env.drafts}
    assert by_id["draft-11111111-a"].name == " titled "
    assert by_id["draft-22222222-b"].name == "an intent"
    assert by_id["draft-22222222-b"].model == ""


def test_drafts_index_skips_non_json_and_short_names(state_tree):
    dr = state_tree / "drafts"
    (dr / "notes.txt").write_text("x")       # not .json
    (dr / ".json").write_text("{}")          # 5 chars: under the L<6 gate
    env = run_wire.DraftsEnvelope.model_validate(
        editor_runs.drafts_list(str(dr)))
    assert env.count == 0


# ── E. live estate state (present) round-trips ─────────────────────

def test_live_runs_state_round_trips():
    state = REPO / "data" / "runs"
    if not (state / "output").is_dir():
        pytest.skip("no local run state on this machine")
    env = run_wire.RunsEnvelope.model_validate(
        editor_runs.runs(str(state), limit=200))
    assert env.count >= 1
    for row in env.runs:
        assert isinstance(row.status, run_wire.RunStatus)


# ── F. no string surgery on flow docs (structure pin) ──────────────

def test_no_yaml_text_surgery_survives():
    """The reconstruction parses flow docs with a real YAML load; the
    find()-and-slice era must stay dead. `description:` must never be
    located by text scan in this module."""
    src = (REPO / "py" / "editor_runs.py").read_text(encoding="utf-8")
    assert "find(\"description:\")" not in src
    assert "_yaml_step_spans" not in src


def test_flow_docs_are_pure_yaml_documents():
    """Estate flow.yaml files parse as mappings under a REAL yaml load —
    the run_wire gate's input contract."""
    for p in sorted((REPO / "flows").glob("*/flow.yaml")):
        doc = pyyaml.safe_load(p.read_text(encoding="utf-8"))
        assert isinstance(doc, dict), p
        assert isinstance(doc.get("steps"), list), p

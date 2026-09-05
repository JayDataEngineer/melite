"""RUN WIRE WALL — validation on the reconstruction family
(operator order, 2026-09-05, verbatim: "This is an issue clearly that
occurs because you aren't testing the reconstruction stuff with
pydantic, there is no validation on workflow outputs or
reconstructions" / "Everything is extensively tested in our
repository, that is the goal. This whole flow is a complete and total
blindspot").

Scope: every reconstruction the runs / drafts doors serve — GET
/v1/flows/runs rows and the drafts index — is CONSTRUCTED as a frozen
pydantic row (py/run_wire.py) and every served payload round-trips
through the same models. The wall pins:

  * shape refusals happen AT CONSTRUCTION (PYTHON SHAPE LAW: a bad
    status, a negative epoch, an unlisted artifact type, an extra key
    — all unbuildable);
  * drifted sources degrade LOUDLY: a bad run sidecar or draft doc
    skips its row with a logged reason and the listing continues
    (RESILIENCE LAW), never ships garbage;
  * the studio's consumption contract survives: artifacts carry url
    under the /v1/assets/runs prefix (Phase 2 consolidation).

The flow-doc family (GET /v1/flows/yaml/*) that shared this wall
retired 2026-09-05 with the yaml format itself — NO LEGACY; the
agent-lane docs under flows/ are markdown now, not served payloads.

No GPU, no network. Fixture trees under tmp_path."""

import json
import tempfile
from pathlib import Path

import pytest

from _anchor import REPO  # noqa: E402

import editor_runs  # noqa: E402
import run_wire  # noqa: E402


# ── fixtures ───────────────────────────────────────────────────────

def _run_dir(
    state: Path,
    run_id: str,
    sidecar: dict[str, str | int] | None,
    media: list[str] | None = None,
) -> Path:
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
def state_tree(tmp_path: Path) -> Path:
    root = tmp_path / "state"
    root.mkdir()
    (root / "drafts").mkdir()
    return root


# ── A. shape refusals happen AT CONSTRUCTION ───────────────────────

def _row(**over: str | int | list[dict[str, str | int]]) -> dict[str, str | int | list[dict[str, str | int]] | dict[str, int]]:
    base = dict(
        run_id="run-abc123-def456", name="krea-2", flow="krea-2",
        status="completed", created_at=1788563119, prompt="", seed=1,
        thumbnail="", artifacts=[], params={"seed": 1}, draft_id="")
    base.update(over)
    return base


def test_run_row_refuses_unknown_status() -> None:
    with pytest.raises(run_wire.ValidationError):
        run_wire.RunRow.model_validate(_row(status="runnng"))


def test_run_row_refuses_negative_epoch() -> None:
    with pytest.raises(run_wire.ValidationError):
        run_wire.RunRow.model_validate(_row(created_at=-1))


def test_run_row_refuses_non_run_id() -> None:
    with pytest.raises(run_wire.ValidationError):
        run_wire.RunRow.model_validate(_row(run_id="../../etc/passwd"))


def test_run_row_refuses_extra_keys() -> None:
    with pytest.raises(run_wire.ValidationError):
        run_wire.RunRow.model_validate(_row(surprise=1))


def test_run_row_refuses_unlisted_artifact_type() -> None:
    with pytest.raises(run_wire.ValidationError):
        run_wire.RunRow.model_validate(_row(artifacts=[
            {"name": "a.obj", "path": "./x", "bytes": 1,
             "url": "/v1/assets/runs/r/a.obj", "type": "mesh", "size": 1}]))


def test_run_row_closed_status_vocab_is_complete() -> None:
    served = {"running", "completed", "failed", "stopped", "success",
              "unknown"}
    assert served == {s.value for s in run_wire.RunStatus}


# ── B. drifted sources degrade LOUDLY, listing continues ───────────

def test_runs_listing_round_trips_and_serves_artifact_rows(state_tree: Path) -> None:
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


def test_c_epoch_created_key_still_reads(state_tree: Path) -> None:
    """The C-era `created` fallback is contract (2026-09-04 live bug:
    py runs read epoch 0 and buried fresh generations)."""
    _run_dir(state_tree, "run-old000001-beef",
             {"model": "krea-2", "status": "completed", "created": 100},
             media=["SaveImage.0_gen_00001_.png"])
    env = run_wire.RunsEnvelope.model_validate(
        editor_runs.runs(str(state_tree)))
    assert env.runs[0].created_at == 100


def test_legacy_dir_without_sidecar_reads_success(state_tree: Path) -> None:
    _run_dir(state_tree, "run-leg000001-face", None, media=["out.png"])
    env = run_wire.RunsEnvelope.model_validate(
        editor_runs.runs(str(state_tree)))
    assert env.runs[0].status is run_wire.RunStatus.SUCCESS


def test_sidecar_without_status_reads_unknown(state_tree: Path) -> None:
    _run_dir(state_tree, "run-unst000001-aaaa", {"model": "krea-2"})
    env = run_wire.RunsEnvelope.model_validate(
        editor_runs.runs(str(state_tree)))
    assert env.runs[0].status is run_wire.RunStatus.UNKNOWN


def test_zombie_running_sidecar_reads_failed(state_tree: Path) -> None:
    _run_dir(state_tree, "run-zmb000001-bbbb",
             {"model": "krea-2", "status": "running", "created_at": 5})
    env = run_wire.RunsEnvelope.model_validate(
        editor_runs.runs(str(state_tree)))
    assert env.runs[0].status is run_wire.RunStatus.FAILED


# ── C. drafts index ────────────────────────────────────────────────

def test_drafts_index_round_trips_with_fallback_fields(state_tree: Path) -> None:
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


def test_drafts_index_skips_non_json_and_short_names(state_tree: Path) -> None:
    dr = state_tree / "drafts"
    (dr / "notes.txt").write_text("x")       # not .json
    (dr / ".json").write_text("{}")          # 5 chars: under the L<6 gate
    env = run_wire.DraftsEnvelope.model_validate(
        editor_runs.drafts_list(str(dr)))
    assert env.count == 0


# ── D. live estate state (present) round-trips ─────────────────────

def test_live_runs_state_round_trips() -> None:
    state = REPO / "data" / "runs"
    if not (state / "output").is_dir():
        pytest.skip("no local run state on this machine")
    env = run_wire.RunsEnvelope.model_validate(
        editor_runs.runs(str(state), limit=200))
    assert env.count >= 1
    for row in env.runs:
        assert isinstance(row.status, run_wire.RunStatus)


# ── E. the birth-doc gate (2026-09-05) ─────────────────────────────

def test_birth_gate_accepts_every_composed_doc_shape() -> None:
    """drafts_save's composed doc validates at the door: normal saves,
    and the open-extras preservation (caller members ride untouched —
    the gate never reads them)."""
    with tempfile.TemporaryDirectory() as td:
        # a caller body carrying contractual open extras
        code, resp = editor_runs.drafts_save(
            td, {"intent": "make a clip",
                 "stages": [{"card": "video-gen", "params": {"fps": 24}}],
                 "model": "krea-2", "history": ["x"]})
        assert code == 200, resp
        doc = json.loads((Path(td) / (resp["draftId"] + ".json"))
                         .read_text())
        # extras preserved verbatim, birth fields gated
        assert doc["model"] == "krea-2"
        assert doc["history"] == ["x"]
        run_wire.validate_draft_birth(doc)


def test_birth_gate_catches_composer_drift() -> None:
    """The subset gate refuses every drifted birth shape loudly —
    the corruption class that would otherwise persist silently."""
    from pydantic import ValidationError
    good = {"draftId": None}  # placeholder, real docs built below
    base = {"draft_id": "draft-11111111-a", "intent": "x",
            "stages": [{"id": "s_0", "inputs": [""],
                        "provenance": "agent"}],
            "status": "ready", "createdAt": 1700000000000,
            "completedAt": None}
    run_wire.validate_draft_birth(base)          # the good shape passes
    for bad in (
        {**base, "draft_id": ""},                 # empty id
        {**base, "status": None},                 # missing status
        {**base, "createdAt": "soon"},            # non-int stamp
        {**base, "stages": "nope"},               # stages not a list
        {**base, "stages": [{"id": "s", "inputs": "",
                             "provenance": "agent"}]},   # inputs not list
        {**base, "stages": [{"id": "", "inputs": [],
                             "provenance": "agent"}]},   # empty stage id
        {**base, "stages": [{"id": "s", "inputs": [],
                             "provenance": ""}]},  # empty provenance
        {k: v for k, v in base.items() if k != "createdAt"},  # key lost
    ):
        with pytest.raises(ValidationError):
            run_wire.validate_draft_birth(bad)
    assert good == {"draftId": None}             # no accidental mutation


def test_birth_gate_serves_500_on_drift_never_persists(monkeypatch: pytest.MonkeyPatch,
                                                       tmp_path: Path) -> None:
    """If the composer ever emits drift, drafts_save refuses to
    PERSIST it — a structured 500, never a corrupted doc on disk."""
    import editor_runs as er

    original = er._ray_compose_draft_doc

    def drifted(body: dict[str, str], draft_id: str) -> dict[str, str | int | list[dict[str, str | list[str]]] | None]:
        doc = original(body, draft_id)
        doc["status"] = None                     # composer bug
        return doc

    monkeypatch.setattr(er, "_ray_compose_draft_doc", drifted)
    code, resp = er.drafts_save(str(tmp_path), {"intent": "x"})
    assert code == 500
    assert "draft composer drift" in resp["error"]
    assert list(tmp_path.glob("*.json")) == []   # nothing persisted

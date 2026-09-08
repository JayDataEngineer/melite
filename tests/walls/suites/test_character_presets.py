"""Character preset wall (anny-evolution §5 stroke 3: save/load
characters as verbs — the ray phenotype inheritance).

Pins the whole stroke, end to end:

  1. ESTATE ROWS — the 8 ray archetypes on the Anny model, every
     coefficient vector EXACT (inheritance, not drift — the vectors
     are verbatim from the ray phenotype map; a mistyped digit bakes
     the wrong body).
  2. ROW NEGATIVES — origin↔params↔ref coherence refuses at
     construction (PYTHON SHAPE LAW), duplicate preset ids refuse
     on the Model.
  3. LEDGER — user-N assignment, estate-collision + estate-delete
     refusals, atomic-ish replace, corrupt-file refusal, merge order.
  4. CANONICAL JSON — the node dialect shape per origin (the bake's
     contract; the wall pins the construction, the live bake proved
     the geometry + the estimated round-trip bit-exact).
  5. VERBS — save is tenant-local with empty writes, load rides
     anny-params and writes body_glb, both mounted on the card.
  6. CROSS-LAYER SEAMS (source pins — the worker/bake run in their
     own venv with no estate imports, so the wall pins the shared
     literals + the pack/flow/gateway/TSX wiring by text, the same
     precedent as the other cross-runtime seams).

No GPU, no network — rows, the ledger in tmp_path, and source text.

ORACLE DEATH 2026-09-08 (operator order verbatim: "we do not need
parity, we need to migrate, not keep the old machinery"): the tenant
door leg used to read the retired py serving stack's source text. It
now reads the TS source of truth — the authored wire table
(packages/gateway/src/routes.ts, the preset template rows) plus the
TS door implementation (packages/gateway/src/doors/studios.ts, the
file→estimated promotion) — following
tests/walls/suites/test_routes_mirror.py.

Date: 2026-09-08. Status: landed (oracle-death re-derivation).
"""

import json
import os
import re
from pathlib import Path

import pytest
from pydantic import ValidationError

from _anchor import REPO

import flow as flow_mod
from melite_models import (
    AuthoredParams, CharacterPreset, EstimatedParams, Genre, Model,
    ModelError, PresetKnobs, PresetLedgerError, PresetOrigin,
    PRESET_PARAMS_FILENAME, all_presets, append_user_preset,
    delete_user_preset, load_model_py, read_user_presets,
)

ANNY_MODEL_PY = os.path.join(
    REPO, "packages", "engines", "comfyui", "models", "3d", "anny",
    "model.py")
ANNY_VERBS_PY = os.path.join(
    REPO, "packages", "engines", "comfyui", "models", "3d", "anny",
    "mods", "verbs.py")
ANNY_TSX = os.path.join(
    REPO, "packages", "engines", "comfyui", "action_cards", "3d",
    "anny", "ui", "studio", "component.tsx")
PACK_NODES_PY = os.path.join(
    REPO, "vendor", "comfyui_extensions",
    "melite-kimodo-nodes", "nodes_anny.py")
PARAMS_FLOW_PY = os.path.join(REPO, "flows", "anny-params", "flow.py")
BAKE_PY = os.path.join(REPO, "flows", "anny-params", "bake_params.py")
COMMERCIAL_WORKER_PY = os.path.join(
    REPO, "flows", "anny-hmr-commercial", "worker.py")
ROUTES_TS = os.path.join(
    REPO, "packages", "gateway", "src", "routes.ts")
STUDIOS_TS = os.path.join(
    REPO, "packages", "gateway", "src", "doors", "studios.ts")
PRESETS_PY = os.path.join(REPO, "python", "melite_models", "presets.py")


def _anny() -> type[Model]:
    return load_model_py(ANNY_MODEL_PY, "comfyui")


# ── 1. estate rows: the ray vectors, EXACT ──────────────────────────
# order: gender/age/muscle/weight/height/proportions/cupsize/
# firmness/african/asian/caucasian (the phenotype map's contract).

_RAY_VECTORS = {
    "neutral": (0.5, 0.50, 0.50, 0.50, 0.50, 0.50, 0.50, 0.50,
                0.5, 0.5, 0.5),
    "adult_female": (1.0, 0.40, 0.35, 0.38, 0.52, 0.52, 0.45, 0.55,
                     0.5, 0.5, 0.5),
    "adult_male": (0.0, 0.45, 0.55, 0.50, 0.55, 0.50, 0.40, 0.55,
                   0.5, 0.5, 0.5),
    "child": (0.5, 0.08, 0.15, 0.35, 0.20, 0.25, 0.00, 0.50,
              0.5, 0.5, 0.5),
    "child_female": (1.0, 0.08, 0.15, 0.35, 0.20, 0.25, 0.00, 0.50,
                     0.5, 0.5, 0.5),
    "teen": (0.5, 0.20, 0.25, 0.40, 0.35, 0.35, 0.20, 0.50,
             0.5, 0.5, 0.5),
    "hero": (0.0, 0.40, 0.75, 0.60, 0.65, 0.55, 0.40, 0.65,
             0.5, 0.5, 0.5),
    "elderly": (0.5, 0.85, 0.30, 0.40, 0.45, 0.50, 0.45, 0.30,
                0.5, 0.5, 0.5),
}


def test_estate_rows_match_ray_exactly() -> None:
    rows = {p.id: p for p in _anny().character_presets}
    assert sorted(rows) == sorted(_RAY_VECTORS), (
        "estate preset ids drifted: %s" % sorted(rows))
    for pid, vector in _RAY_VECTORS.items():
        row = rows[pid]
        assert row.origin is PresetOrigin.base_params, (
            "%s: estate rows are authored-dialect (got %r)"
            % (pid, row.origin))
        assert row.params is not None and tuple(
            row.params.phenotype) == pytest.approx(tuple(vector)), (
            "%s: coefficient drift — %s != ray %s"
            % (pid, tuple(row.params.phenotype), vector))
        assert row.description, "%s: estate rows document themselves" % pid


def test_estate_adult_female_names_the_cupsize_caveat() -> None:
    rows = {p.id: p for p in _anny().character_presets}
    assert "cupsize" in rows["adult_female"].description, (
        "the ray caveat (0.45 is BELOW neutral) must ride the row — "
        "a silent modest default bakes the wrong character")


def test_estate_rows_carry_no_refs() -> None:
    for row in _anny().character_presets:
        assert row.params_ref is None and row.body_ref is None, (
            "%s: estate rows are inline params, never refs" % row.id)


# ── 2. row negatives: coherence refuses at construction ─────────────

def test_base_params_without_params_refuses() -> None:
    with pytest.raises(ValidationError):
        CharacterPreset(id="x", label="x",
                        origin=PresetOrigin.base_params)


def test_estimated_without_ref_or_params_refuses() -> None:
    with pytest.raises(ValidationError):
        CharacterPreset(id="x", label="x",
                        origin=PresetOrigin.estimated)


def test_file_with_params_refuses() -> None:
    with pytest.raises(ValidationError):
        CharacterPreset(
            id="x", label="x", origin=PresetOrigin.file,
            params=AuthoredParams(
                phenotype=(0.5,) * 11),
            body_ref="/v1/assets/runs/r/f.glb")


def test_estimated_with_base_params_refuses() -> None:
    with pytest.raises(ValidationError):
        CharacterPreset(
            id="x", label="x", origin=PresetOrigin.estimated,
            params=AuthoredParams(phenotype=(0.5,) * 11),
            params_ref="/v1/assets/runs/r/anny_preset.json")


def test_phenotype_out_of_range_refuses() -> None:
    with pytest.raises(ValidationError):
        AuthoredParams(phenotype=(0.5,) * 10 + (1.5,))
    # scale is VERBATIM estimator output (no honest bound — the
    # contract is the length, 139, never the values)
    with pytest.raises(ValidationError):
        EstimatedParams(phenotype=(0.5,) * 6, scale=(0.0,) * 138)


def test_duplicate_preset_ids_refuse_on_the_model() -> None:
    row = CharacterPreset(
        id="dup", label="dup", origin=PresetOrigin.base_params,
        params=AuthoredParams(phenotype=(0.5,) * 11))
    with pytest.raises(ModelError):
        class _Dup(Model):
            id = "dup-test"
            label = "dup"
            genre = Genre.THREED
            character_presets = (row, row)


def test_no_lossy_bridge_between_dialects() -> None:
    src = open(PRESETS_PY, encoding="utf-8").read()
    for pat in ("def to_estimated", "def to_authored",
                "def from_estimated", "def from_authored",
                "def convert_dialect", "def bridge",
                "_bridge(", "to_estimated(", "to_authored("):
        assert pat not in src, (
            "presets.py grew %r — the dialects NEVER convert "
            "(a filter map is lossy archaeology)" % pat)


# ── 3. ledger ───────────────────────────────────────────────────────

def _file_row(**kw: str | PresetKnobs) -> CharacterPreset:
    base: dict[str, str | PresetKnobs | None] = dict(
                id="user-pending", label="t",
                origin=PresetOrigin.file,
                body_ref="/v1/assets/runs/r/f.glb")
    base.update(kw)
    return CharacterPreset(**base)


def test_ledger_assigns_user_ids_in_order(tmp_path: Path) -> None:
    estate = _anny().character_presets
    a = append_user_preset(str(tmp_path), "3d/anny", _file_row(), estate)
    b = append_user_preset(str(tmp_path), "3d/anny",
                           _file_row(label="u2"), estate)
    assert (a.id, b.id) == ("user-1", "user-2")
    assert [p.id for p in read_user_presets(str(tmp_path), "3d/anny")] \
        == ["user-1", "user-2"]


def test_ledger_refuses_estate_collision(tmp_path: Path) -> None:
    estate = _anny().character_presets
    with pytest.raises(PresetLedgerError):
        append_user_preset(str(tmp_path), "3d/anny",
                           _file_row(id="neutral"), estate)


def test_ledger_refuses_estate_delete_but_deletes_users(tmp_path: Path) -> None:
    estate = _anny().character_presets
    append_user_preset(str(tmp_path), "3d/anny", _file_row(), estate)
    with pytest.raises(PresetLedgerError):
        delete_user_preset(str(tmp_path), "3d/anny", "neutral", estate)
    assert delete_user_preset(str(tmp_path), "3d/anny", "user-1",
                              estate) is True
    assert delete_user_preset(str(tmp_path), "3d/anny", "user-9",
                              estate) is False


def test_ledger_refuses_corrupt_file(tmp_path: Path) -> None:
    from melite_models import tenant_ledger_path
    from pathlib import Path
    path = Path(tenant_ledger_path(str(tmp_path), "3d/anny"))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("{corrupt", encoding="utf-8")
    with pytest.raises(PresetLedgerError):
        read_user_presets(str(tmp_path), "3d/anny")


def test_all_presets_merges_estate_then_users() -> None:
    estate = _anny().character_presets
    user = (_file_row(id="user-1"),)
    merged = all_presets(estate, user)
    assert [p.id for p in merged] == \
        [p.id for p in estate] + ["user-1"]


# ── 4. canonical JSON: the node dialect ─────────────────────────────

def test_canonical_authored_shape() -> None:
    row = CharacterPreset(
        id="neutral", label="n", origin=PresetOrigin.base_params,
        params=AuthoredParams(phenotype=(0.5,) * 11))
    doc = json.loads(row.canonical_json())
    assert doc == {"dialect": "authored",
                   "phenotype": [0.5] * 11, "local_changes": {}}


def test_canonical_estimated_shape() -> None:
    row = CharacterPreset(
        id="user-1", label="u", origin=PresetOrigin.estimated,
        params=EstimatedParams(phenotype=(0.5,) * 6,
                               scale=(0.0,) * 139),
        params_ref="/v1/assets/runs/r/anny_preset.json")
    doc = json.loads(row.canonical_json())
    assert doc["dialect"] == "estimated"
    assert len(doc["phenotype"]) == 6 and len(doc["scale"]) == 139
    # no None keys ride the wire (compact = parseable by the node)
    assert all(v is not None for v in doc.values())


def test_canonical_file_row_has_no_dialect() -> None:
    # a file row is a mesh reference, never params — asking for the
    # node dialect is a caller bug (ValueError, not a ledger failure)
    with pytest.raises(ValueError):
        _file_row().canonical_json()


# ── 5. verbs ────────────────────────────────────────────────────────

# test_preset_verbs_mounted_with_the_right_planes RETIRED 2026-09-07
# (python render plane b324c480): its subject was the python anny
# CARD class (action_cards/3d/anny/python/card.py, preset-save/load
# verb mounting via load_card_py). The load plane it also touched
# (flows/anny-params) stays pinned below by
# test_anny_params_flow_wires_the_bake_node.


def test_anny_params_flow_wires_the_bake_node() -> None:
    src = open(PARAMS_FLOW_PY, encoding="utf-8").read()
    assert "AnnyParamsToGlb" in src
    assert "$params_json" in src
    flow_mod.load_flow("anny-params")


# ── 6. cross-layer seams (source pins) ──────────────────────────────

def test_pack_node_registered_with_shape_gates() -> None:
    src = open(PACK_NODES_PY, encoding="utf-8").read()
    assert '"AnnyParamsToGlb": AnnyParamsToGlb' in src
    assert '"params_json": ("STRING"' in src
    assert "bake_params.py" in src
    # the dialect gates (counts the node refuses on — loud, never a
    # silent mis-bake)
    assert "len(ph) != 11" in src and "len(ph) != 6" in src
    assert "len(doc[\"scale\"]) != 139" in src


def test_worker_writes_the_shared_params_filename() -> None:
    src = open(COMMERCIAL_WORKER_PY, encoding="utf-8").read()
    assert '"%s"' % PRESET_PARAMS_FILENAME in src, (
        "the worker must write the ONE shared filename (rung 6 — "
        "never restated coordinates)")
    assert '"preset_params"' in src  # the final JSON names it


def test_bake_refuses_unknown_morphs_loud() -> None:
    src = open(BAKE_PY, encoding="utf-8").read()
    assert "unknown morph" in src
    assert "silent" in src  # the never-silent-skip comment


def test_gateway_serves_the_tenant_door() -> None:
    routes = open(ROUTES_TS, encoding="utf-8").read()
    assert "/v1/studios/{tenant}/presets" in routes
    assert "/v1/studios/{tenant}/presets/{preset_id}" in routes
    studios = open(STUDIOS_TS, encoding="utf-8").read()
    assert "tryPromote" in studios  # file→estimated promotion


def test_tsx_parity_for_both_preset_verbs() -> None:
    src = open(ANNY_TSX, encoding="utf-8").read()
    assert '"preset-save"' in src and '"preset-load"' in src
    assert '"save-preset"' in src and '"anny-params"' in src
    # params_json is the DOOR-SERVED canonical string, posted
    # VERBATIM (2026-09-06: the client-side rebuild turned the child
    # row's list-shaped local_changes into a GPU traceback — the
    # rebuild is dead, the door serves the dialect and the flow start
    # validates it BEFORE registration) + file rows apply via the
    # attach door
    assert "selected.params_json" in src
    assert "selected.body_ref" in src
    assert "/v1/studios/3d/anny/presets" in src


def test_knobs_snapshot_stays_optional() -> None:
    row = _file_row(knobs=PresetKnobs(resolution=2048))
    assert row.knobs.resolution == 2048
    assert _file_row().knobs.resolution is None  # None = inherits

"""Pilot stroke-2 wall: the anny base-body autoload.

Date: 2026-09-05 · Status: landed (pilot record docs/plans/anny-pilot.md
§4 stroke 2 — model-declared slot defaults; design
docs/design/anny-base-body.md; Model row
plugins/engines/comfyui/models/3d/anny/model.py; card seam
plugins/engines/comfyui/action_cards/3d/anny/).

Pins what stroke 2 promises and nothing it defers:
  (a) phase-1 with EMPTY params succeeds and inputs name the
      declared base path with origin 'base' (EXPLICIT RESOLUTION at
      the validation door — the run document names the body);
  (b) an explicit body_glb overrides the base (origin 'file', the
      base file untouched);
  (c) base absent on disk → rc=-3 BEFORE registration (no yaml, no
      sidecar inputs) with the provision-naming refusal;
  (d) rung-4 shape: the Provision row carries url + sha256 (64
      lowercase hex) + size_bytes;
  (e) the provisioner walks Provision rows (the trellis2-native gap
      is closed — unit-level, no network).
Plus the seam pins the design names: the schema stamps origin
(base/file, draft 'estimated' rides through, explicit null
refuses); the card declares body_glb File(required=False) with the
autoload tooltip; the studio slot is required:false with a hint
naming the base body.

No GPU, no network — temp-dir mounts stand in for the weights
store (estate_config.model_paths monkeypatched per test).
"""

import importlib.util
import re
import sys
from pathlib import Path
from types import ModuleType

import pytest
from pydantic import ValidationError

REPO = Path(__file__).resolve().parents[3]
ANNY_PY = REPO / "plugins/engines/comfyui/action_cards/3d/anny" / "py"
ANNY_TSX = (REPO / "plugins/engines/comfyui/action_cards/3d/anny" / "ui"
            / "studio" / "component.tsx")

sys.path.insert(0, str(REPO / "py"))
sys.path.insert(0, str(REPO / "tools"))
sys.path.insert(0, str(REPO / "plugins" / "engines" / "comfyui" / "compose"))

import estate_config  # noqa: E402


def _compose_mod() -> ModuleType:
    name = "anny_compose_base_body_wall"
    if name in sys.modules:
        return sys.modules[name]
    spec = importlib.util.spec_from_file_location(
        name, ANNY_PY / "compose.py")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def _schema_mod() -> ModuleType:
    name = "anny_schema_base_body_wall"
    if name in sys.modules:
        return sys.modules[name]
    spec = importlib.util.spec_from_file_location(
        name, ANNY_PY / "schema.py")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture()
def base_mount(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """A fake weights store carrying the provisioned base body; the
    compose door's mount derivation points at it."""
    (tmp_path / "anny").mkdir()
    (tmp_path / "anny" / "anny-base-body.glb").write_bytes(b"GLB-BASE")
    monkeypatch.setattr(
        estate_config, "model_paths",
        lambda *a, **k: {"read_root": str(tmp_path),
                         "download_root": str(tmp_path)})
    return tmp_path


@pytest.fixture()
def bare_mount(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """A fake weights store WITHOUT the base body (unprovisioned)."""
    monkeypatch.setattr(
        estate_config, "model_paths",
        lambda *a, **k: {"read_root": str(tmp_path),
                         "download_root": str(tmp_path)})
    return tmp_path


# ── (a) empty params resolve the declared base ───────────────────

def test_empty_params_resolve_base_with_origin(base_mount: Path) -> None:
    arm = _compose_mod()
    rc, _y, extra, err = arm.compose({"params": {}}, "anny", "")
    assert rc == 0, err
    assert extra["inputs"]["body_glb"] == str(
        base_mount / "anny" / "anny-base-body.glb")
    assert extra["inputs"]["body_origin"] == "base"


def test_no_params_stanza_resolves_base(base_mount: Path) -> None:
    arm = _compose_mod()
    rc, _y, extra, err = arm.compose({"model": "anny"}, "anny", "")
    assert rc == 0, err
    assert extra["inputs"]["body_origin"] == "base"
    assert extra["inputs"]["body_glb"].endswith("anny-base-body.glb")


# ── (b) explicit file overrides ──────────────────────────────────

def test_explicit_body_overrides_base(
        base_mount: Path, tmp_path: Path) -> None:
    arm = _compose_mod()
    mine = tmp_path / "mine.glb"
    mine.write_bytes(b"GLB-MINE")
    rc, _y, extra, err = arm.compose(
        {"params": {"body_glb": str(mine)}}, "anny", "")
    assert rc == 0, err
    assert extra["inputs"]["body_glb"] == str(mine)
    assert extra["inputs"]["body_origin"] == "file"
    # the base file sits untouched beside the run, never read
    assert (base_mount / "anny" / "anny-base-body.glb").read_bytes() \
        == b"GLB-BASE"


# ── (c) absent base refuses BEFORE registration ──────────────────

def test_absent_base_refuses_before_registration(
        bare_mount: Path) -> None:
    arm = _compose_mod()
    rc, yaml_text, extra, err = arm.compose({"params": {}}, "anny", "")
    assert rc == -3
    assert not yaml_text and extra is None  # no graph, no sidecar seed
    assert "anny-base-body.glb" in (err or "")
    assert "provision" in (err or "").lower()


def test_absent_base_refuses_on_the_run_door_too(
        bare_mount: Path) -> None:
    arm = _compose_mod()
    rc, yaml_text, _extra, err = arm.compose(
        {"params": {}}, "anny", "wall-run-no-base")
    assert rc == -3
    assert not yaml_text
    assert "provision" in (err or "").lower()


# ── schema: the origin stamp ─────────────────────────────────────

def test_schema_stamps_base_when_empty() -> None:
    mod = _schema_mod()
    assert mod.parse_card({}).body_origin == "base"
    assert mod.parse_card({"params": {}}).body_origin == "base"


def test_schema_stamps_file_when_set() -> None:
    mod = _schema_mod()
    doc = mod.parse_card({"params": {"body_glb": "x.glb"}})
    assert doc.body_origin == "file"


def test_schema_keeps_draft_estimated_stamp() -> None:
    """HMR-hydrated paths arrive non-empty WITH the draft's stamp —
    compose must not re-derive it."""
    mod = _schema_mod()
    doc = mod.parse_card({"params": {"body_glb": "h.glb",
                                     "body_origin": "estimated"}})
    assert doc.body_origin == "estimated"


def test_schema_explicit_null_still_refuses() -> None:
    mod = _schema_mod()
    with pytest.raises(ValidationError):
        mod.parse_card({"params": {"body_glb": None}})


def test_estimated_stamp_rides_phase_one(
        base_mount: Path, tmp_path: Path) -> None:
    arm = _compose_mod()
    est = tmp_path / "est.glb"
    est.write_bytes(b"GLB-EST")
    rc, _y, extra, err = arm.compose(
        {"params": {"body_glb": str(est),
                    "body_origin": "estimated"}}, "anny", "")
    assert rc == 0, err
    assert extra["inputs"]["body_glb"] == str(est)
    assert extra["inputs"]["body_origin"] == "estimated"


# ── (d) rung-4 shape of the Provision row ────────────────────────

def test_base_body_row_is_all_or_nothing() -> None:
    from melite_models import load_model_py
    cls = load_model_py(
        str(REPO / "plugins/engines/comfyui/models/3d/anny" / "model.py"),
        "comfyui")
    rows = [p for p in (cls.provisions or ())
            if p.name == "anny-base-body.glb"]
    assert len(rows) == 1, "exactly one declared base body"
    (row,) = rows
    assert row.folder == "anny"
    assert str(row.url).startswith("https://")
    assert row.sha256 is not None and re.fullmatch(r"[0-9a-f]{64}",
                                                  row.sha256), row.sha256
    assert isinstance(row.size_bytes, int) and row.size_bytes > 0


# ── (e) the provisioner walks Provision rows ─────────────────────

def test_provision_walk_names_the_base_body() -> None:
    import provision as pv
    got = [(mid, p.name, p.folder)
           for mid, p in pv._provision_rows()]
    assert ("anny", "anny-base-body.glb", "anny") in got
    # the gap this closes: trellis2-native's weight rows ride too
    assert any(mid == "trellis2-native" for mid, _n, _f in got)


def test_step_models_consumes_the_provision_walk() -> None:
    import inspect
    import provision as pv
    src = inspect.getsource(pv.step_models)
    assert "_provision_rows" in src
    assert "download_model" in src


# ── the card + studio seam ───────────────────────────────────────

def test_card_body_glb_is_optional_with_autoload_tooltip() -> None:
    import melite_cards as mc
    cls = mc.load_card_py(str(ANNY_PY / "card.py"), "comfyui")
    (field,) = [f for f in cls._fields_ if f.name == "body_glb"]
    assert field.required is False
    assert "anny-base-body.glb" in (field.tooltip or "")


def test_studio_slot_is_optional_with_base_hint() -> None:
    src = ANNY_TSX.read_text(encoding="utf-8")
    m = re.search(r"key:\s*\"body_glb\"[^}]*required:\s*(true|false)",
                  src)
    assert m and m.group(1) == "false", "body slot must be required:false"
    assert "anny-base-body.glb" in src

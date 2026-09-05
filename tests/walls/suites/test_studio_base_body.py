"""Open-card mannequin wall (2026-09-06: the base ANNY loads when the
card opens — the viewport shows the declared neutral body while the
Body slot is empty).

Pins the stroke end to end:

  1. DECLARATION — Model.base_body names a declared provision
     (construction refusal otherwise; "" = the family declares
     none). The anny family names its provisioned neutral body.
  2. DOOR — GET /v1/studios/{tenant}/base-body streams the
     provisioned file (generic tenant lookup, loud 404s).
  3. STUDIO — the placeholder is DISPLAY-ONLY (never written to
     params) and yields to real content; a door refusal keeps the
     explicit empty state.

No GPU, no network — rows, route registration, and source text.
"""

import os

from melite_models import Genre, Model, ModelError, Provision, load_model_py

from _anchor import REPO

ANNY_MODEL_PY = os.path.join(
    REPO, "plugins", "engines", "comfyui", "models", "3d", "anny",
    "model.py")
GATEWAY_PY = os.path.join(REPO, "py", "gateway.py")
ANNY_TSX = os.path.join(
    REPO, "plugins", "engines", "comfyui", "action_cards", "3d",
    "anny", "ui", "studio", "component.tsx")
ASSEMBLY_TSX = os.path.join(
    REPO, "plugins", "engines", "comfyui", "action_cards", "3d",
    "ui", "studios", "assembly.tsx")


def _anny() -> type[Model]:
    return load_model_py(ANNY_MODEL_PY, "comfyui")


# ── 1. declaration ───────────────────────────────────────────────

def test_anny_declares_its_provisioned_base_body() -> None:
    cls = _anny()
    assert cls.base_body == "anny-base-body.glb"
    assert cls.base_body in {p.name for p in cls.provisions}


def test_base_body_defaults_to_none() -> None:
    assert Model.base_body == ""


def test_base_body_naming_no_provision_refuses() -> None:
    try:

        class _Bad(Model):
            id = "bad-base-body-test"
            label = "b"
            genre = Genre.THREED
            provisions = (Provision(name="real.glb",
                                    url="https://example.com/real.glb"),)
            base_body = "missing.glb"

        raise AssertionError("bogus base_body constructed")
    except ModelError as e:
        assert "missing.glb" in str(e)


def test_base_body_non_string_refuses() -> None:
    try:

        class _BadType(Model):
            id = "bad-base-body-type-test"
            label = "b"
            genre = Genre.THREED
            base_body = 123

        raise AssertionError("non-str base_body constructed")
    except ModelError as e:
        assert "base_body" in str(e)


# ── 2. door ──────────────────────────────────────────────────────

def _gateway_src() -> str:
    with open(GATEWAY_PY, encoding="utf-8") as f:
        return f.read()


def test_base_body_door_registered() -> None:
    src = _gateway_src()
    assert "/v1/studios/{tenant}/base-body" in src
    assert "Studios" in src


def test_base_body_door_is_generic_over_tenants() -> None:
    src = _gateway_src()
    assert "_studio_family" in src
    assert "unknown studio tenant" in src
    assert "declares no base body" in src
    assert "is not provisioned" in src


# ── 3. studio ────────────────────────────────────────────────────

def test_studio_fetches_base_body_display_only() -> None:
    with open(ANNY_TSX, encoding="utf-8") as f:
        src = f.read()
    assert "/v1/studios/3d/anny/base-body" in src
    assert "placeholderAssets" in src
    assert "DISPLAY-ONLY" in src


def test_placeholder_yields_to_real_content() -> None:
    with open(ASSEMBLY_TSX, encoding="utf-8") as f:
        src = f.read()
    assert "placeholderAssets" in src
    assert "assets.length > 0 ? assets" in src

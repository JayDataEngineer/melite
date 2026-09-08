"""Base-body wall (the base ANNY autoloads at COMPOSE when the Body
slot is empty; the studio's native figure renders the neutral body
— the one-mesh order killed the GLB preview).

Pins the stroke end to end:

  1. DECLARATION — Model.base_body names a declared provision
     (construction refusal otherwise; "" = the family declares
     none). The anny family names its provisioned neutral body.
  2. DOOR — GET /v1/studios/{tenant}/base-body streams the
     provisioned file (generic tenant lookup, loud 404s).
  3. STUDIO — ONE MESH (2026-09-06, verbatim: "DO IT. I WANT A REAL
     APP"): the anny studio renders NO GLB preview — the native
     figure IS the mesh, so no base-body fetch, no placeholder feed.
     The shared AssemblyStudio keeps the generic placeholder
     machinery for stage tenants (Trellis); anny passes
     viewport="none".

No GPU, no network — rows, route registration, and source text.

ORACLE DEATH 2026-09-08 (operator order verbatim: "we do not need
parity, we need to migrate, not keep the old machinery"): the door
legs used to read the retired py serving stack's source text. They
now read the TS source of truth — the authored wire table
(packages/gateway/src/routes.ts, the template row) plus the TS door
implementation (packages/gateway/src/doors/studios.ts, the generic
tenant lookup + loud 404s) — following
tests/walls/suites/test_routes_mirror.py.

Date: 2026-09-08. Status: landed (oracle-death re-derivation).
"""

import os

from melite_models import Genre, Model, ModelError, Provision, load_model_py

from _anchor import REPO

ANNY_MODEL_PY = os.path.join(
    REPO, "packages", "engines", "comfyui", "models", "3d", "anny",
    "model.py")
ROUTES_TS = os.path.join(
    REPO, "packages", "gateway", "src", "routes.ts")
STUDIOS_TS = os.path.join(
    REPO, "packages", "gateway", "src", "doors", "studios.ts")
ANNY_TSX = os.path.join(
    REPO, "packages", "engines", "comfyui", "action_cards", "3d",
    "anny", "ui", "studio", "component.tsx")
ASSEMBLY_TSX = os.path.join(
    REPO, "packages", "engines", "comfyui", "action_cards", "3d",
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

def _routes_src() -> str:
    with open(ROUTES_TS, encoding="utf-8") as f:
        return f.read()


def _studios_src() -> str:
    with open(STUDIOS_TS, encoding="utf-8") as f:
        return f.read()


def test_base_body_door_registered() -> None:
    assert "/v1/studios/{tenant}/base-body" in _routes_src()
    assert "dispatchStudios" in _studios_src()


def test_base_body_door_is_generic_over_tenants() -> None:
    src = _studios_src()
    assert "ESTATE_TENANTS" in src
    assert "unknown studio tenant" in src
    assert "declares no base body" in src
    assert "is not provisioned" in src


# ── 3. studio ────────────────────────────────────────────────────

def test_studio_renders_no_glb_preview_one_mesh() -> None:
    with open(ANNY_TSX, encoding="utf-8") as f:
        src = f.read()
    # ONE MESH: no base-body preview fetch (the native anny figure
    # renders the neutral base itself) and no Stage feed.
    assert "/v1/studios/3d/anny/base-body" not in src
    assert 'viewport="none"' in src


def test_placeholder_yields_to_real_content() -> None:
    with open(ASSEMBLY_TSX, encoding="utf-8") as f:
        src = f.read()
    assert "placeholderAssets" in src
    assert "assets.length > 0 ? assets" in src

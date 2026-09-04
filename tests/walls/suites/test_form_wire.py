"""FORM WIRE WALL — validation on the action-card form family
(operator order, 2026-09-05, verbatim: "The entire action card system
is broken, fundamentally. When we select a baseline action card, like
Image. It is supposed to default to showing me the action stuff in a
universal way. Right now, it just allows me... to pick model...." /
"Curious... there is no pydantic or testing around this critical
feature....").

Root cause this wall pins shut: a fresh baseline card carries its FORM
name as stage.service ("image-gen"); /v1/form-spec?model=image-gen fell
into the C-era lane probe — ANY flows/*/flow.yaml containing
"type: image-gen" matches, and every estate flow doc's image step
matches — and answered HTTP 200 with the hollow _MINIMAL_LANE_SPEC
(defaults/variants/features/enhance_prompts, NO fields, NO
schema_groups). The card modal rendered the Model zone and nothing
else. The universal action form had nothing to render.

The gate under test (py/form_wire.py + editor_forms.form_spec):
  * every 200 is CONSTRUCTED as a frozen FormSpecRow — model, form,
    service, label, genre, fields, schema_groups, features, defaults,
    variants REQUIRED (web/contracts declares the same);
  * form names resolve through the /v1/forms registry to their
    default_service model's FULL spec (image-gen -> krea-2, 10
    fields) — the registry wins BEFORE the lane probe;
  * the minimal lane spec survives only for genuine lane types,
    served through the SAME model with honest empties — the hollow
    200 class is unbuildable;
  * unknown names refuse 404, empty param 400 (QUEUE LANE LAW: no
    silent fallback composition).

No GPU, no network. In-process calls against the live repo tree."""

import sys
from pathlib import Path

import pytest

from _anchor import REPO  # noqa: E402

sys.path.insert(0, str(REPO / "py"))

import editor_forms  # noqa: E402
import form_wire  # noqa: E402

REPO_S = str(REPO)


# ── A. the regression: baseline card services resolve to full specs ─

@pytest.mark.parametrize("svc", sorted(editor_forms._FORMS_TABLE))
def test_every_form_name_resolves_to_a_full_spec(svc):
    code, spec = editor_forms.form_spec(REPO_S, svc)
    assert code == 200, (svc, code, spec)
    env = form_wire.FormSpecRow.model_validate(spec)
    assert len(env.fields) >= 1, (svc, "baseline card has no form rows")
    assert len(env.schema_groups) >= 1
    assert env.label  # branded label, not ""


def test_image_gen_is_krea2_not_the_hollow_lane_spec():
    """THE bug: 'Image' showed only the model picker because
    image-gen hit the lane probe and served the hollow spec."""
    code, spec = editor_forms.form_spec(REPO_S, "image-gen")
    assert code == 200
    env = form_wire.FormSpecRow.model_validate(spec)
    assert env.model == "krea-2" and env.form == "image-gen"
    names = {f.name for f in env.fields}
    assert {"prompt", "width", "height", "steps"} <= names


def test_lane_probe_cannot_shadow_a_form_name():
    """Every estate flow doc carries 'type: image-gen' steps — the
    probe input that caused the hollow 200. The registry wins."""
    assert editor_forms._lane_probe(REPO_S, "image-gen")
    code, spec = editor_forms.form_spec(REPO_S, "image-gen")
    assert spec.get("model") == "krea-2"


def test_genuine_lane_type_serves_the_full_required_core():
    code, lane = editor_forms.form_spec(REPO_S, "pixal3d_native")
    assert code == 200
    env = form_wire.FormSpecRow.model_validate(lane)
    assert env.fields == [] and env.label == "pixal3d_native"
    for k in ("model", "form", "service", "label", "genre",
              "fields", "schema_groups", "features", "defaults",
              "variants"):
        assert k in lane, k


# ── B. loud refusals ───────────────────────────────────────────────

def test_unknown_model_refuses_404():
    code, body = editor_forms.form_spec(REPO_S, "no-such-model-xyz")
    assert code == 404 and body["error"] == "model not found"


def test_empty_model_param_refuses_400():
    code, body = editor_forms.form_spec(REPO_S, "")
    assert code == 400 and body["error"] == "missing model param"


# ── C. the hollow spec is unbuildable ──────────────────────────────

def _full(**over):
    base = dict(
        model="m", form="f", service="s", label="L", genre="image",
        fields=[{"name": "prompt", "type": "textarea", "label": "P"}],
        schema_groups=[{"id": "", "label": "Parameters", "fields": []}],
        features={"modifiers": [], "variant_groups": {}},
        defaults={"steps": 8}, variants=[], guide=None)
    base.update(over)
    return base


def test_hollow_spec_cannot_be_built():
    """The old 200 body (defaults/variants/features only) is a
    construction refusal now — the class is dead by shape."""
    with pytest.raises(form_wire.ValidationError):
        form_wire.FormSpecRow.model_validate(
            {"defaults": {}, "variants": [], "features": {},
             "enhance_prompts": ""})


@pytest.mark.parametrize("missing", [
    "model", "form", "service", "label", "fields", "schema_groups",
    "features", "defaults", "variants",
])
def test_each_required_key_is_load_bearing(missing):
    with pytest.raises(form_wire.ValidationError):
        form_wire.FormSpecRow.model_validate(
            {k: v for k, v in _full().items() if k != missing})


def test_field_row_requires_name_and_type():
    with pytest.raises(form_wire.ValidationError):
        form_wire.FormFieldRow.model_validate({"name": "", "type": "x"})
    with pytest.raises(form_wire.ValidationError):
        form_wire.FormFieldRow.model_validate({"name": "a"})


def test_empty_group_id_is_the_legacy_bucket():
    """The ungrouped 'Parameters' bucket carries id='' by wire
    contract (C-era default bucket) — NOT a refusal."""
    row = form_wire.SchemaGroupRow.model_validate(
        {"id": "", "label": "Parameters", "fields": []})
    assert row.id == ""


# ── D. the full catalog sweeps clean through the gate ──────────────

def test_every_catalog_model_spec_validates():
    rows = editor_forms._scan_catalog(REPO_S)
    assert len(rows) >= 10
    for row in rows:
        mid = row.get("id") or row.get("model")
        if not mid or str(mid).startswith("_"):
            continue                     # user-surface law
        code, spec = editor_forms.form_spec(REPO_S, mid)
        assert code == 200, (mid, code, spec)
        form_wire.FormSpecRow.model_validate(spec)


def test_variant_routes_validate_too():
    for route in ("krea-2-raw",):
        code, spec = editor_forms.form_spec(REPO_S, route)
        assert code == 200, (route, code)
        form_wire.FormSpecRow.model_validate(spec)


# ── E. structure pin: the hollow literal is gone from the route ────

def test_no_bare_minimal_literal_on_the_serving_path():
    src = (REPO / "py" / "editor_forms.py").read_text(encoding="utf-8")
    assert "dict(_MINIMAL_LANE_SPEC)" not in src
    # the registry resolution precedes the probe CALL inside form_spec
    # (index the call site marker, not the def line)
    i_reg = src.index('_FORMS_TABLE.get(model)')
    i_probe = src.index('if safe and _lane_probe(repo_root, model):')
    assert i_reg < i_probe

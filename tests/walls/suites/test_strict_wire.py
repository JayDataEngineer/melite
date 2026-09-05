"""STRICT WIRE WALL — pydantic extra=forbid on every wire row.

(PYTHON SHAPE LAW, rung 2; QUEUE LANE LAW, 2026-09-05) Every wire
row that crosses a pydantic boundary validates AT CONSTRUCTION with
extra=forbid. A literal carrying an unknown key is unbuildable — the
schema refuses, the caller surfaces the refusal, the wire stays
honest. The _Frozen base in py/form_wire.py and py/run_wire.py
declares the constraint; this wall pins that every exported row class
inherits it AND refuses a literal with an unknown key.

The same class of refusal that stops a dead draft from bringing back
fossil fields (yamlRunId, etc.) — once a wire row is removed from
the schema, anything that named it must update.

No GPU, no network."""

from _anchor import REPO  # noqa: E402

import pytest  # noqa: E402

import form_wire  # noqa: E402
import run_wire  # noqa: E402


# ── A. every exported row class is a _Frozen subclass ───────────────

def test_form_wire_exports_all_frozen() -> None:
    """The wall: a form row is built only through pydantic
    construction. A literal that bypasses pydantic (class.__init__)
    still validates the same fields because _Frozen is the only
    base; subclasses are tight by inheritance."""
    for name in ("FormFieldRow", "SchemaGroupRow", "VariantRow",
                 "ModifierFeatureRow", "FormFeaturesRow",
                 "FormSpecRow"):
        cls = getattr(form_wire, name)
        assert issubclass(cls, form_wire._Frozen), name


def test_run_wire_exports_all_frozen() -> None:
    for name in ("ArtifactRow", "TruncationRow", "RunRow",
                 "RunsEnvelope", "DraftRow", "DraftsEnvelope"):
        cls = getattr(run_wire, name)
        assert issubclass(cls, run_wire._Frozen), name


# ── B. extras on every form row refuse construction ───────────────

def test_form_field_row_extra_refused() -> None:
    with pytest.raises(form_wire.ValidationError):
        form_wire.FormFieldRow.model_validate({
            "name": "prompt", "type": "str", "default": "",
            "fossil_key": "value",
        })


def test_form_spec_row_extra_refused() -> None:
    with pytest.raises(form_wire.ValidationError):
        form_wire.FormSpecRow.model_validate({
            "model": "krea-2", "form": "image-gen",
            "service": "krea-2", "label": "Krea 2", "genre": "image",
            "fields": [], "schema_groups": [],
            "features": form_wire.FormFeaturesRow().model_dump(),
            "defaults": {}, "variants": [],
            "fossil_yaml": "creature-flow",
        })


def test_variant_row_extra_refused() -> None:
    with pytest.raises(form_wire.ValidationError):
        form_wire.VariantRow.model_validate({
            "id": "raw", "label": "Raw",
            "rejected_field": True,
        })


# ── C. extras on every run row refuse construction ────────────────

def test_run_row_extra_refused() -> None:
    with pytest.raises(run_wire.ValidationError):
        run_wire.RunRow.model_validate({
            "run_id": "r1", "status": "completed", "model": "krea-2",
            "name": "My run", "created_at": 0, "ended_at": 0,
            "duration_sec": 0, "has_artifacts": False,
            "thumbnail": None, "artifacts": [],
            "stale_field": "drop me",
        })


def test_artifact_row_extra_refused() -> None:
    with pytest.raises(run_wire.ValidationError):
        run_wire.ArtifactRow.model_validate({
            "name": "out.png", "type": "image", "url": "/r/1/out.png",
            "size": 0, "fossil_url": "data:text/yaml;base64,abc",
        })


def test_draft_row_extra_refused() -> None:
    with pytest.raises(run_wire.ValidationError):
        run_wire.DraftRow.model_validate({
            "draft_id": "d1", "name": "Card", "model": "krea-2",
            "stale_intent": "old",
        })


# ── D. the fossil-name class is dead — anything that names a removed
# row refuses. (After the yaml retirement, FlowListEntry etc. are gone;
# their rows aren't on the wire anymore. A literal naming one refuses
# because the symbol doesn't exist, but a fresh literal named
# FlowListEntry in a sidecar context would also refuse because the
# schema never had it — this wall just pins the symbol-absence.) ──

def test_fossil_rows_removed() -> None:
    """After the yaml retirement (2026-09-05) these symbols are
    gone from run_wire; importing them raises AttributeError. The
    schema's intent: the door closed, the row died, the wire stayed
    honest. A caller asking for a fossil row gets a loud ImportError,
    not a silent shape mismatch."""
    for name in ("FlowListEntry", "FlowListEnvelope", "FlowNodeRow",
                 "FlowStepRow", "FlowDetailEnvelope"):
        assert not hasattr(run_wire, name), (
            "%s resurrected — the run wire has no fossil rows" % name)


# ── E. construction validation (PYTHON SHAPE LAW rung 2) — required
# fields, min_length, type — not just extras. A row with a missing
# required field refuses. ──

def test_run_row_missing_required_refuses() -> None:
    with pytest.raises(run_wire.ValidationError):
        run_wire.RunRow.model_validate({
            "run_id": "r1", "status": "completed",
            # model/name missing — required
        })


def test_form_field_row_min_length_refuses() -> None:
    """PYTHON SHAPE LAW rung 2: validation AT CONSTRUCTION. A field
    with an empty name is unbuildable — the wire is a contract, the
    empty string is not a valid field identity."""
    with pytest.raises(form_wire.ValidationError):
        form_wire.FormFieldRow.model_validate({
            "name": "", "type": "str", "default": "",
        })

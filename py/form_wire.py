#!/usr/bin/env python3
"""form_wire — the frozen wire contract for /v1/form-spec and the forms
registry surface.

Operator order (2026-09-05, verbatim): "The entire action card system
is broken, fundamentally. When we select a baseline action card, like
Image. It is supposed to default to showing me the action stuff in a
universal way. Right now, it just allows me... to pick model...." /
"Curious... there is no pydantic or testing around this critical
feature...."

Root cause this module closes: a fresh baseline card carries its FORM
name as the service (stage.service = "image-gen"), the studio loads
/v1/form-spec?model=image-gen, and the door's C-era lane probe (ANY
flows/*/flow.yaml containing "type: image-gen" — every estate flow
doc's image step matches) answered with the hollow _MINIMAL_LANE_SPEC:
HTTP 200, no fields, no schema_groups, no label. The card modal
rendered the Model zone and nothing else — the universal action form
had nothing to render. A hollow 200 is the NO SILENT DROPS sin served
from the wrong side of the wire.

The gate: every 200 this family serves is CONSTRUCTED as a frozen
FormSpecRow — model/form/service/label/genre/fields/schema_groups/
features/defaults/variants are REQUIRED, so a spec that cannot carry
the universal form cannot be built, and therefore cannot be served.
Form names resolve through the /v1/forms registry to their
default_service model's spec (image-gen -> krea-2). Unknown names
refuse 404. The minimal lane spec survives ONLY for genuine lane types
(flow-doc step families), served through the SAME model with honest
empties.

KEY DISCIPLINE (PYTHON SHAPE LAW rung 3, dead-rider order): keys are
CLOSED — extra="forbid" everywhere — with the key sets below
enumerated EMPIRICALLY from the live estate catalog sweep (2026-09-05).
VALUES stay open (Any) — per-type field payloads (options rows,
visible_when clauses, loader_info) are the cards' vocabulary, not the
wire's. Adding a KEY is a deliberate model extension, never drift.

Client-side note: web/contracts' FormSpec schema agrees — fields and
schema_groups are required, not optional. The client's
validateSpecContract let the hollow spec through as "loaded"; the
server gate makes that class unreachable regardless.
"""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, ValidationError


class _Frozen(BaseModel):
    """PYTHON SHAPE LAW rung 2: frozen, extra=forbid, validated at
    build — no dead riders, no mutation after construction."""

    model_config = ConfigDict(frozen=True, extra="forbid")


class FormFieldRow(_Frozen):
    """One card input row (the universal form's atom). Keys are the
    empirical estate sweep; values open (options rows, condition
    clauses are card vocabulary)."""

    name: str = Field(min_length=1)
    type: str = Field(min_length=1)
    label: str = ""
    default: Any = None
    options: list[Any] = []
    group: str = ""
    zone: str = ""
    order: int | None = None
    required: bool | None = None
    columns: int | None = None
    width: int | str | None = None
    min: Any = None
    max: Any = None
    step: Any = None
    placeholder: str = ""
    tooltip: str = ""
    visible_when: Any = None


class SchemaGroupRow(_Frozen):
    """One schema group — the zone-tagged field bundles the params
    surface renders. id may be EMPTY by wire contract: ungrouped
    fields land in the legacy "Parameters" bucket (id "", label
    "Parameters") — editor_forms' default bucket, C-era provenance."""

    id: str
    label: str = ""
    fields: list[Any] = []
    order: int | None = None
    zone: str = ""


class VariantRow(_Frozen):
    """One model variant (Variant/Quant axes)."""

    id: str = Field(min_length=1)
    label: str = ""
    group: str = ""
    defaults: dict[str, Any] = {}
    route: str = ""
    hint: str | None = None
    engine: str = ""
    quant: str | None = None
    vram_peak_gb: int | float | None = None
    # The parent Variant this cell is owned by (the axis hierarchy —
    # flowAxisRows scopes the Quant select to the active variant's
    # owner-linked cells: `quantRows.filter(e => e.owner === act)`).
    # Default "" back-compat: the lane/peek spec serves an empty
    # variants list so the field is never exercised there; class- and
    # yaml-path emissions stamp the parent variant id.
    owner: str = ""


class ModifierFeatureRow(_Frozen):
    """One declared modifier capability (loras/controlnets/...)."""

    kind: str = Field(min_length=1)
    label: str = ""
    param_key: str = Field(min_length=1)
    cardinality: str = ""
    fields: list[Any] = []
    options: list[Any] = []
    options_scanned: bool | None = None
    upload_dir: str = ""
    declaration_only: bool | None = None


class FormFeaturesRow(_Frozen):
    """The spec's capability declaration."""

    modifiers: list[ModifierFeatureRow] = []
    variant_groups: dict[str, Any] = {}


class FormSpecRow(_Frozen):
    """GET /v1/form-spec 200 body — the COMPLETE form descriptor.

    Required keys are the contract web/contracts declares; a body
    without them is the hollow-spec class this module exists to kill.

    genre stays plain str (open vocabulary): the wire serves "creature"
    today and the client schema's enum is stale — narrowing it is its
    own deliberate stroke, not a silent one here."""

    model: str = Field(min_length=1)
    form: str = Field(min_length=1)
    service: str = Field(min_length=1)
    label: str = Field(min_length=1)
    genre: str
    fields: list[FormFieldRow]
    schema_groups: list[SchemaGroupRow]
    features: FormFeaturesRow
    defaults: dict[str, Any]
    variants: list[VariantRow]
    guide: Any = None
    engine: str = ""
    enhance_prompt: Any = None
    enhance_prompts: Any = None
    size: str | None = None
    layout: str | None = None
    loader_info: Any = None
    contract: Any = None


def refusal_reason(error: ValidationError) -> str:
    """One-line, field-named reason for a form-spec contract refusal —
    the LOUD part of document-and-continue (RESILIENCE LAW)."""
    parts = []
    for e in error.errors():
        loc = ".".join(str(x) for x in e["loc"]) or "<root>"
        parts.append(f"{loc}: {e['msg']}")
    return "; ".join(parts)

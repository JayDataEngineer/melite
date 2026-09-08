"""slot_kinds.py — the input-slot vocabulary SSOT (gap-3 port, 2026-09-02;
shape-law flip 2026-09-03: rows, not remember-to-check scans).

The editor's lib/inputSlots.ts has run on FALLBACK_SLOTS since the C++
flip: its docstrings still cite a "backend slot_kinds.py" that never
existed in this tree. This module IS that referent, authored from the
editor fallback (inputSlots.ts FALLBACK_SLOTS /
FALLBACK_UNDECLARED_WIRE_SLOTS) so the wire REPLACES the fallback
field-by-field instead of drifting past it.

Served on /v1/model-catalog as scan_catalog()["input_vocabulary"]:
    slots             — every canonical wire slot (the closed set)
    slot_kinds        — slot key -> FileKind value
    undeclared_slots  — wire-live slots no form/model declares
                         (protected from closed-vocabulary purges)

The editor folds this in via _feedInputVocabulary (modelCatalog.ts) —
identity aliases are skipped consumer-side, so no aliases are served
here (nothing invented; the form-level aliases arrive with form_slots
when a lane needs them).

PYTHON SHAPE LAW (2026-09-03): FileKind is a closed vocabulary → enum;
each slot is a frozen row validated AT CONSTRUCTION; the cross-row
invariants (unique slots, every undeclared slot is a real slot) live in
SlotVocabulary's model validator — an unkinded row or a stray undeclared
name cannot be BUILT, so there is no boot-time scan to remember to run.

Laws: the closed vocabulary is DECLARED here, not hardcoded at call
sites; a new slot joins this file (and the editor fallback) in the
same commit — the both-sides drift is what api:sync exists to catch.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, field_validator, model_validator

__all__ = ["FileKind", "SlotDecl", "SlotVocabulary", "VOCAB",
           "input_vocabulary"]


class FileKind(str, Enum):
    """The closed file-kind vocabulary (mirrors inputSlots.ts FileKind —
    a backend drift lands on api:sync). A typo is a construction
    refusal, not a runtime route mismatch."""

    IMAGE = "image"
    MASK = "mask"
    GLB = "glb"
    AUDIO = "audio"
    VIDEO = "video"
    MOTION = "motion"
    VOICE = "voice"
    TEXT = "text"
    ANY = "any"


class SlotDecl(BaseModel, frozen=True):
    model_config = {"extra": "forbid"}

    """One wire slot row: a canonical slot key and its file kind."""

    slot: str
    kind: FileKind

    @field_validator("slot")
    @classmethod
    def _slot_shape(cls, v: str) -> str:
        if not v or not all(c.islower() or c.isdigit() or c == "_"
                            for c in v):
            raise ValueError("slot key must be lowercase snake_case: %r" % v)
        return v


class SlotVocabulary(BaseModel, frozen=True):
    model_config = {"extra": "forbid"}

    """The declared vocabulary. Cross-row invariants are enforced AT
    CONSTRUCTION of the instance — an invalid vocabulary cannot be
    built, loud here, not at the first 4am render."""

    slots: tuple[SlotDecl, ...]
    undeclared_slots: tuple[str, ...] = ()

    @model_validator(mode="after")
    def _cross_rows(self) -> "SlotVocabulary":
        names = [r.slot for r in self.slots]
        if len(names) != len(set(names)):
            dupes = sorted({n for n in names if names.count(n) > 1})
            raise ValueError("duplicate slots %s" % dupes)
        declared = set(names)
        stray = [s for s in self.undeclared_slots if s not in declared]
        if stray:
            raise ValueError(
                "undeclared slots not in the vocabulary %s" % sorted(set(stray)))
        if len(self.undeclared_slots) != len(set(self.undeclared_slots)):
            raise ValueError("duplicate undeclared_slots")
        return self


# THE declaration — the single instance everything else derives from.
# Rows mirror inputSlots.ts FALLBACK_SLOTS 1:1 (kind "any" would be an
# omission, not a declaration, so each row states its kind).
VOCAB = SlotVocabulary(
    slots=(
        SlotDecl(slot="input_image", kind=FileKind.IMAGE),
        # multi-image bricks (doc family)
        SlotDecl(slot="image1", kind=FileKind.IMAGE),
        SlotDecl(slot="image2", kind=FileKind.IMAGE),
        SlotDecl(slot="image3", kind=FileKind.IMAGE),
        SlotDecl(slot="reference_image", kind=FileKind.IMAGE),
        SlotDecl(slot="end_image", kind=FileKind.IMAGE),
        # video bracket frames
        SlotDecl(slot="first_frame", kind=FileKind.IMAGE),
        SlotDecl(slot="last_frame", kind=FileKind.IMAGE),
        SlotDecl(slot="lanpaint_mask", kind=FileKind.MASK),
        SlotDecl(slot="input_mask", kind=FileKind.MASK),
        SlotDecl(slot="source_image", kind=FileKind.IMAGE),
        # mesh in (retarget/rig lanes)
        SlotDecl(slot="source_glb", kind=FileKind.GLB),
        SlotDecl(slot="input_glb", kind=FileKind.GLB),
        SlotDecl(slot="prev_motion_artifact", kind=FileKind.MOTION),
        SlotDecl(slot="preview_glb", kind=FileKind.GLB),
        SlotDecl(slot="reference_audio", kind=FileKind.AUDIO),
        SlotDecl(slot="voice_file", kind=FileKind.VOICE),
    ),
    # wire-live slots no form/model declares (mirrors
    # FALLBACK_UNDECLARED_WIRE_SLOTS — protected from vocabulary purges)
    undeclared_slots=("lanpaint_mask",),
)


def input_vocabulary() -> dict[str, list[str] | dict[str, str]]:
    """The wire shape consumed by the editor's setInputVocabulary —
    the projection of VOCAB, never a second declaration."""
    return {
        "slots": [r.slot for r in VOCAB.slots],
        "slot_kinds": {r.slot: r.kind.value for r in VOCAB.slots},
        "undeclared_slots": list(VOCAB.undeclared_slots),
    }


# ── Per-form / per-model slot bindings (2026-09-05, no-drop fix) ─────────
# A card class declares its binary (File/Image/Audio/Video) input fields
# directly. The frontend's slot grid consumes form_slots[form] /
# model_slots[service] to decide which squares to render; a form that
# declares inputs (e.g. anny → form_3d_anny: body_glb, hair_glb,
# outfit_glb, source_image) MUST carry them here or the SlotGrid renders
# empty — the silent default-card class. This row is the typed carrier:
# a (form, model_route, field) tuple, every entry backed by a card class
# File declaration. No stringly handshakes (PYTHON SHAPE LAW rung 5).
from pydantic import field_validator  # already imported above for SlotDecl


class FormSlotBinding(BaseModel, frozen=True):
    model_config = {"extra": "forbid"}

    form: str
    model_route: str
    field: str
    kind: FileKind

    @field_validator("form", "model_route", "field")
    @classmethod
    def _shape(cls, v: str) -> str:
        if not v or not all(c.islower() or c.isdigit() or c == "_" or c == "-"
                            for c in v):
            raise ValueError(
                "form/model_route/field must be lowercase slug/snake: %r" % v)
        return v


class FormSlotVocabulary(BaseModel, frozen=True):
    """The aggregated per-form / per-model slot bindings — built from
    the card classes at catalog scan time (python/catalog.py). Construction
    validates uniqueness (a form declares a field at most once) and
    projects to the form_slots / model_slots dicts the editor reads."""

    model_config = {"extra": "forbid"}

    bindings: tuple[FormSlotBinding, ...]

    @model_validator(mode="after")
    def _cross(self) -> "FormSlotVocabulary":
        # Uniqueness is per MODEL (a model declares a field at most
        # once) — NOT per form. Several models can board the same form
        # (qwen3-tts / qwen3-tts-base / qwen3-tts-voicedesign all board
        # form_tts, each declaring the qvoice slot); the form's slot
        # list is the UNION, deduplicated in form_slots(). A duplicate
        # (model_route, field) is a double declaration and refuses.
        seen_model: set[tuple[str, str]] = set()
        for b in self.bindings:
            if (b.model_route, b.field) in seen_model:
                raise ValueError(
                    "model %r declares field %r twice"
                    % (b.model_route, b.field))
            seen_model.add((b.model_route, b.field))
        return self

    def form_slots(self) -> dict[str, list[str]]:
        out: dict[str, list[str]] = {}
        for b in self.bindings:
            if b.field not in out.setdefault(b.form, []):
                out[b.form].append(b.field)
        return out

    def model_slots(self) -> dict[str, list[str]]:
        out: dict[str, list[str]] = {}
        for b in self.bindings:
            out.setdefault(b.model_route, []).append(b.field)
        return out


def empty_form_slot_vocabulary() -> FormSlotVocabulary:
    """The zero-binding vocabulary (legacy / unknown forms)."""
    return FormSlotVocabulary(bindings=())

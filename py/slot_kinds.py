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


def input_vocabulary() -> dict:
    """The wire shape consumed by the editor's setInputVocabulary —
    the projection of VOCAB, never a second declaration."""
    return {
        "slots": [r.slot for r in VOCAB.slots],
        "slot_kinds": {r.slot: r.kind.value for r in VOCAB.slots},
        "undeclared_slots": list(VOCAB.undeclared_slots),
    }

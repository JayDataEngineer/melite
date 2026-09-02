"""slot_kinds.py — the input-slot vocabulary SSOT (gap-3 port, 2026-09-02).

The editor's lib/inputSlots.ts has run on FALLBACK_SLOTS since the C++
flip: its docstrings still cite a "backend slot_kinds.py" that never
existed in this tree. This module IS that referent, authored from the
editor fallback (inputSlots.ts FALLBACK_SLOTS /
FALLBACK_UNDECLARED_WIRE_SLOTS) so the wire REPLACES the fallback
field-by-field instead of drifting past it.

Served on /v1/model-catalog as scan_catalog()["input_vocabulary"]:
    slots             — every canonical wire slot (the closed set)
    slot_kinds        — slot key -> FileKind (image|mask|glb|audio|
                         video|motion|voice|text|any)
    undeclared_slots  — wire-live slots no form/model declares
                         (protected from closed-vocabulary purges)

The editor folds this in via _feedInputVocabulary (modelCatalog.ts) —
identity aliases are skipped consumer-side, so no aliases are served
here (nothing invented; the form-level aliases arrive with form_slots
when a lane needs them).

Laws: the closed vocabulary is DECLARED here, not hardcoded at call
sites; a new slot joins this file (and the editor fallback) in the
same commit — the both-sides drift is what api:sync exists to catch.
"""

from __future__ import annotations

# The canonical wire slots (mirrors inputSlots.ts FALLBACK_SLOTS 1:1).
SLOTS = (
    "input_image",           # generic image in (image lanes)
    "image1", "image2", "image3",   # multi-image bricks (doc family)
    "reference_image",       # style/reference guidance image
    "end_image",             # terminal keyframe (last-frame lanes)
    "first_frame", "last_frame",    # video bracket frames
    "lanpaint_mask",         # lanpaint wire-only mask
    "input_mask",            # generic mask in (inpaint lanes)
    "source_image",          # source for derive/edit lanes
    "source_glb", "input_glb",      # mesh in (retarget/rig lanes)
    "prev_motion_artifact",  # motion carry (.npz chain)
    "preview_glb",           # mesh preview refresh
    "reference_audio",       # style/reference audio
    "voice_file",            # TTS persona voice
)

# slot key -> FileKind. Every SLOTS entry is declared; kind "any" would
# be an omission, not a declaration, so each row states its kind.
SLOT_KINDS = {
    "input_image": "image",
    "image1": "image",
    "image2": "image",
    "image3": "image",
    "reference_image": "image",
    "end_image": "image",
    "first_frame": "image",
    "last_frame": "image",
    "lanpaint_mask": "mask",
    "input_mask": "mask",
    "source_image": "image",
    "source_glb": "glb",
    "input_glb": "glb",
    "prev_motion_artifact": "motion",
    "preview_glb": "glb",
    "reference_audio": "audio",
    "voice_file": "voice",
}

# Wire-live slots no form/model declares (mirrors
# FALLBACK_UNDECLARED_WIRE_SLOTS — protected from vocabulary purges).
UNDECLARED_WIRE_SLOTS = ("lanpaint_mask",)

# The closed FileKind vocabulary (mirrors inputSlots.ts FileKind — a
# backend drift lands on api:sync).
FILE_KINDS = ("image", "mask", "glb", "audio", "video",
              "motion", "voice", "text", "any")


def input_vocabulary() -> dict:
    """The wire shape consumed by the editor's setInputVocabulary."""
    vocab = {
        "slots": list(SLOTS),
        "slot_kinds": dict(SLOT_KINDS),
        "undeclared_slots": list(UNDECLARED_WIRE_SLOTS),
    }
    return vocab


def _self_check() -> None:
    """Import-time integrity: every slot is kinded, every kind is in the
    closed vocabulary, every undeclared slot is a real slot. Loud here —
    not at the first 4am render."""
    bad = [s for s in SLOTS if s not in SLOT_KINDS]
    if bad:
        raise ValueError("slot_kinds: unkinded slots %s" % bad)
    stray = sorted(set(SLOT_KINDS) - set(SLOTS))
    if stray:
        raise ValueError("slot_kinds: kinds declared for non-slots %s" % stray)
    bad = [k for k in SLOT_KINDS.values() if k not in FILE_KINDS]
    if bad:
        raise ValueError("slot_kinds: unknown FileKind %s" % sorted(set(bad)))
    bad = [s for s in UNDECLARED_WIRE_SLOTS if s not in SLOTS]
    if bad:
        raise ValueError("slot_kinds: undeclared slots not in SLOTS %s" % bad)


_self_check()

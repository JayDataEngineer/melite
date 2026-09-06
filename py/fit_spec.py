"""fit_spec.py — 3D placement suite spec rows (fit-card stroke 1).

Date: 2026-09-06 · Status: landed stroke 1 (design docs/design/fit-card.md).

Frozen pydantic rows (PYTHON SHAPE LAW rung 2): meld AttachmentSpec
(csharp/SimCore/Plugins/KindManifest.cs) reborn as construction-time
validators, with two deliberate loudness upgrades (design §2.3): conflict
combos meld silently overrides REFUSE here with the conflict named; bone
names stay open str (meld 4.38: fit works on any mixamo-named body) while
the MODE is a closed enum. Import-light: stdlib + pydantic only.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

# Meld rows are JSON documents (annotations only).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

SOMAX_UV = 'somax'


class FitMode(str, Enum):
    """The three meld fit laws (closed — a typo refuses, never mis-seats)."""
    socket = 'socket'
    fit = 'fit'
    grip = 'grip'


class AttachmentRow(BaseModel):
    """One placement: prop model + bone + exactly one fit law's knobs."""

    model_config = ConfigDict(frozen=True, extra='forbid')

    model: str = Field(min_length=1)
    bone: str = Field(min_length=1)
    mode: FitMode = FitMode.socket
    position: tuple[float, float, float] = (0.0, 0.0, 0.0)
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0)
    target_width: float = Field(default=0.0, ge=0.0)
    fit_ratio: float = Field(default=0.0, ge=0.0)
    fit_ref_bone: str = ''
    fit_ref_bone2: str = ''
    seat_ratio: float = Field(default=0.12, ge=0.0)
    seat_offset_y: float = 0.0
    finger_bone: str = ''
    thumb_bone: str = ''
    sheathe_bone: str = ''
    motion: str = ''

    @model_validator(mode='after')
    def _one_law_no_conflicts(self) -> AttachmentRow:
        if self.mode is FitMode.fit:
            if not self.fit_ref_bone:
                raise ValueError('fit needs fit_ref_bone (nothing to measure)')
            if self.fit_ratio <= 0.0:
                raise ValueError('fit needs fit_ratio > 0 (got %r)' % (self.fit_ratio,))
            if self.target_width != 0.0:
                raise ValueError('fit + target_width=%r conflict: fit_ratio owns width (meld silently'
                                 ' overrides — estate refuses)' % (self.target_width,))
        elif self.mode is FitMode.grip:
            if not self.finger_bone:
                raise ValueError('grip needs finger_bone (no blade axis)')
            if self.position != (0.0, 0.0, 0.0) or self.rotation != (0.0, 0.0, 0.0):
                raise ValueError('grip + position/rotation conflict: the grip law owns orientation'
                                 ' (meld silently overrides — estate refuses)')
        else:
            if self.fit_ratio != 0.0 or self.fit_ref_bone:
                raise ValueError('socket + fit knobs conflict: socket rows never measure'
                                 ' (use mode=fit)')
            if self.finger_bone or self.thumb_bone:
                raise ValueError('socket + finger/thumb conflict: hand refs belong to mode=grip')
        return self

    def is_authored(self) -> bool:
        """True while seat_offset_y is untouched — only the verify loop may stamp (design §2.3b)."""
        return self.seat_offset_y == 0.0

    def stamped(self, dy: float) -> AttachmentRow:
        """Return the gate-calibrated copy (the ONLY seat_offset_y writer; frozen rows never mutate)."""
        return AttachmentRow.model_validate({**self.model_dump(), 'seat_offset_y': dy})

    @classmethod
    def from_manifest_row(cls, d: dict[str, JsonValue]) -> AttachmentRow:
        """Meld JSON keys in (Model, Bone, Align, ...); mode DERIVED once here (rung 6)."""
        align = str(d.get('Align', '') or '')
        fit_ratio = float(d.get('FitRatio', 0.0) or 0.0)
        fit_ref = str(d.get('FitRefBone', '') or '')
        if align == 'grip':
            mode = FitMode.grip
        elif fit_ratio > 0.0 or fit_ref:
            mode = FitMode.fit
        else:
            mode = FitMode.socket
        pos = d.get('Position', []) or []
        rot = d.get('Rotation', []) or []
        return cls(
            model=str(d.get('Model', '')),
            bone=str(d.get('Bone', '')),
            mode=mode,
            position=tuple(float(v) for v in pos) if pos else (0.0, 0.0, 0.0),
            rotation=tuple(float(v) for v in rot) if rot else (0.0, 0.0, 0.0),
            target_width=float(d.get('TargetWidth', 0.0) or 0.0),
            fit_ratio=fit_ratio,
            fit_ref_bone=fit_ref,
            fit_ref_bone2=str(d.get('FitRefBone2', '') or ''),
            seat_ratio=float(d.get('SeatRatio', 0.12)),
            seat_offset_y=float(d.get('SeatOffsetY', 0.0) or 0.0),
            finger_bone=str(d.get('FingerBone', '') or ''),
            thumb_bone=str(d.get('ThumbBone', '') or ''),
            sheathe_bone=str(d.get('SheatheBone', '') or ''),
            motion=str(d.get('Motion', '') or ''),
        )

    def to_manifest_row(self) -> dict[str, JsonValue]:
        """Meld JSON keys out (the exact row Unity AttachToBones consumes)."""
        return {
            'Model': self.model,
            'Bone': self.bone,
            'SheatheBone': self.sheathe_bone,
            'Motion': self.motion,
            'Position': [self.position[0], self.position[1], self.position[2]],
            'Rotation': [self.rotation[0], self.rotation[1], self.rotation[2]],
            'TargetWidth': self.target_width,
            'FitRatio': self.fit_ratio,
            'FitRefBone': self.fit_ref_bone,
            'FitRefBone2': self.fit_ref_bone2,
            'SeatRatio': self.seat_ratio,
            'SeatOffsetY': self.seat_offset_y,
            'Align': 'grip' if self.mode is FitMode.grip else '',
            'FingerBone': self.finger_bone,
            'ThumbBone': self.thumb_bone,
        }


class FitRequest(BaseModel):
    """A placement request: which body + prop + row (uv gated like SkinSpec)."""

    model_config = ConfigDict(frozen=True, extra='forbid')

    body: str = Field(min_length=1)
    prop: str = Field(min_length=1)
    attachment: AttachmentRow
    uv: str = Field(default=SOMAX_UV, min_length=1)

    @field_validator('uv')
    @classmethod
    def _somax_only(cls, v: str) -> str:
        if v != SOMAX_UV:
            raise ValueError('uv %r breaks bone-name stability (want %r)' % (v, SOMAX_UV))
        return v


def seat_drop(span_m: float, row: AttachmentRow) -> float:
    """Prop-bottom seat below the ref bone: span x seat_ratio + gate stamp (meld AttachToBones §fit)."""
    if span_m < 0.0:
        raise ValueError('span %r is negative' % (span_m,))
    return span_m * row.seat_ratio + row.seat_offset_y


def fit_width(span_m: float, row: AttachmentRow) -> float:
    """Prop width from a measured bone span (mode fit only — other modes never measure)."""
    if row.mode is not FitMode.fit:
        raise ValueError('fit_width on mode=%r: only fit measures (socket seats, grip aims)' % (row.mode,))
    if span_m < 0.0:
        raise ValueError('span %r is negative' % (span_m,))
    return span_m * row.fit_ratio

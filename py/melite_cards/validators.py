"""melite_cards.validators — the ONE validator vocabulary for card schemas.

Every action-card schema.py handrolled its own `_positive`,
`_seed_integral`, `Num`/`JsonDict` aliases and (newest) tile-bag /
slot-null coercions — 12 copies of `_positive`, 11 of
`_seed_integral` with DRIFTED COMMENTS across copies (the 2026-09-05
handroll sweep). A pattern copied to a second card is a primitive
that hasn't been extracted yet: this module is that primitive.

USAGE (pydantic v2 descriptor assignment — a decorator call IS a
value, so the per-schema surface is one line per validator, with
THAT schema's field list preserved):

    from melite_cards import validators as _v

    _positive = field_validator("steps", "cfg")(_v.positive)
    _seed = field_validator("seed")(_v.seed_integral)

The shared functions take (cls, v, info) exactly as a classmethod
validator would — field_validator binds them the same way.

THREE positive flavors (the sweep found all three in the wild — the
names finally say what they do):
- positive: stated value must be > 0.
- positive_or_absent: null passes (Optional knob, absent rides
  compose), stated value must be > 0.
- required_positive: stated null REFUSES ("omit it to ride the
  model default" — absent rides merged_defaults, null is a STATED
  wrong value), stated value must be > 0.
- present: stated null refuses, no range check (doubt means no
  validator — the mu/std precedent).
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Union

from pydantic import BaseModel, ValidationInfo


Num = Union[float, int]

JsonValue = str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]
JsonDict = dict[str, JsonValue]

# pydantic calls shared validators as unbound functions: cls is ANY
# params row, so type[object] (the wall's one precise top, not a
# hidden value). Slot values ride the decoded-JSON envelope.
ValidatorCls = type[object]


def positive(cls: ValidatorCls, v: Num, info: ValidationInfo) -> Num:
    """A stated numeric must be > 0 (12-card consensus body)."""
    if float(v) <= 0:
        raise ValueError("%s must be positive (got %r)"
                         % (info.field_name, v))
    return v


def positive_or_absent(cls: ValidatorCls, v: Num | None,
                       info: ValidationInfo) -> Num | None:
    """Optional knob: null passes (absent rides compose), a stated
    value must be > 0 (the upscale-tools precedent)."""
    if v is None:
        return v
    if float(v) <= 0:
        raise ValueError("%s must be positive (got %r)"
                         % (info.field_name, v))
    return v


def required_positive(cls: ValidatorCls, v: Num | None,
                      info: ValidationInfo) -> Num | None:
    """Absent rides the model merged_defaults — a STATED null is a
    wrong value and refuses (the ideogram/video-gen precedent; the
    old num() helper masked it to the default)."""
    if v is None:
        raise ValueError("%s is null — omit it to ride the model "
                         "default (got None)" % info.field_name)
    if float(v) <= 0:
        raise ValueError("%s must be positive (got %r)"
                         % (info.field_name, v))
    return v


def present(cls: ValidatorCls, v: Num | None,
            info: ValidationInfo) -> Num | None:
    """No range check (doubt means no validator — the mu/std
    precedent): only a stated null refuses."""
    if v is None:
        raise ValueError("%s is null — omit it to ride the model "
                         "default (got None)" % info.field_name)
    return v


def seed_integral(cls: ValidatorCls, v: Num) -> Num:
    """Seed admission, estate-wide: integral and ≥ −1. −1 is the Seed
    widget's RANDOM sentinel (untouched/cleared seeds send it) —
    admitted, the compose mints. Below −1 and non-integral values
    refuse (11-card consensus body; comments normalized — the copies
    had drifted)."""
    f = float(v)
    if not f.is_integer() or f < -1:
        raise ValueError("seed must be -1 (random) or a non-negative "
                         "integer (got %r)" % (v,))
    return int(f)


def non_negative(cls: ValidatorCls, v: Num, info: ValidationInfo) -> Num:
    """Zero is a stated floor, not a missing value — only negatives
    refuse (the motion precedent; no integral requirement)."""
    if float(v) < 0:
        raise ValueError("%s must be non-negative (got %r)"
                         % (info.field_name, v))
    return v


def non_negative_int(cls: ValidatorCls, v: Num, info: ValidationInfo) -> Num:
    """Integral and ≥ 0 (the mask-studio precedent)."""
    f = float(v)
    if not f.is_integer() or f < 0:
        raise ValueError("%s must be a non-negative integer (got %r)"
                         % (info.field_name, v))
    return int(f)


def ranged(lo: float, hi: float) -> Callable[[ValidatorCls, Num, ValidationInfo], Num]:
    """Float range factory (the music/mask-studio precedent): a stated
    value must land within [lo, hi]. Bounds are the LANE's calibration
    (passed per use); the refusal shape is shared."""
    def _check(cls: ValidatorCls, v: Num, info: ValidationInfo) -> Num:
        f = float(v)
        if not lo <= f <= hi:
            raise ValueError("%s must be within [%s, %s] (got %r)"
                             % (info.field_name, lo, hi, v))
        return v
    return _check


def int_ranged(lo: int, hi: int) -> Callable[[ValidatorCls, Num, ValidationInfo], Num]:
    """Integer range factory (the music-steps precedent): integral
    and within [lo, hi]."""
    def _check(cls: ValidatorCls, v: Num, info: ValidationInfo) -> Num:
        f = float(v)
        if not f.is_integer() or not lo <= f <= hi:
            raise ValueError("%s must be an integer %s..%s (got %r)"
                             % (info.field_name, lo, hi, v))
        return int(f)
    return _check


def tile_bag_null(cls: ValidatorCls, v: JsonValue) -> JsonValue:
    """A null tile bag is no tiles: the Mods drawer clears a removed
    mod by nulling its bag (the image-edit precedent)."""
    return [] if v is None else v


def empty_slot_null_for(*, array_fields: frozenset[str] = frozenset()) -> Callable[[ValidatorCls, JsonValue, ValidationInfo], JsonValue]:
    """Optional-slot null coercion (the image-edit precedent,
    operator order 2026-09-05: optional slots' null is the editor's
    EMPTY SQUARE, not a stated wrong value). `array_fields` names
    the fields whose empty sentinel is [] (they additionally admit
    "" — the picker's empty serialization; a non-empty string still
    refuses, never a split-guess); every other listed field coerces
    null → "". Numeric nulls keep refusing — there null IS garbage.
    """
    def _coerce(cls: ValidatorCls, v: JsonValue, info: ValidationInfo) -> JsonValue:
        if v is None:
            return [] if info.field_name in array_fields else ""
        if info.field_name in array_fields and v == "":
            return []
        return v
    return _coerce


def parse_card_body(body: JsonDict, params_cls: type[BaseModel]) -> BaseModel:
    """Wire body → frozen params row (15-card consensus body): no
    params stanza = the defaults row; the compose door's own guards
    refuse the rest. Raises ValidationError with the EXACT
    field-named reason (arms map it to rc=-3)."""
    params = (body or {}).get("params")
    if not isinstance(params, dict):
        return params_cls()
    return params_cls(**params)

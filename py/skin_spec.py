"""skin_spec.py — character skin pack spec rows (skin-card stroke 1).

Date: 2026-09-06 · Status: landed stroke 1 (design docs/design/skin-card.md).

Frozen pydantic rows (PYTHON SHAPE LAW rung 2): the Unity-side contract
(meld docs/wiki/4.36 — CC0 diffuse x per-kind tint, 20-kind table) reborn
as construction-time validators. A bad tint, a bad size, or a non-somax UV
refuses HERE, never after a GPU claim. Import-light: stdlib + pydantic only
(no numpy/PIL/network — the gateway imports py/; generation lives in
tools/skin_pack.py).
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator

# The Unity sidecar is a JSON document (annotations only).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None


# The UV gate (meld 4.36 forbids-line): one texture fits all ONLY on somax.
SOMAX_UV = 'somax'
# Our detail-pack seed. Deliberately NOT meld 20260829 — those bytes belong
# to meld’s file; ours must differ (design §3 stroke 1).
SKIN_SEED = 20260906
# Closed size vocabulary (rung 3): a typo is a refusal, not a silent rescale.
SKIN_SIZES = frozenset({256, 512, 1024, 2048})


class KindSkinRow(BaseModel):
    """One CharacterSkinController entry: kind -> tint x texture."""

    model_config = ConfigDict(frozen=True, extra='forbid')

    kind: str = Field(min_length=1)
    tint: tuple[float, float, float]
    texture: str = Field(min_length=1)
    category: str = Field(default='humanoid', min_length=1)

    @field_validator('tint')
    @classmethod
    def _channels_in_range(cls, v: tuple[float, float, float]) -> tuple[float, float, float]:
        for i, c in enumerate(v):
            if isinstance(c, bool) or not isinstance(c, (int, float)):
                raise ValueError('tint[%d] = %r is not a number' % (i, c))
            if not 0.0 <= c <= 1.0:
                raise ValueError('tint[%d] = %r outside 0.0..1.0' % (i, c))
        return v


class SkinSpec(BaseModel):
    """A skin-pack request: which kind, at what resolution, from what seed."""

    model_config = ConfigDict(frozen=True, extra='forbid')

    kind: str = Field(min_length=1)
    size: int = 512
    seed: int = SKIN_SEED
    uv: str = Field(default=SOMAX_UV, min_length=1)

    @field_validator('size')
    @classmethod
    def _known_size(cls, v: int) -> int:
        if isinstance(v, bool) or v not in SKIN_SIZES:
            raise ValueError('size %r not in %s' % (v, sorted(SKIN_SIZES)))
        return v

    @field_validator('seed')
    @classmethod
    def _non_negative_seed(cls, v: int) -> int:
        # GATE S: -1 is the RANDOM sentinel (admitted at the row — the
        # phase-1 echo carries it as-given); the GENERATORS refuse it
        # (mint compose-side, never in deterministic bytes); below -1
        # refuses here.
        if isinstance(v, bool) or v < -1:
            raise ValueError('seed %r: -1 (random) or a non-negative int is required' % (v,))
        return v

    @field_validator('uv')
    @classmethod
    def _somax_only(cls, v: str) -> str:
        if v != SOMAX_UV:
            raise ValueError('uv %r breaks one-texture-fits-all (want %r)' % (v, SOMAX_UV))
        return v


# The 20 meld kinds, ported verbatim (meld 4.36 full kind table, v0.98.5).
# Tint = the shader multiplier; texture = the CC0 base diffuse stem.
KIND_TABLE: tuple[KindSkinRow, ...] = (
    KindSkinRow(kind='keeper', tint=(0.85, 0.70, 0.55), texture='young_caucasian_male'),
    KindSkinRow(kind='ash_nomad', tint=(0.65, 0.50, 0.40), texture='middleage_caucasian_male'),
    KindSkinRow(kind='villager_elder', tint=(0.75, 0.60, 0.50), texture='old_caucasian_male'),
    KindSkinRow(kind='villager', tint=(0.80, 0.65, 0.50), texture='young_caucasian_female'),
    KindSkinRow(kind='caravan_trader', tint=(0.78, 0.62, 0.48), texture='middleage_caucasian_female'),
    KindSkinRow(kind='amf_warden', tint=(0.72, 0.58, 0.46), texture='middleage_caucasian_male'),
    KindSkinRow(kind='cherusci_scrivener', tint=(0.82, 0.68, 0.54), texture='young_caucasian_male'),
    KindSkinRow(kind='marrow_raider', tint=(0.60, 0.48, 0.38), texture='old_caucasian_male'),
    KindSkinRow(kind='amalgam_horror', tint=(0.45, 0.35, 0.30), texture='flat_placeholder', category='creature'),
    KindSkinRow(kind='arena_factor', tint=(0.70, 0.55, 0.45), texture='flat_placeholder', category='creature'),
    KindSkinRow(kind='bone_crane', tint=(0.85, 0.82, 0.78), texture='flat_placeholder', category='creature'),
    KindSkinRow(kind='dune_hound', tint=(0.80, 0.70, 0.50), texture='flat_placeholder', category='creature'),
    KindSkinRow(kind='emberwing', tint=(0.85, 0.45, 0.30), texture='flat_placeholder', category='creature'),
    KindSkinRow(kind='gloom_tortoise', tint=(0.50, 0.55, 0.45), texture='flat_placeholder', category='creature'),
    KindSkinRow(kind='husk_stalker', tint=(0.55, 0.45, 0.35), texture='flat_placeholder', category='creature'),
    KindSkinRow(kind='ironvein_construct', tint=(0.50, 0.50, 0.52), texture='flat_placeholder', category='creature'),
    KindSkinRow(kind='meld_creature', tint=(0.60, 0.50, 0.42), texture='flat_placeholder', category='creature'),
    KindSkinRow(kind='moss_elk', tint=(0.55, 0.60, 0.45), texture='flat_placeholder', category='creature'),
    KindSkinRow(kind='ridge_lizard', tint=(0.65, 0.58, 0.45), texture='flat_placeholder', category='creature'),
    KindSkinRow(kind='sand_skimmer', tint=(0.75, 0.68, 0.55), texture='flat_placeholder', category='creature'),
)


def row_for(kind: str) -> KindSkinRow:
    """Return the table row for kind — KeyError names the kind (loud, never None)."""
    for row in KIND_TABLE:
        if row.kind == kind:
            return row
    raise KeyError('unknown skin kind %r (want one of %s)' % (kind, sorted(r.kind for r in KIND_TABLE)))


def sidecar(spec: SkinSpec, row: KindSkinRow) -> dict[str, JsonValue]:
    """The Unity-consumable sidecar: the CharacterSkinController entry + pack provenance."""
    return {
        'kind': row.kind,
        'tint': [row.tint[0], row.tint[1], row.tint[2]],
        'texture': row.texture,
        'category': row.category,
        'uv': spec.uv,
        'size': spec.size,
        'seed': spec.seed,
    }

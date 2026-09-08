"""schema.py — the music card's document-construction gate.

THE CARD PATTERN (golden base: action_cards/video/h3-timeline): the
card owns a pydantic document schema — document construction IS the
gate (PYTHON SHAPE LAW rung 2: validation at construction, never
post-hoc walks). Everything that can 4xx dies here, BEFORE any run
registers (QUEUE LANE LAW).

The surface is the wire contract the card.py fields declare:
prompt (required), lyrics (txt2music only), duration 10..600s
(audio.cpp caps at 10 minutes), seed, backend cuda|cpu, family —
the boarded model rows are the family vocab's truth (card_knobs
cross-validation enforces the same rows from the model side).
"""

from pydantic import BaseModel, ConfigDict, field_validator

type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

_FAMILIES = ("ace-step-xl", "ace-step-sft", "minimax")


class MusicParams(BaseModel):
    """The wire param surface (card fields), coerced + validated."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    prompt: str
    lyrics: str = ""
    duration: int = 120
    seed: int = -1
    backend: str = "cuda"
    family: str = "ace-step-xl"
    # STROKE 4 (2026-09-06): the FLOW-stage model row (the {model:}
    # door's equivalent — a card= stage names the row it composes
    # against; the arm resolves lane_inputs from it). Empty on the
    # {model:} request path, where the model rides the envelope.
    model: str = ""

    @field_validator("seed")
    @classmethod
    def _seed_sentinel(cls, v: int) -> int:
        # -1 is the widget's RANDOM (the compose omits it — the lane
        # default applies); below -1 is exactness-claiming nonsense.
        if v < -1:
            raise ValueError(
                "seed must be -1 (random) or a non-negative integer "
                "(got %r)" % (v,))
        return v

    @field_validator("prompt")
    @classmethod
    def _prompt_nonempty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(
                "required param 'prompt' missing or empty — the "
                "music caption (genre/era/tempos/instruments)")
        return v

    @field_validator("duration")
    @classmethod
    def _duration_range(cls, v: int) -> int:
        if not (10 <= v <= 600):
            raise ValueError(
                "duration must be 10..600 seconds (audio.cpp caps "
                "at 10 minutes — got %s)" % v)
        return v

    @field_validator("backend")
    @classmethod
    def _backend_vocab(cls, v: str) -> str:
        if v not in ("cuda", "cpu"):
            raise ValueError(
                "backend must be 'cuda' or 'cpu' (got %r)" % v)
        return v

    @field_validator("family")
    @classmethod
    def _family_vocab(cls, v: str) -> str:
        if v not in _FAMILIES:
            raise ValueError(
                "family must be one of %s (got %r) — the boarded "
                "model rows are the vocab's truth" % (
                    "/".join(_FAMILIES), v))
        return v


def parse_card(body: dict[str, JsonValue]) -> MusicParams:
    """Construct the document from the wire body — raises ValueError
    with the EXACT refusal message (the arm maps it to rc=-3)."""
    params = (body or {}).get("params") or {}
    if not params.get("prompt"):
        raise ValueError(
            "required param 'prompt' missing — the music caption "
            "(genre/era/tempos/instruments)")
    return MusicParams(**params)

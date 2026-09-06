"""music-native — THE first production card= lane (stroke 4,
2026-09-06; design record docs/queue/card-stage-typing.md).

The stage names the CARD, not the engine surface: `card="music-
native"` routes the params through the registry's typed body gate
(schema.py, frozen pydantic — a typo'd knob refuses the Flow(...)
line) and the worker's CARD BRIDGE composes the doc into the
audio_cpp engine's workflow via the owning arm at run time. The
model row rides params.model (the {model:} door's flow equivalent,
gated non-empty at construction by the registry row).

Kinds come from the registry (prompt/lyrics: text in, default:
audio out) — the stage declares NO outputs/expected rows: the card
IS the contract."""

from flow import (
    Flow,
    FlowTool,
    FlowToolOverlay,
    FlowToolProperty,
    FromInitial,
    Stage,
    ToolParamType,
)

FLOW = Flow(
    id="music-native",
    description=(
        "audio.cpp native music generation as a CARD stage — the "
        "first production card= lane (stroke 4). prompt in, audio "
        "out; the card doc names its model row (ace-step-xl family; "
        "see GET /v1/models for the boarded rows)."),
    stages=(
        Stage(
            id="music",
            engine="audio_cpp",
            card="music-native",
            description=(
                "audio.cpp music card — the arm composes the doc "
                "into the engine workflow (task/family/model rows)"),
            inputs={"prompt": FromInitial(key="prompt")},
            params={
                # $-substitution: the initial fills the doc at start
                # (the $spell passes the construction gate non-empty
                # and rides expand_inject — same pattern as every
                # engine-stage param wire)
                "prompt": "$prompt",
                "model": "ace-step-sft",
                "family": "ace-step-xl",
                "duration": 120,
                "seed": -1,
                "backend": "cuda",
            },
        ),
    ),
    # ROW-4 TEMPLATE LIBRARY (2026-09-06): the headless surface —
    # prompt rides the existing FromInitial (no overlay needed);
    # duration bounds are the card schema's own caps (schema.py
    # _duration_range 10..600, not retyped).
    tool=FlowTool(
        name="compose_music",
        description=(
            "audio.cpp native music generation in one call "
            "(ACE-Step family) — prompt in, audio out."),
        properties={
            "prompt": FlowToolProperty(
                ptype=ToolParamType.string,
                description="what to play",
            ),
            "duration": FlowToolProperty(
                ptype=ToolParamType.integer,
                description="seconds of music (the card caps 10..600)",
                default=120,
                minimum=10,
                maximum=600,
            ),
        },
        required=("prompt",),
        overlays=(
            FlowToolOverlay(
                param="duration",
                stage="music",
                path=("duration",),
            ),
        ),
    ),
)

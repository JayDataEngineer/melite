"""audio-native-tts — Qwen3-TTS 12Hz CustomVoice via the live
melite-audio-nodes island pack in the serving ComfyUI container.

(2026-09-04 flows rework) Converted from flow.yaml — the
declaration is now typed rows; the hardcoded server_url fossil
DROPPED (the engine's _server_url() config/env seam owns the
endpoint, QUEUE LANE LAW). params are the comfyui engine's surface,
verbatim."""

from flow import (
    Flow,
    FlowTool,
    FlowToolOverlay,
    FlowToolProperty,
    FromInitial,
    Kind,
    Stage,
    ToolParamType,
)

FLOW = Flow(
    id="audio-native-tts",
    description=(
        "Phase 1b gate: Qwen3-TTS 12Hz CustomVoice via the live "
        "melite-audio-nodes island pack in the serving ComfyUI "
        "container (pure-ComfyUI audio lane; retires the C audio "
        "engine for TTS)."),
    stages=(
        # ROW 4 (2026-09-06): the second production card= lane — the
        # stage names the CARD, not the engine surface. params ARE the
        # card doc (schema-gated at construction: a typo'd knob
        # refuses the Flow(...) line); the worker's CARD BRIDGE
        # composes the doc into the comfyui workflow via the owning
        # arm at run time. The $spell passes construction non-empty
        # and rides expand_inject (the music-native pattern). The
        # "wav" output channel stays EXPLICIT (card_io, the lane
        # wall's precedent) — downstream artifact names don't move.
        Stage(
            id="tts",
            engine="comfyui",
            card="tts",
            description="Qwen3-TTS text to speech via the tts card",
            inputs={"prompt": FromInitial(key="prompt")},
            card_io={"wav": Kind.audio},
            params={
                "model": "qwen3-tts",
                "text": "$prompt",
                "seed": 42,
            },
        ),
    ),
    # ROW-4 TEMPLATE LIBRARY (2026-09-06): the headless surface —
    # prompt rides the existing FromInitial (no overlay needed);
    # seed stamps the CARD DOC field (card= conversion — the arm
    # owns the node injects now, the flow no longer names node 2).
    tool=FlowTool(
        name="speak",
        description=(
            "Qwen3-TTS 12Hz CustomVoice speech in one call — text "
            "in, wav out (pure-ComfyUI audio lane)."),
        properties={
            "prompt": FlowToolProperty(
                ptype=ToolParamType.string,
                description="what to say",
            ),
            "seed": FlowToolProperty(
                ptype=ToolParamType.integer,
                description="voice sampler seed",
                default=42,
                minimum=0,
                maximum=2**31 - 1,
            ),
        },
        required=("prompt",),
        overlays=(
            FlowToolOverlay(
                param="seed",
                stage="tts",
                path=("seed",),
            ),
        ),
    ),
)

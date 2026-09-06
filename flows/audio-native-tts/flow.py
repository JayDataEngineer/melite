"""audio-native-tts — Qwen3-TTS 12Hz CustomVoice via the live
melite-audio-nodes island pack in the serving ComfyUI container.

(2026-09-04 flows rework) Converted from flow.yaml — the
declaration is now typed rows; the hardcoded server_url fossil
DROPPED (the engine's _server_url() config/env seam owns the
endpoint, QUEUE LANE LAW). params are the comfyui engine's surface,
verbatim."""

from pathlib import Path

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
        Stage(
            id="tts",
            engine="comfyui",
            description="Qwen3-TTS text to speech via live ComfyUI nodes",
            inputs={"prompt": FromInitial(key="prompt")},
            # the flow-typed-edges contract: tts wants text
            # (and overrides the comfyui engine default Kind.image
            # with Kind.audio on the named "wav" output)
            expected={"prompt": Kind.text},
            outputs={"wav": Kind.audio},
            params={
                # workflow_file: the qwen3-tts CustomVoice 0.6B
                # template (audio lane, 2026-09-05 fix). The previous
                # hardcoded path (qwen3_tts_gate/tts.json) was a
                # fossil that never existed on disk — the flow 400d
                # at the engine's _splice_workflow gate. The live
                # model classes (plugins/engines/comfyui/models/
                # audio/{qwen3-tts,qwen3-tts-base,qwen3-tts-
                # voicedesign}/) own tts_t1.json; this flow picks
                # the CustomVoice variant.
                "workflow_file": str(
                    Path(__file__).resolve().parent.parent.parent
                    / "plugins/engines/comfyui/models/audio/"
                      "qwen3-tts/tts_t1.json"
                ),
                "inject": {"2.prompt": "$prompt", "2.seed": 42},
                "out_dir": "./output",
                "timeout_s": 1200,
            },
        ),
    ),
    # ROW-4 TEMPLATE LIBRARY (2026-09-06): the headless surface —
    # prompt rides the existing FromInitial (no overlay needed);
    # seed stamps node 2 (AudiocoreTTS — seed input verified in
    # tts_t1.json, not assumed).
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
                path=("inject", "2.seed"),
            ),
        ),
    ),
)

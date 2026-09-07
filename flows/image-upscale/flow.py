"""image-upscale — THE first two-card flow (ROW 4 conversion,
2026-09-07).

Date: 2026-09-07 · Status: landed (design record
docs/design/row4-executor-tts-lane.md §image-upscale; supersedes
the single-graph sample of docs/design/flow-single-tool.md — the
template + slots surface became two card= stages).

Text → image → 1080p upscale, one card per stroke: the `make`
stage composes the image-gen card (the arm renders the named
model's own generate_t2i.json — krea-2 or z-image), the `polish`
stage composes the upscale-tools card (SeedVR2 chain). Both stages
name their model row (params.model — the bridge pops it into the
compose ENVELOPE arg); the artifact handoff rides the typed edge
make.image → polish.input_image (Kind.image, FILE-kind
absolutization at the runner seam).

The docstring's old node graphs are GONE — a card= flow never
names nodes (the arms own the injects; the flow names CARDS and
their doc knobs). The tool surface is unchanged: image_model picks
the generator, seed stamps BOTH stages (a FlowToolOverlay per
stage — the overlay path now speaks the card doc, not the
workflow), prompt rides the $prompt channel.
"""

from flow import (
    Flow,
    FlowTool,
    FlowToolOverlay,
    FlowToolProperty,
    FromInitial,
    FromStage,
    Kind,
    Stage,
    ToolParamType,
)

FLOW = Flow(
    id="image-upscale",
    description=(
        "Prompt → image → 1080p SeedVR2 upscale, one card per "
        "stroke (the first two-card flow: image-gen + "
        "upscale-tools card= stages; image_model picks the "
        "generator)."),
    stages=(
        Stage(
            id="make",
            engine="comfyui",
            card="image-gen",
            description=(
                "T2I via the image-gen card (the named model's own "
                "generate_t2i.json)"),
            inputs={"prompt": FromInitial(key="prompt")},
            card_io={"image": Kind.image},
            params={
                "model": "krea-2",
                "prompt": "$prompt",
                "seed": 42,
            },
        ),
        Stage(
            id="polish",
            engine="comfyui",
            card="upscale-tools",
            description=(
                "SeedVR2 1080p upscale via the upscale-tools card"),
            inputs={
                "image": FromStage(stage="make",
                                   output="image"),
            },
            card_io={"image": Kind.image},
            params={
                "model": "seedvr2_ema",
                # the $spell names the WIRED INPUT ("image" — the
                # registry kind_inputs key): the merged path's link
                # pass rewrites it to the upstream Save producer;
                # the per-stage path's _deep_expand substitutes from
                # the resolved inputs pool
                "input_image": "$image",
                "filename_prefix": "image-upscale",
                "seed": 42,
            },
        ),
    ),
    skill_refs=(
        "card:image-gen",
        "card:upscale-tools",
        "model:krea-2",
        "model:krea-2:prompt-enhance",
        "model:z-image:prompt-enhance",
    ),
    tool=FlowTool(
        name="image_upscale",
        description=(
            "Generate an image from a prompt and upscale it to 1080p "
            "in one call (krea-2 or z-image generator, SeedVR2 upscale "
            "always on). One POST runs the whole flow."),
        properties={
            "image_model": FlowToolProperty(
                ptype=ToolParamType.string,
                description="the generator family (no default: pick one)",
                enum=("krea-2", "z-image"),
            ),
            "prompt": FlowToolProperty(
                ptype=ToolParamType.string,
                description="what to generate (up to 4000 chars)",
            ),
            "seed": FlowToolProperty(
                ptype=ToolParamType.integer,
                description="sampler seed",
                default=42,
                minimum=0,
                maximum=2**31 - 1,
            ),
        },
        required=("image_model", "prompt"),
        overlays=(
            FlowToolOverlay(
                param="image_model",
                stage="make",
                path=("model",),
                choices={
                    "krea-2": "krea-2",
                    "z-image": "z-image",
                },
            ),
            FlowToolOverlay(
                param="seed",
                stage="make",
                path=("seed",),
            ),
            FlowToolOverlay(
                param="seed",
                stage="polish",
                path=("seed",),
            ),
        ),
    ),
)

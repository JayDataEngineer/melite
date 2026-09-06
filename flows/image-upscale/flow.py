"""image-upscale — the headless single-tool sample (2026-09-06).

Date: 2026-09-06 · Status: landed (design record
docs/design/flow-single-tool.md — the comfy-mcp shape: a template +
slots surface so ONE tool call runs the flow).

Text → image → 1080p upscale in ONE comfyui stage (gen and upscale
chained IN-GRAPH: a multi-stage comfyui→comfyui file handoff does
not resolve — the engine returns {prompt_id} into carry, never
upstream file paths — so the SeedVR2 chain hangs off VAEDecode in
the same workflow; the anny-hmr precedent).

The headless surface is tool=FlowTool(...): image_model in
{krea-2, z-image} selects the baked variant graph (overlay choices),
seed stamps the sampler, prompt rides the $prompt engine-ABI channel
(str scalars only in initial_pool — the seed is an int, so it goes
by overlay, not by channel). Upscale is BAKED true (no bypass knob:
a bypass would fork a second graph shape needing its own skill
version — the design record says no).

Node facts are verbatim from the estate graphs
(plugins/engines/comfyui/models/image/krea-2/generate_t2i.json,
z-image/generate_t2i.json, seedvr2_ema/seedvr2_t1.json) — NEVER
retyped from memory; the T2I half keeps each family's loader/CLIP/
VAE/cfg facts (krea-2: krea2 CLIP + qwen_image_vae, cfg 4.5, bare
unet; z-image: AuraFlow shift 3, lumina2 CLIP, ae.safetensors, cfg
1.0), and both hang the verbatim SeedVR2 chain off VAEDecode.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, model_validator

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
from melite_cards.validators import JsonValue


class HeadlinePrompt(BaseModel):
    """The compile-time prompt door: the wire STRING, non-empty,
    capped (a 40k-char paste 4xxes at start/validate — BEFORE any
    run registers — never as a CLIP traceback after a GPU claim)."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    text: str = Field(min_length=1, max_length=4000)

    @model_validator(mode="before")
    @classmethod
    def _wire_string(cls, v: object) -> object:
        if isinstance(v, str):
            return {"text": v}
        return v


# The verbatim SeedVR2 chain (seedvr2_t1.json), hung off VAEDecode:
# LoadImage drops out (the T2I pixels feed the upscaler in-graph),
# everything else rides byte-identical, seed string included.
_UPSCALE_NODES: dict[str, JsonValue] = {
    "SeedVR2LoadDiTModel.0": {
        "class_type": "SeedVR2LoadDiTModel",
        "inputs": {
            "attention_mode": "sdpa",
            "blocks_to_swap": 0,
            "cache_model": False,
            "device": "cuda:0",
            "model": "seedvr2_ema_3b_fp16.safetensors",
            "offload_device": "none",
            "swap_io_components": False,
        },
    },
    "SeedVR2LoadVAEModel.0": {
        "class_type": "SeedVR2LoadVAEModel",
        "inputs": {
            "cache_model": False,
            "decode_tile_overlap": 128,
            "decode_tile_size": 1024,
            "decode_tiled": False,
            "device": "cuda:0",
            "encode_tile_overlap": 128,
            "encode_tile_size": 1024,
            "encode_tiled": False,
            "model": "ema_vae_fp16.safetensors",
            "offload_device": "none",
            "tile_debug": "false",
        },
    },
    "SeedVR2VideoUpscaler.0": {
        "class_type": "SeedVR2VideoUpscaler",
        "inputs": {
            "batch_size": "1",
            "color_correction": "lab",
            "dit": ["SeedVR2LoadDiTModel.0", 0],
            "enable_debug": False,
            "image": ["VAEDecode.0", 0],
            "input_noise_scale": 0.0,
            "latent_noise_scale": 0.0,
            "max_resolution": "4096",
            "offload_device": "cpu",
            "prepend_frames": 0,
            "resolution": "1080",
            "seed": "42",
            "temporal_overlap": 0,
            "uniform_batch_size": True,
            "vae": ["SeedVR2LoadVAEModel.0", 0],
        },
    },
}


def _krea_graph() -> dict[str, JsonValue]:
    """krea-2 T2I half (generate_t2i.json verbatim: krea2 CLIP +
    qwen_image_vae, cfg 4.5, bare unet) + the upscale chain."""
    return {
        "UNETLoader.0": {
            "class_type": "UNETLoader",
            "inputs": {
                "unet_name": "krea2_turbo_int8_convrot.safetensors",
                "weight_dtype": "default",
            },
        },
        "CLIPLoader.0": {
            "class_type": "CLIPLoader",
            "inputs": {
                "clip_name": "qwen3vl_4b_fp8_scaled.safetensors",
                "type": "krea2",
            },
        },
        "VAELoader.0": {
            "class_type": "VAELoader",
            "inputs": {"vae_name": "qwen_image_vae.safetensors"},
        },
        "CLIPTextEncode.0": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": "$prompt", "clip": ["CLIPLoader.0", 0]},
        },
        "CLIPTextEncode.1": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": "", "clip": ["CLIPLoader.0", 0]},
        },
        "EmptySD3LatentImage.0": {
            "class_type": "EmptySD3LatentImage",
            "inputs": {"width": 1024, "height": 1024, "batch_size": 1},
        },
        "KSampler.0": {
            "class_type": "KSampler",
            "inputs": {
                "seed": 42,
                "steps": 8,
                "cfg": 4.5,
                "sampler_name": "res_multistep",
                "scheduler": "simple",
                "denoise": 1.0,
                "model": ["UNETLoader.0", 0],
                "positive": ["CLIPTextEncode.0", 0],
                "negative": ["CLIPTextEncode.1", 0],
                "latent_image": ["EmptySD3LatentImage.0", 0],
            },
        },
        "VAEDecode.0": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["KSampler.0", 0],
                "vae": ["VAELoader.0", 0],
            },
        },
        **_UPSCALE_NODES,
        "SaveImage.0": {
            "class_type": "SaveImage",
            "inputs": {
                "images": ["SeedVR2VideoUpscaler.0", 0],
                "filename_prefix": "image-upscale-krea2",
            },
        },
    }


def _zimage_graph() -> dict[str, JsonValue]:
    """z-image T2I half (generate_t2i.json verbatim: AuraFlow shift 3,
    lumina2 CLIP, ae.safetensors, cfg 1.0) + the upscale chain."""
    return {
        "UNETLoader.0": {
            "class_type": "UNETLoader",
            "inputs": {
                "unet_name": "z_image_turbo_int8_convrot.safetensors",
                "weight_dtype": "default",
            },
        },
        "ModelSamplingAuraFlow.0": {
            "class_type": "ModelSamplingAuraFlow",
            "inputs": {"model": ["UNETLoader.0", 0], "shift": 3},
        },
        "CLIPLoader.0": {
            "class_type": "CLIPLoader",
            "inputs": {
                "clip_name": "qwen_3_4b.safetensors",
                "type": "lumina2",
            },
        },
        "VAELoader.0": {
            "class_type": "VAELoader",
            "inputs": {"vae_name": "ae.safetensors"},
        },
        "CLIPTextEncode.0": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": "$prompt", "clip": ["CLIPLoader.0", 0]},
        },
        "CLIPTextEncode.1": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": "", "clip": ["CLIPLoader.0", 0]},
        },
        "EmptySD3LatentImage.0": {
            "class_type": "EmptySD3LatentImage",
            "inputs": {"width": 1024, "height": 1024, "batch_size": 1},
        },
        "KSampler.0": {
            "class_type": "KSampler",
            "inputs": {
                "seed": 42,
                "steps": 8,
                "cfg": 1.0,
                "sampler_name": "res_multistep",
                "scheduler": "simple",
                "denoise": 1.0,
                "model": ["ModelSamplingAuraFlow.0", 0],
                "positive": ["CLIPTextEncode.0", 0],
                "negative": ["CLIPTextEncode.1", 0],
                "latent_image": ["EmptySD3LatentImage.0", 0],
            },
        },
        "VAEDecode.0": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["KSampler.0", 0],
                "vae": ["VAELoader.0", 0],
            },
        },
        **_UPSCALE_NODES,
        "SaveImage.0": {
            "class_type": "SaveImage",
            "inputs": {
                "images": ["SeedVR2VideoUpscaler.0", 0],
                "filename_prefix": "image-upscale-zimage",
            },
        },
    }


FLOW = Flow(
    id="image-upscale",
    description=(
        "Headless sample (docs/design/flow-single-tool.md): prompt → "
        "image → 1080p SeedVR2 upscale in one call. image_model picks "
        "the generator (krea-2, z-image); the upscale is always on."),
    stages=(
        Stage(
            id="make",
            engine="comfyui",
            description="T2I + SeedVR2 upscale, one in-graph chain",
            inputs={"prompt": FromInitial(key="prompt")},
            expected={"prompt": Kind.text},
            outputs={"image": Kind.image},
            params={
                "out_dir": "./output",
                "timeout_s": 1800,
                # the readable default (== the tool default): the
                # image_model overlay choices replace this whole graph
                # at the door, so this literal only documents the shape.
                "workflow": _zimage_graph(),
            },
        ),
    ),
    initial_validators={"prompt": HeadlinePrompt},
    skill_refs=(
        # Every ref resolves today (seedvr2_ema ships no model docs —
        # upscale craft rides card:upscale-tools — so no dangling ref:
        # an unresolvable ref skips LOUDLY, never silently).
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
                path=("workflow",),
                choices={
                    "krea-2": _krea_graph(),
                    "z-image": _zimage_graph(),
                },
            ),
            FlowToolOverlay(
                param="seed",
                stage="make",
                path=("workflow", "KSampler.0", "inputs", "seed"),
            ),
        ),
    ),
)

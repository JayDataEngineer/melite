"""plugin.py — comfyui plugin declaration (plugin.yaml flip, 2026-09-02)."""

import json
import os


def _pin_vocab(field: str) -> tuple[str, ...]:
    """Sampler/scheduler vocabulary DERIVED from the object_info pin
    (PYTHON SHAPE LAW rung 6 — no restated coordinates: the hand-typed
    13-sampler tuple lagged the engine and refused legal values like
    res_multistep, live-probed 2026-09-05). The pin is the SSOT; the
    KSampler node's option list IS the engine's truth. A stale pin is
    refreshed through the explicit door (co_script.refresh_snapshot),
    never papered over here."""
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "data", "object_info.json"),
              encoding="utf-8") as f:
        node = json.load(f)["KSampler"]["input"]["required"]
    return tuple(sorted(node[field][0]))


class Plugin:
    id = "comfyui"
    label = "ComfyUI"
    description = "Managed ComfyUI engine — all diffusion-based generations (image, video, audio, 3D, TTS)"
    engines = ("comfyui",)
    genres = ("image", "video", "audio", "3d", "motion", "other")
    webui = {
        "url": "http://127.0.0.1:18465",
        "label": "ComfyUI Graph Editor",
        "description": "Node-based diffusion workflow editor — queue jobs, wire nodes, watch live preview",
        "features": ("websocket", "sse"),
        "icon": "🎨",
    }
    dependencies = (
        {"source": "github.com/comfyui/comfyui", "commit": "v0.3.12"},
        {"source": "pip", "packages": ("torch>=2.1.0", "torchvision", "diffusers", "transformers", "safetensors")},
        {"source": "custom_nodes", "path": "custom_nodes/"},
        {"source": "pip", "packages": ("comfy-script==0.6.1",)},
    )
    # field options (field_options.yaml flip, 2026-09-02) — derived
    # from the pin (see _pin_vocab), never restated by hand.
    samplers = _pin_vocab("sampler_name")
    schedulers = _pin_vocab("scheduler")

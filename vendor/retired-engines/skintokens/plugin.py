"""plugin.py — skintensors plugin declaration (compose-first shape,
the autoremesher precedent).

skin-tokens.cpp (localai-org, Apache-2.0; MIT upstream weights) —
the SkinTokens/TokenRig GGML port: static mesh → generated skeleton
+ learned skin weights → rigged GLB, on CPU (Vulkan available; the
CPU lane never contends with the ComfyUI GPU — a second bloodstream
like audio).

The station it fills (dev_docs/design/auto-rig-skintokens.md): anny's
baked body / a trellis lift is a STATUE; this is the
statue → animatable-character leg of the chain.
"""


class Plugin:
    id = "skintokens"
    label = "SkinTokens"
    description = ("Auto-rig — static mesh GLB → generated skeleton + "
                   "learned skin weights → rigged GLB (SkinTokens/"
                   "TokenRig on GGML, CPU lane)")
    engines = ("skintokens",)
    genres = ("3d",)
    webui = {
        "url": None,
        "label": "Auto Rig",
        "description": "Neural skeleton + skin-weight generation for static meshes",
        "features": (),
        "icon": "🦴",
    }

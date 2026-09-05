"""card_requires.py — validate that a card's declared extensions are installed.

Each card.yaml may carry a top-level 'requires' list: extension names that
the card's graph templates need.  This module resolves those names against
the live ComfyUI object_info and the workspace's custom_nodes directory to
produce a gate verdict.

Law: a card with non-empty requires that cannot be satisfied must REFUSE
(compose rc -5) before any graph is emitted.  The check is best-effort —
if the server is unreachable the check is skipped (returns ok) so local
development is not blocked.

Extension name resolution:
  1. The name is looked up in extensions.yaml files (our registry).
  2. If found there, the check maps the extension name to its expected
     node class types and verifies they appear in object_info.
  3. If NOT found in extensions.yaml, the name is treated as an
     in-tree pack dir under vendor/comfyui_extensions (EXTENSION LAW:
     our authored packs are submodules there) and checked on disk.
"""

from __future__ import annotations

import json
import os
import urllib.request
from pathlib import Path

# The object_info shape: decoded JSON (objects, arrays, scalars).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

# Extension name → set of node class types it provides (curated).
# When a card declares requires: ["ComfyUI-KJNodes"], we verify that
# at least some of these nodes appear in object_info.
EXTENSION_NODE_TYPES: dict[str, set[str]] = {
    # the chaining rail (NikoDemon80/ComfyUI-H3-Motion-Context)
    "comfyui-h3-motion-context": {
        "MiniMaxH3MotionContext", "MiniMaxH3MotionContextTrim",
        "MiniMaxH3MotionContextSaveLatent", "MiniMaxH3MotionContextLoadLatent",
    },
    "ComfyUI-PlagueKind-Nodes": {"PlagueKindBundleIn", "PlagueKindBundleOut",
                                 "H3SLAAttention", "H3AdaLNLoRAFix"},
    "ComfyUI-Frame-Interpolation": {"FrameInterpolate", "FrameInterpolationModelLoader"},
    "ComfyUI-KJNodes": {
        "ImageSharpenKJ", "ModelAttentionBackend", "ModelPreviewOverrideKJ",
    },
    "ComfyUI-SeedVR2_VideoUpscaler": {
        "SeedVR2LoadDiTModel", "SeedVR2LoadVAEModel", "SeedVR2VideoUpscaler",
    },
    "ComfyUI-LTXVideo": {"LTX_lora_loader", "CreateVideo"},
    "melite-audio-nodes": {
        "MiniMaxMusic3TextEncode", "EmptyMiniMaxMusic3LatentAudio",
        "SaveAudioAdvanced", "AudiocoreTTS", "LoadAudiocoreModel",
    },
    "melite-anny-estimator-nodes": {
        "MultiHMR2ImageToAnny", "AnnyFitOptimize",
    },
    "melite-kimodo-nodes": {"KimodoLoader", "KimodoTextToPose"},
    "qweneditutils": {"TextEncodeQwenImageEditPlus"},
    "vnccs_utils": {"ModelSamplingAuraFlow", "UniCanvasNode"},
    "comfyui-impact-pack": {"FaceDetailer", "SAMLoader", "UltralyticsDetectorProvider"},
    "comfyui-lanpaint": {"LanPaintSampler", "LanPaintInpaint"},
    "ComfyUI-GGUF": {"GGUFUnetLoader", "GGUFCLIPLoader"},
    # Native-core capability gates (2026-09-06 img-to-mesh live-fire).
    # TRELLIS.2/Pixal3D/MoGe-FOV ship in comfy_extras on ComfyUI 0.34+
    # and are absent before it: capability, never a version string.
    # MoGe is FOV-only on purpose (0.33 already carries LoadMoGeModel
    # + MoGeInference, but pixal-auto dies without the FOV node).
    "comfyui-core-trellis2": {
        "Trellis2Conditioning", "EmptyTrellis2LatentStructure",
        "Trellis2ShapeStage", "Trellis2TextureStage",
        "VaeDecodeStructureTrellis2", "VaeDecodeShapeTrellis",
        "VaeDecodeTextureTrellis", "Pixal3DConditioning",
    },
    "ComfyUI-MoGe": {"MoGeGeometryToFOV"},
    "melite-autorig-nodes": {"KimodoTransferWeights", "SaveRiggedModel"},
}


def _fetch_object_info(server_url: str, timeout: float = 5.0) -> dict[str, JsonValue] | None:
    """Fetch object_info from a running ComfyUI instance. Returns None on failure."""
    try:
        req = urllib.request.Request(
            f"{server_url.rstrip('/')}/object_info",
            headers={"Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read())
    except Exception:
        return None


def _extension_on_disk(ext_name: str, custom_nodes_dir: str) -> bool:
    """Check if an extension directory exists in custom_nodes."""
    # Case-insensitive directory match
    lower = ext_name.lower()
    if not os.path.isdir(custom_nodes_dir):
        return False
    for entry in os.listdir(custom_nodes_dir):
        if entry.lower() == lower:
            return True
    return False


def check_card_requires(
    requires: list[str] | None,
    server_url: str = "http://127.0.0.1:18465",
    custom_nodes_dir: str | None = None,
) -> tuple[bool, str]:
    """Check that all required extensions are available.

    Args:
        requires: list of extension names from card.yaml 'requires' field.
        server_url: ComfyUI server URL for object_info lookup.
        custom_nodes_dir: path to custom_nodes/ inside the ComfyUI workspace.

    Returns:
        (ok, message) — ok=True means all requirements satisfied.
        ok=False means one or more extensions are missing; message lists them.
    """
    if not requires:
        return True, ""

    # Fetch object_info if possible
    object_info = _fetch_object_info(server_url)
    object_info_set = set(object_info.keys()) if object_info else set()

    missing = []
    for ext_name in requires:
        ext_lower = ext_name.strip()

        # Strategy 1: check known node types against object_info
        expected_nodes = EXTENSION_NODE_TYPES.get(ext_lower)
        if expected_nodes and object_info_set:
            found = expected_nodes & object_info_set
            if found:
                continue  # at least some nodes present — extension is loaded
            # None of the expected nodes found — try disk check as fallback

        # Strategy 2: check custom_nodes directory for the extension
        if custom_nodes_dir and _extension_on_disk(ext_lower, custom_nodes_dir):
            continue

        # Strategy 3: for unknown extensions (no node mapping), check
        # if the name matches any loaded node type (heuristic).
        if object_info_set and not expected_nodes:
            lower_name = ext_lower.lower().replace("-", "").replace("_", "")
            matched = False
            for node_name in object_info_set:
                if lower_name in node_name.lower().replace("-", "").replace("_", ""):
                    matched = True
                    break
            if not matched:
                missing.append(ext_lower)
            continue

        # If we got here with a KNOWN mapping, the extension could not
        # be confirmed: either the server is unreachable (cannot
        # verify) or it is LIVE and verifiably lacks the expected
        # nodes with no disk fallback. Both are MISSING — never an
        # assumed install (the T7 no-false-positive law; the
        # silent-pass era let a known-but-not-installed extension
        # through whenever the server answered at all).
        if expected_nodes:
            missing.append(ext_lower)

    if missing:
        return False, (
            "missing required extensions: %s — install them with "
            "'comfy node install <name>@<version>' or "
            "'dsh mcp comfy-mcp install_node names=[...]'"
            % ", ".join(sorted(missing))
        )

    return True, ""

"""GPU canary — the TRELLIS.2 native lane (cluster C).

Image → textured .glb through the queue on ComfyUI's NATIVE
Trellis.2 core (8 classes, five loaders, no extension packs).
Deselect-by-default (VRAM serial law); run with -m gpu.

BLOCKED on this box while the vLLM EngineCore backbone holds
~22.5/24.5 GiB (session backbone — never killed): the lane peaks
~8 GiB (int8). Runs when the GPU frees.

Truth pinned: the artifact is a .glb carrying baked texture
(ApplyTextureToMesh → MeshToFile3D → Save3DAdvanced), named by the
filename_prefix.
"""

import pytest

pytestmark = pytest.mark.gpu


def test_trellis_img_to_mesh(gateway, assets):
    """The standard lift: one image → one textured .glb."""
    door = gateway
    run_id = door.submit({
        "model": "trellis2-native",
        "params": {
            "input_image": assets["source"],
            "seed": 42,
            "resolution": "1024",
            "steps": 12,
            "cfg": 3.0,
            "bg_removal": "auto",
            "filename_prefix": "trellis_canary",
        },
    })
    out = door.wait(run_id, timeout_s=1800)
    names = [p.name for p in door.artifacts_on_disk(out)]
    assert any(n.endswith(".glb") and "trellis_canary" in n
               for n in names), names


def test_trellis_hero_upsample(gateway, assets):
    """The 1536 branch: the upsample stage inserts — same .glb
    contract, heavier walk."""
    door = gateway
    run_id = door.submit({
        "model": "trellis2-native",
        "params": {
            "input_image": assets["source"],
            "seed": 42,
            "resolution": "1536",
        },
    })
    out = door.wait(run_id, timeout_s=2400)
    names = [p.name for p in door.artifacts_on_disk(out)]
    assert any(n.endswith(".glb") for n in names), names

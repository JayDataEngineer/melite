"""GPU canary — the MOTION lane (cluster C stopgap).

Kimodo text→pose through the queue on OUR OWN packs (the ray-era
hand-rolls, operator stopgap order 2026-09-04): melite-kimodo-nodes
(KimodoLoader + KimodoTextToPose) + melite-poser-nodes (RaySomaxBake).
Deselect-by-default (VRAM serial law); run with -m gpu.

BLOCKED on this box while the vLLM EngineCore backbone holds
~22.5/24.5 GiB (session backbone — never killed): the kimodo loader
peaks ~17 GiB. Runs when the GPU frees.

Truth pinned: the NPZ lands in the run output (kimodo_pose_*), and a
preview_glb chains the somax bake (somax_bake*.glb — the motion
skinned onto the SOMAX-rigged character).
"""

import pytest
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from conftest import QueueDoor

pytestmark = pytest.mark.gpu


def test_motion_text_to_pose(gateway: "QueueDoor") -> None:
    """Bare generation: one prompt → one SOMA-77 NPZ on disk."""
    door = gateway
    # FLAT (flows rework 2026-09-05): card params ride top-level —
    # a nested "params" key double-wraps and 400s at phase 1.
    run_id = door.submit({
        "model": "kimodo",
        "prompt": "a person takes two steps forward, then looks over the left shoulder",
        "seed": 42,
        "duration_sec": 4.0,
        "diffusion_steps": 15,   # canary economy: short but real diffusion
        "cfg_type": "separated",
    })
    out = door.wait(run_id, timeout_s=1800)
    names = [p.name for p in door.artifacts_on_disk(out)]
    assert any("kimodo_pose" in n and n.endswith(".npz") for n in names), names


def test_motion_somax_bake(gateway: "QueueDoor",
                           assets: dict[str, str | None]) -> None:
    """The character arc: NPZ skinned onto a SOMAX-rigged GLB — the
    animated GLB artifact (the anny stopgap consumption)."""
    if not assets["rigged_glb"]:
        pytest.skip("canonical rig GLB missing — add rigged_char_canonical.glb"
                    " to tests/integration/assets/ (the bake gate holds ONLY"
                    " on canonical SOMAX-77 offsets)")
    door = gateway
    run_id = door.submit({
        "model": "kimodo",
        "prompt": "a person waves with the right hand, smiling",
        "seed": 7,
        "duration_sec": 3.0,
        "diffusion_steps": 15,
        "preview_glb": assets["rigged_glb"],
    })
    out = door.wait(run_id, timeout_s=1800)
    names = [p.name for p in door.artifacts_on_disk(out)]
    assert any("kimodo_pose" in n for n in names), names
    assert any("somax_bake" in n and n.endswith(".glb") for n in names), names

"""GPU canary — the MASK lane (B-cluster).

RT-DETR proposes, SAM3 refines: a real photo → real mask PNGs through
the queue. deselect-by-default (VRAM serial law); run with -m gpu.

Truth pinned: the graph rides NATIVE core nodes (RTDETR_detect /
SAM3_Detect / comfy_extras — no extension pack), the sam3.1
multiplex checkpoint + rt_detr_v4 unet (the lane_inputs rows), and
the flat body selection is the primary (RTDETR boxes → SAM3 refine →
mask_combined + detect_boxes manifest).
"""

import pytest
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from conftest import QueueDoor

pytestmark = pytest.mark.gpu


def test_mask_body_primary(gateway: "QueueDoor",
                           assets: dict[str, str | None]) -> None:
    """Bare flat run: body primary → mask_combined + the drawn box
    manifest (the instance readback)."""
    door = gateway
    # FLAT (flows rework 2026-09-05): card params ride top-level —
    # a nested "params" key double-wraps and 400s at phase 1.
    run_id = door.submit({
        "model": "mask-studio",
        "input_image": assets["source"],
        "detect_mode": "body",
        "detection_threshold": 0.3,
        "sam_threshold": 0.9,
        "sam_dilation": 4,
        "export_boxes": True,
    })
    out = door.wait(run_id, timeout_s=600)
    arts = door.artifacts_on_disk(out)
    names = [p.name for p in arts]
    assert any("mask_combined" in n for n in names), names
    assert any("detect_boxes" in n for n in names), names


def test_mask_recipe_multi(gateway: "QueueDoor",
                           assets: dict[str, str | None]) -> None:
    """The recipe form: primary body + an open-vocabulary sam3
    selection (the text lane) — two masks from one run."""
    door = gateway
    recipe = ('[{"selection": {"kind": "detect", "class": "body"}},'
              ' {"selection": {"kind": "sam3", "prompt": "the red hat"}}]')
    run_id = door.submit({
        "model": "mask-studio",
        "input_image": assets["source"],
        "outputs": recipe,
        "export_boxes": False,
    })
    out = door.wait(run_id, timeout_s=600)
    names = [p.name for p in door.artifacts_on_disk(out)]
    assert any("mask_combined" in n for n in names), names
    assert any("mask_sam3" in n for n in names), names

"""GPU canary — the anny card: character body turnaround.

body GLB → CompositeCharacter → 8-view turnaround; source photo →
SAM part sprites. (DESCOPE 2026-09-05: hair/outfit inputs left the
card — clothing composite returns as its own trellis-clothing card;
the canary rides body-only.) The queue door is the ONLY inference
path (INFERENCE LAW); this canary rides it end to end on the managed
ComfyUI.
"""

import pytest
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from conftest import QueueDoor

pytestmark = pytest.mark.gpu


def test_anny_assemble_turnaround(gateway: "QueueDoor",
                                  assets: dict[str, str | None]) -> None:
    """Body in, character out: the turnaround renders 8 views and
    the SAM ingest produces part sprites from the source photo."""
    if not assets["rigged_glb"]:
        pytest.skip("canonical rig GLBs missing — add rigged_char_canonical.glb"
                    " + outfit_cap.glb to tests/integration/assets/")
    door = gateway
    # FLAT (flows rework 2026-09-05): card params ride top-level —
    # a nested "params" key double-wraps and 400s at phase 1.
    run_id = door.submit({
        "model": "anny",
        "test": True,
        "body_glb": str(Path(assets["rigged_glb"]).parent
                          / "rigged_char.glb"),   # bary body: blender-strict importable (the canonical
        # rig fails Blender 4.2 gltf decode — noted defect)
        "source_image": assets["source"],
        "resolution": 512,
    })
    status = door.wait(run_id, timeout_s=600)
    assert status["status"] == "completed", status
    arts = door.artifacts_on_disk(status)
    names = [p.name for p in arts]
    # the turnaround: 8 view PNGs (front .. front_left)
    views = [n for n in names if n.startswith("anny_")
             and n.endswith(".png")]
    assert len(views) >= 8, "turnaround incomplete: %s" % names
    # the ingest: SAM part segments (sam_hair / sam_outfit) + the
    # composite GLB itself — the assembled character
    segs = [n for n in names if n.startswith("sam_") and n.endswith(".png")]
    assert len(segs) >= 1, "SAM segments missing: %s" % names
    assert any(n.startswith("composite_character") and n.endswith(".glb")
               for n in names), "composite GLB missing: %s" % names

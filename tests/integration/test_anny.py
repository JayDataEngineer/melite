"""GPU canary — the anny card (C2 stopgap): character assembly.

body GLB → CompositeCharacter → 8-view turnaround; source photo →
SAM part sprites. The queue door is the ONLY inference path
(INFERENCE LAW); this canary rides it end to end on the managed
ComfyUI.
"""

import pytest
from pathlib import Path

pytestmark = pytest.mark.gpu


def test_anny_assemble_turnaround(gateway, assets):
    """Parts in, character out: the composite renders 8 views and
    the SAM ingest produces part sprites from the source photo."""
    if not assets["rigged_glb"]:
        pytest.skip("canonical rig GLBs missing — add rigged_char_canonical.glb"
                    " + outfit_cap.glb to tests/integration/assets/")
    door = gateway
    run_id = door.submit({
        "model": "anny",
        "test": True,
        "params": {
            "body_glb": str(Path(assets["rigged_glb"]).parent
                              / "rigged_char.glb"),   # bary body: blender-strict importable (the canonical
            # rig fails Blender 4.2 gltf decode — noted defect)
            "hair_glb": str(Path(assets["rigged_glb"]).parent
                              / "outfit_cap.glb"),
            "source_image": assets["source"],
            "resolution": 512,
        },
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

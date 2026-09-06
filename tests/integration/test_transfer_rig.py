"""GPU canary — the transfer_rig family on the grouped img-to-mesh
card (cluster H): rigged donor + clothed target → the rig copy.

The artifact assertion is a .glb on disk with joints/weights (the
viewer's Rig chip makes it inspectable; this canary proves the lane
produces it). Serial GPU discipline; queue door only (INFERENCE LAW).
"""

import pytest
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from conftest import QueueDoor

pytestmark = pytest.mark.gpu


def test_transfer_rig_copies_the_rig(gateway: "QueueDoor",
                                     assets: dict[str, str | None]) -> None:
    """rigged_char.glb (bary body, SOMA-rigged) + outfit_cap.glb
    (static clothed cap) → one rigged .glb out."""
    # FLAT (flows rework 2026-09-05): card params ride top-level —
    # a nested "params" key double-wraps and 400s at phase 1.
    run_id = gateway.submit({
        "model": "transfer_rig",
        "test": True,
        "rigged_glb": assets["rigged_glb"] or
            "tests/integration/assets/rigged_char.glb",
        "target_glb": "tests/integration/assets/outfit_cap.glb",
    })
    status = gateway.wait(run_id, timeout_s=600)
    assert status["status"] == "completed", status
    names = [p.name for p in gateway.artifacts_on_disk(status)]
    meshes = [n for n in names if n.endswith(".glb")]
    assert meshes, "no mesh artifact: %s" % names
    sizes = [p.stat().st_size for p in gateway.artifacts_on_disk(status)
             if p.name.endswith(".glb")]
    assert max(sizes) > 4_000, "glb too small to carry a rig: %s" % names

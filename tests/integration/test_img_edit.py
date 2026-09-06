"""img-edit through the queue — real inference (qwen-img-edit-2511
lane) with a committed feed-in asset.

The input_image contract: a path on the gateway's filesystem; compose
stages it into the engine's input dir and injects the staged name
into LoadImage.0.image. The asset is deterministic (GPU output may
vary; the feed may not).
"""

import pytest
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from conftest import QueueDoor

pytestmark = pytest.mark.gpu


def test_edit_with_feed_image(gateway: "QueueDoor",
                              assets: dict[str, str | None]) -> None:
    # FLAT (flows rework 2026-09-05): card params ride top-level —
    # a nested "params" key double-wraps and 400s at phase 1.
    run_id = gateway.submit({
        "model": "qwen-img-edit-2511",
        "prompt": "night scene, cool moonlight over the water, "
                  "the sun becomes the moon",
        "input_image": assets["source"],
        "seed": 3,
    })
    status = gateway.wait(run_id, timeout_s=900)
    assert status["status"] == "completed", status.get("error")
    arts = gateway.artifacts_on_disk(status)
    assert all(a.suffix == ".png" for a in arts), arts

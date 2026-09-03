"""img-edit through the queue — real inference (qwen-img-edit-2511
lane) with a committed feed-in asset.

The input_image contract: a path on the gateway's filesystem; compose
stages it into the engine's input dir and injects the staged name
into LoadImage.0.image. The asset is deterministic (GPU output may
vary; the feed may not).
"""

import pytest

pytestmark = pytest.mark.gpu


def test_edit_with_feed_image(gateway, assets):
    run_id = gateway.submit({
        "model": "qwen-img-edit-2511",
        "params": {
            "prompt": "night scene, cool moonlight over the water, "
                      "the sun becomes the moon",
            "input_image": assets["source"],
            "seed": 3,
        },
    })
    status = gateway.wait(run_id, timeout_s=900)
    assert status["status"] == "completed", status.get("error")
    arts = gateway.artifacts_on_disk(status)
    assert all(a.suffix == ".png" for a in arts), arts

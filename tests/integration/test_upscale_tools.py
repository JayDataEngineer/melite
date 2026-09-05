"""GPU canary — the upscale-tools card (cluster F): the hidden tool
card's ONE submittable family (seedvr2_ema — the 3B fp16 diffusion
upscale). The five weightless fragments are compose-level walls
(they render offline; proven in test_python_cards + the regen
harness), GPU optional per the F mandate — this canary proves the
lane EXECUTES and the restored png lands.

Serial GPU discipline (pytest -m gpu); the queue door is the ONLY
inference path (INFERENCE LAW).
"""

import pytest
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from conftest import QueueDoor

pytestmark = pytest.mark.gpu


def test_seedvr2_restore(gateway: "QueueDoor",
                         assets: dict[str, str | None]) -> None:
    """seedvr2_ema: input frame → diffusion-restored png."""
    run_id = gateway.submit({
        "model": "seedvr2_ema",
        "test": True,
        "params": {
            "input_image": assets["source"],
            "resolution": 1080, "max_resolution": 4096,
            "batch_size": 1, "seed": 42,
        },
    })
    status = gateway.wait(run_id, timeout_s=1500)
    assert status["status"] == "completed", status.get("error")
    arts = gateway.artifacts_on_disk(status)
    pngs = [a for a in arts if a.suffix == ".png"]
    assert pngs, "no restored png: %s" % [a.name for a in arts]
    assert max(a.stat().st_size for a in pngs) > 20_000, \
        "restored png too small: %s" % [a.name for a in pngs]

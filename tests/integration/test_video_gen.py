"""GPU canary — the video-gen card (cluster E): ONE interface, every
non-h3 family (the img-gen pattern). Each boarded family submits a
minimal film through the queue and asserts the mp4 lands on disk.

Serial GPU discipline (pytest -m gpu); the queue door is the ONLY
inference path (INFERENCE LAW).
"""

from pathlib import Path

import pytest

pytestmark = pytest.mark.gpu


def test_wan_vace_reference_film(gateway, assets):
    """wan-vace: reference image + prompt → one h264 film."""
    run_id = gateway.submit({
        "model": "wan-vace",
        "test": True,
        "params": {
            "prompt": ("the figure turns slowly and raises one hand, "
                       "cloth moving softly"),
            "reference_image": assets["source"],
            "width": 832, "height": 480, "length": 33, "fps": 24,
            "steps": 4, "cfg": 1.0, "seed": 42,
        },
    })
    status = gateway.wait(run_id, timeout_s=1500)
    assert status["status"] == "completed", status
    names = [p.name for p in gateway.artifacts_on_disk(status)]
    films = [n for n in names if n.endswith((".mp4", ".webm"))]
    assert films, "no film artifact: %s" % names
    sizes = [p.stat().st_size for p in gateway.artifacts_on_disk(status)
             if p.name.endswith((".mp4", ".webm"))]
    assert max(sizes) > 20_000, "film too small: %s" % names


def test_scail2_character_animation(gateway, assets):
    """scail2-animate: reference character + driving video → film."""
    drive = str(Path(assets["source"]).parent / "drive_pose.mp4")
    run_id = gateway.submit({
        "model": "scail2-animate",
        "test": True,
        "params": {
            "prompt": "the character moves as driven",
            "reference_image": assets["source"],
            "pose_video": drive,
            "width": 480, "height": 480, "length": 25, "fps": 24,
            "steps": 12, "cfg": 5.0, "seed": 42,
        },
    })
    status = gateway.wait(run_id, timeout_s=2400)
    assert status["status"] == "completed", status
    names = [p.name for p in gateway.artifacts_on_disk(status)]
    films = [n for n in names if n.endswith((".mp4", ".webm"))]
    assert films, "no film artifact: %s" % names
    sizes = [p.stat().st_size for p in gateway.artifacts_on_disk(status)
             if p.name.endswith((".mp4", ".webm"))]
    assert max(sizes) > 20_000, "film too small: %s" % names

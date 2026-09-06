"""Music integration — MiniMax Music 3 through the queue door, on
native ComfyUI core nodes (no extension pack; upstream core carries
EmptyMiniMaxMusic3LatentAudio / MiniMaxMusic3TextEncode). The
A-cluster lead: first audio card off the audio-cpp engine.

GPU-marked: real inference, serial law, artifacts asserted on disk.
"""

import pytest
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from conftest import QueueDoor

pytestmark = pytest.mark.gpu


def test_music_basic(gateway: "QueueDoor",
                     assets: dict[str, str | None]) -> None:
    """Bare music3 submit: structured caption, short duration,
    real .wav lands on disk with bytes."""
    door = gateway          # the fixture IS the QueueDoor
    # FLAT (flows rework 2026-09-05): card params ride top-level —
    # a nested "params" key double-wraps and 400s at phase 1.
    run_id = door.submit({
        "model": "music3",
        "prompt": "ambient, warm analog pad, slow build, 90 BPM, "
                  "no drums, D major",
        "duration": 5,
        "n_diffusion_steps": 8,
        "seed": 7,
    })
    out = door.wait(run_id, timeout_s=900)
    arts = door.artifacts_on_disk(out)   # Paths, verified non-empty
    assert arts[0].suffix in (".wav", ".flac", ".mp3", ".ogg"), arts

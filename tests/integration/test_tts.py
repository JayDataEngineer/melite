"""TTS integration — Qwen3-TTS CustomVoice 0.6B through the queue
door, on the melite-tts-nodes classes (the split pack; live class
names unchanged from the all-in-one). The A-cluster's second wave:
tts/voice-lock/sfx cards off the audio-cpp engine.

GPU-marked: real inference, serial law, artifacts asserted on disk.
"""

import pytest
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from conftest import QueueDoor

pytestmark = pytest.mark.gpu


def test_tts_basic(gateway: "QueueDoor",
                   assets: dict[str, str | None]) -> None:
    """Bare tts submit: one line, preset persona, real audio lands
    on disk with bytes."""
    door = gateway          # the fixture IS the QueueDoor
    # FLAT (flows rework 2026-09-05): card params ride top-level —
    # a nested "params" key double-wraps and 400s at phase 1.
    run_id = door.submit({
        "model": "qwen3-tts",
        "text": "The audio migration is complete. Every card "
                "speaks Python now.",
        "voice": "vivian",
        "temperature": 0.8,
        "seed": 42,
    })
    out = door.wait(run_id, timeout_s=600)
    arts = door.artifacts_on_disk(out)   # Paths, verified non-empty
    assert arts[0].suffix in (".wav", ".flac", ".mp3", ".ogg"), arts

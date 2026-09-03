"""TTS integration — Qwen3-TTS CustomVoice 0.6B through the queue
door, on the melite-tts-nodes classes (the split pack; live class
names unchanged from the all-in-one). The A-cluster's second wave:
tts/voice-lock/sfx cards off the audio-cpp engine.

GPU-marked: real inference, serial law, artifacts asserted on disk.
"""

import pytest

pytestmark = pytest.mark.gpu


def test_tts_basic(gateway, assets):
    """Bare tts submit: one line, preset persona, real audio lands
    on disk with bytes."""
    door = gateway          # the fixture IS the QueueDoor
    run_id = door.submit({
        "model": "qwen3-tts",
        "params": {
            "text": "The audio migration is complete. Every card "
                    "speaks Python now.",
            "voice": "vivian",
            "temperature": 0.8,
            "seed": 42,
        },
    })
    out = door.wait(run_id, timeout_s=600)
    arts = door.artifacts_on_disk(out)   # Paths, verified non-empty
    assert arts[0].suffix in (".wav", ".flac", ".mp3", ".ogg"), arts

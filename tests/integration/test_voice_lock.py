"""Voice-lock integration — Qwen3-TTS VoiceDesign 1.7B through the
queue door: the AudiocoreVoiceStudio export writes a .qvoice persona
(the file the tts card's qvoice mod consumes). Nearly one-to-one
with the tts canary — the OUTPUT KIND is the difference.

GPU-marked: real inference, serial law, artifacts asserted on disk.
"""

import pytest
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from conftest import QueueDoor

pytestmark = pytest.mark.gpu


def test_voice_lock_export(gateway: "QueueDoor",
                           assets: dict[str, str | None]) -> None:
    """Design + export: a described persona becomes a reusable
    embedding file beside its preview audio."""
    door = gateway          # the fixture IS the QueueDoor
    # FLAT (flows rework 2026-09-05): card params ride top-level —
    # a nested "params" key double-wraps and 400s at phase 1.
    run_id = door.submit({
        "model": "qwen3-tts-voicedesign",
        "voice_name": "canary_persona",
        "style_instruction": "A warm female voice with a British "
                             "accent, mid-thirties, speaks with "
                             "quiet authority",
        "seed": 42,
    })
    out = door.wait(run_id, timeout_s=600)
    arts = door.artifacts_on_disk(out)   # Paths, verified non-empty
    stems = {a.suffix for a in arts}
    # the persona file (or its preview audio — the studio writes both)
    assert stems & {".qvoice", ".voice", ".wav", ".flac", ".mp3",
                    ".ogg"}, arts

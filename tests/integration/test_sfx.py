"""SFX integration — MOSS-SFX v2 through the queue door, on the
melite-sfx-nodes classes (AudiocoreTTS family moss_sfx_v2, task
gen — the diffusion params ride the node's optional inputs).

GPU-marked: real inference, serial law, artifacts asserted on disk.
"""

import pytest
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from conftest import QueueDoor

pytestmark = pytest.mark.gpu


def test_sfx_basic(gateway: "QueueDoor",
                   assets: dict[str, str | None]) -> None:
    """Bare sfx submit: describe the SOUND not the scene; short
    clip, few steps — a canary, not a showcase."""
    door = gateway          # the fixture IS the QueueDoor
    run_id = door.submit({
        "model": "moss-sfx",
        "params": {
            "prompt": "deep cinematic whoosh with a metallic tail",
            "duration": 3,
            "n_diffusion_steps": 20,
            "guidance_scale": 5.0,
            "seed": 42,
        },
    })
    out = door.wait(run_id, timeout_s=900)
    arts = door.artifacts_on_disk(out)   # Paths, verified non-empty
    assert arts[0].suffix in (".wav", ".flac", ".mp3", ".ogg"), arts

"""img-gen through the queue — real inference (krea-2 lane).

Bare post and the LORAS MOD consumption (the 2026-09-04 low-code
validation, now spending real GPU): the door resolves entries against
the model's own catalog rows and the renderer chains generic
LoraLoaderModelOnly nodes — the artifacts prove the chain executes.
"""

import pytest
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from conftest import QueueDoor

pytestmark = pytest.mark.gpu


def test_bare_post(gateway: "QueueDoor") -> None:
    # FLAT (flows rework 2026-09-05): card params ride top-level —
    # a nested "params" key double-wraps and 400s at phase 1.
    run_id = gateway.submit({
        "model": "krea-2",
        "prompt": "a red fox in snow, studio light",
        "seed": 7,
    })
    status = gateway.wait(run_id, timeout_s=900)
    assert status["status"] == "completed", status.get("error")
    arts = gateway.artifacts_on_disk(status)
    assert all(a.suffix == ".png" for a in arts), arts


def test_loras_mod_consumption(gateway: "QueueDoor") -> None:
    """The loras channel end-to-end on real GPU: the model's own
    catalog row (turbo), default strength from the row."""
    run_id = gateway.submit({
        "model": "krea-2",
        "prompt": "a red fox in snow, crosshatched etching",
        "seed": 11,
        "loras": [{"id": "krea2_turbo_lora_rank_64_bf16"}],
    })
    status = gateway.wait(run_id, timeout_s=900)
    assert status["status"] == "completed", status.get("error")
    arts = gateway.artifacts_on_disk(status)
    assert all(a.suffix == ".png" for a in arts), arts

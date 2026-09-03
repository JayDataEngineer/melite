"""video through the queue — real inference (h3-timeline, the golden
base card). One call, 56 frames: the minimal film a timeline can be.

h3 renders are the heavyweight lane — generous ceiling, one window,
no grid theatrics. This is the long-sweep canary: when the studio
card's chain regresses, this is where it surfaces first.
"""

import pytest

pytestmark = pytest.mark.gpu


def test_minimal_timeline(gateway):
    run_id = gateway.submit({
        "model": "h3-timeline",
        "params": {"calls": [
            {"text": "a slow dolly across a quiet harbor at dawn, "
                     "mist on the water",
             "start_frame": 0, "end_frame": 56},
        ]},
    })
    status = gateway.wait(run_id, timeout_s=1800, poll_s=5.0)
    assert status["status"] == "completed", status.get("error")
    arts = gateway.artifacts_on_disk(status)
    assert any(a.suffix in (".mp4", ".webm", ".gif") for a in arts), arts

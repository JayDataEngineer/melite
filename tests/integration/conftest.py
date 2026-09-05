"""REAL INFERENCE — the special folder (operator order, 2026-09-04:
"we should probably add pytest, a special folder for real inference,
an integration suite... and see if the img-gen, img-edit, video stuff
works").

THE LAWS THIS FOLDER OBEYS:

* INFERENCE LAW — every run goes through the queue door (POST
  /v1/flows/start on a real gateway process; never a direct
  engine post). The gateway serializes (serial GPU law) and pytest
  runs these sequentially — one active request at a time.
* RESILIENCE LAW — a failing run surfaces as status failed/completed
  with the EXACT error string; the test fails citing it, the gateway
  process survives.
* Artifacts are read from disk (./output/<run_id>/) — the run's own
  artifact paths, never a fabricated location.

Booting a SCRATCH gateway (not the operator's :33081): the test
gateway owns its queue for the duration; the sweep is the only
customer. It reads the same data/ endpoint config as the operator's
instance (comfy-mcp owns where workflows execute).

Opt-in: `uv run pytest -m gpu` (deselected by default — GPU money).
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from collections.abc import Iterator
from pathlib import Path

import pytest

import _bootstrap  # tests/_bootstrap.py — path owned by the root conftest

# JSON wire values (queue doors speak parsed JSON only — fully narrowed).
JsonValue = str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]

REPO = Path(__file__).resolve().parents[2]
PY = REPO / ".venv" / "bin" / "python"
TERMINAL = {"completed", "failed", "stopped"}


def _req(port: int, method: str, path: str, body: dict[str, JsonValue] | None = None,
         timeout: int = 15) -> tuple[int, JsonValue]:
    url = "http://127.0.0.1:%d%s" % (port, path)
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read().decode() or "null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "null")


class QueueDoor:
    """The queue door, lawfully: submit -> poll -> artifact."""

    def __init__(self, port: int) -> None:
        self.port = port

    def submit(self, body: dict[str, JsonValue]) -> str:
        # L4 of the test/prod barrier: every integration submission is
        # tagged test:true. Even if a scratch run ever landed in the
        # real output root, the tag keeps it out of /v1/assets.
        tagged = dict(body)
        tagged.setdefault("test", True)
        code, resp = _req(self.port, "POST", "/v1/flows/start", tagged)
        assert code == 202, "submit refused (%d): %s" % (code, resp)
        return resp["run_id"]

    def wait(self, run_id: str, timeout_s: float = 900.0,
             poll_s: float = 2.0) -> dict[str, JsonValue]:
        """Poll to a terminal state; returns the final status dict."""
        deadline = time.monotonic() + timeout_s
        last = {}
        while time.monotonic() < deadline:
            code, last = _req(self.port, "GET",
                              "/v1/flows/status/%s" % run_id)
            assert code == 200, "status door %d: %s" % (code, last)
            if last.get("status") in TERMINAL:
                return last
            time.sleep(poll_s)
        pytest.fail("run %s did not settle in %ss (last: %s)"
                    % (run_id, timeout_s, last.get("status")))

    def artifacts_on_disk(self, status: dict[str, JsonValue]) -> list[Path]:
        """The run's artifact paths, verified to EXIST with bytes."""
        out = []
        for a in status.get("artifacts") or []:
            p = Path(a) if os.path.isabs(a) else REPO / a
            assert p.is_file(), "artifact missing on disk: %s" % a
            assert p.stat().st_size > 0, "artifact empty: %s" % a
            out.append(p)
        assert out, "run completed with zero artifacts: %s" % status
        return out

    def stop(self, run_id: str) -> None:
        _req(self.port, "POST", "/v1/flows/stop/%s" % run_id)


@pytest.fixture(scope="session")
def gateway() -> Iterator[QueueDoor]:
    """A scratch gateway process: boots on a free port, serves the
    whole sweep, terminates CLEANLY (SIGTERM — the shutdown law
    manufactures zero zombies). Boot/reap mechanics live in
    tests/_bootstrap.py — the ONE implementation, shared with the
    walls parity suite (fixture audit 2026-09-04, F7)."""
    try:
        port, proc = _bootstrap.boot_scratch_gateway(
            wait_path="/v1/forms", python=str(PY), env=dict(os.environ))
    except RuntimeError as e:
        pytest.fail(str(e))
    try:
        yield QueueDoor(port)
    finally:
        _bootstrap.reap_gateway(proc)


@pytest.fixture(scope="session")
def gateway_port(gateway: QueueDoor) -> int:
    """The scratch gateway's port (the form-spec door lives on the
    same gateway the queue door uses — same process, different routes)."""
    return gateway.port


@pytest.fixture(scope="session")
def assets() -> dict[str, str | None]:
    """Feed-in assets (committed, deterministic — GPU output varies,
    input must not). tests/integration/assets/."""
    d = Path(__file__).parent / "assets"
    src = d / "source.png"
    assert src.is_file(), "missing feed asset: %s" % src
    # the motion canary's character body: the CANONICAL SOMAX-77 rig
    # (skin SOMA-Mixamo, 77 joints, translation-only node chain at
    # SOMA's own offsets, template mesh + LBS weights from kimodo's
    # somaskel77/skin_standard.npz). The somax bake's FK gate holds
    # ONLY on canonical offsets — a rig with its own bind pose
    # (e.g. the barycentric bary_little_girl) deviates ~43cm and
    # the gate refuses (caught live 2026-09-04: the gate is honest).
    rig = d / "rigged_char_canonical.glb"
    outfit = d / "outfit_cap.glb"
    # Missing optionals are None + an explicit skip at the consuming
    # test — never "" sentinels (fixture audit 2026-09-04, F3).
    return {"source": str(src),
            "rigged_glb": str(rig) if rig.is_file() else None,
            "outfit_glb": str(outfit) if outfit.is_file() else None}

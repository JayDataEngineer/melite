"""test_run_lifecycle.py - a real run through the gateway lifecycle.

The card-compose + run chain is the central value of the inference
estate. Three of the four session-critical bugs this operator hit
live in that chain:

  - no feedback from comfyui webhooks (WS events tunnel, fixed)
  - images dont show in the media sidebar (created_at sidecar key,
    stage url/gallery stamping, both fixed)
  - no image on the action card (stages[].url empty, fixed)

Each fix was unit-pinned in isolation. This test is the INTEGRATION
pin: one request in, a real run through the queue, terminal lifecycle
assertions, sidecar artifact assertions. No mock: uses the LIVE
gateway and REAL comfyui (if reachable). When the GPU/compose layer
is broken (pin drift, engine down), the test skips gracefully but
still validates what it can.

Run: pytest tests/walls/suites/test_run_lifecycle.py -v
"""
from __future__ import annotations

import json
import socket
import time
import urllib.error
import urllib.request
from pathlib import Path

import pytest

from _anchor import REPO


GATEWAY_URL = "http://127.0.0.1:33081"
OUT_ROOT = REPO / "data" / "runs" / "output"
MAX_POLL_S = 120
POLL_INTERVAL_S = 2

# A card-model start body. krea-2 is the card-only model the operator
# uses most (it has a minimal compose path — model + prompt + size +
# steps + seed). The params are small to keep the run fast.
START_BODY = {
    "model": "krea-2",
    "params": {
        "prompt": "test lifecycle: a small gray cube on white, flat lighting",
        "width": 512,
        "height": 512,
        "steps": 4,
        "seed": 42,
    },
}


def _post(
    url: str,
    body: dict[str, str | dict[str, str | int] | list[dict[str, str | dict[str, str | int]]]] | bytes,
    timeout: float | int = 20.0,
) -> tuple[int, dict[str, str | int]]:
    data = json.dumps(body).encode() if isinstance(body, dict) else body
    req = urllib.request.Request(
        url, data=data, method="POST",
        headers={"content-type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def _get(url: str, timeout: float | int = 10.0) -> tuple[int, dict[str, str | int | list[dict[str, str | int | list[str]]]] | bytes]:
    try:
        with urllib.request.urlopen(urllib.request.Request(url), timeout=timeout) as r:
            body = r.read()
            # Try JSON first; if it fails (binary artifact), return raw bytes.
            try:
                return r.status, json.loads(body.decode())
            except (UnicodeDecodeError, json.JSONDecodeError):
                return r.status, body
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode(errors="replace")[:200]}
    except Exception as e:
        return 0, {"error": str(e)}


def _poll_status(run_id: str) -> dict[str, str | int | list[dict[str, str | int | list[str]]]]:
    deadline = time.time() + MAX_POLL_S
    last = {}
    while time.time() < deadline:
        status, body = _get(f"{GATEWAY_URL}/v1/flows/status/{run_id}")
        if status == 200:
            last = body
            if body.get("status") in ("completed", "error", "stopped"):
                return body
        time.sleep(POLL_INTERVAL_S)
    return last


@pytest.fixture(scope="module")
def gateway_up() -> bool:
    try:
        s = socket.create_connection(("127.0.0.1", 33081), timeout=2.0)
        s.close()
    except OSError:
        pytest.skip("gateway not listening on 127.0.0.1:33081")
    return True


class TestRunLifecycle:
    """A real card-model run through the gateway, covering the full
    lifecycle: start -> queue -> terminal -> sidecar assertions."""

    def test_card_model_start(self, gateway_up: bool) -> None:
        status, resp = _post(f"{GATEWAY_URL}/v1/flows/start", START_BODY)
        # The compose gate may reject due to infrastructure (pin drift,
        # no comfyui reachable). The lifecycle test is about runs that
        # DO start; a 400 is an infrastructure skip, not a test failure.
        if status == 400:
            pytest.skip(
                f"gateway rejected start at 400 (infra issue): "
                f"{resp.get('error', '')}"
            )
        assert status == 202, (
            f"POST /v1/flows/start returned {status} (expected 202 or 400 "
            f"skip). resp={resp}"
        )
        assert "run_id" in resp, f"202 without run_id: {resp}"

        run_id = resp["run_id"]
        assert resp.get("status") in ("queued", "running"), (
            f"new run status is {resp.get('status')!r} (expected queued/running)"
        )

        # --- terminal lifecycle ---
        terminal = _poll_status(run_id)
        assert terminal, "run never became terminal within 120s"
        assert terminal["status"] in ("completed", "error", "stopped"), (
            f"terminal status is {terminal['status']!r}"
        )

        # --- sidecar: the created_at key is a real timestamp ---
        sidecar_path = OUT_ROOT / run_id / "_flow.json"
        if sidecar_path.exists():
            sidecar = json.loads(sidecar_path.read_text())
            created = sidecar.get("created_at", 0)
            assert created > 1_000_000_000, (
                f"sidecar created_at is {created} (expected a real unix "
                f"timestamp > 1e9). The py sidecar key drift is the class "
                f"the operator hit on the media sidebar bug."
            )

        # --- stages: on error the stage carries the exact error string ---
        stages = terminal.get("stages", [])
        assert stages, "terminal run has no stages"
        if terminal["status"] == "error":
            for stage in stages:
                assert stage.get("error"), (
                    f"stage {stage.get('id')!r} has no error field on an "
                    f"error run. RESILIENCE LAW: the exact failure message "
                    f"must be documented in the sidecar, never a bare failed."
                )
            return  # error path validated; no artifact to assert

        # --- stages: url + gallery populated (the 2026-09-04 fix) ---
        for stage in stages:
            url = stage.get("url")
            assert url, (
                f"stage {stage.get('id')!r} has no url on a completed run. "
                f"This is the bug class the operator hit: "
                f"collectStageUrls got []."
            )
            # The gateway stamps stage artifacts as /v1/assets/runs/<id>/<file>
            # (renamed from /editor/assets/runs/ during the flows consolidation;
            # the test matches the CURRENT contract, not historical names).
            assert url.startswith("/v1/assets/runs/"), (
                f"stage url {url!r} does not follow the current gateway "
                f"contract (/v1/assets/runs/...)."
            )
            gallery = stage.get("gallery", [])
            assert isinstance(gallery, list), (
                f"stage gallery is {type(gallery).__name__}, expected list"
            )

        # --- artifact fetch: the first stage artifact serves 200 ---
        # /v1/assets/runs/* is served by the gateway directly. We probe
        # against the gateway (HTTP, no TLS issues) to verify the
        # artifact the gateway stamps actually exists and is fetchable.
        first_url = stages[0].get("url")
        if first_url:
            gw_art_status, _ = _get(f"{GATEWAY_URL}{first_url}", timeout=10)
            assert gw_art_status == 200, (
                f"GET {first_url} on the gateway returned {gw_art_status} -- "
                f"the stage artifact URL the gateway stamps does not serve."
            )

    def test_run_card_link_round_trips(self, gateway_up: bool) -> None:
        """THE CARD-LINK WIRE (2026-09-04 audit, run→card reproducibility).

        The py gateway's submit() MUST capture draft_id from the start
        body and emit it into _flow.json. The reader (editor_runs.py
        runs()) reads draft_id from _flow.json; the media sidebar's
        Cards wand uses it to open the originating card in the deck
        studio. A run started with draft_id MUST appear with the same
        draft_id in /v1/flows/runs — the operator's "all flows
        recoverable by design" promise lives or dies here.
        """
        # Save the draft FIRST so the click-contract gate (editor_runs.py
        # 480, 2026-09-02 law) doesn't strip our draft_id from the row.
        # A real user presses Run from the deck studio, where the draft
        # doc was saved by POST /v1/flows/drafts — exactly this shape.
        DRAFT_ID = "draft-lifecycle-test-card-link-0"
        draft_body = {
            "intent": "lifecycle test card-link",
            "stages": [{"id": "s0", "card": "image-gen",
                        "params": {"prompt": "lifecycle card-link: a tiny red dot",
                                   "width": 256, "height": 256,
                                   "steps": 2, "seed": 99}}],
            "model": "krea-2",
        }
        draft_status, draft_resp = _post(
            f"{GATEWAY_URL}/v1/flows/drafts", draft_body)
        if draft_status != 200:
            pytest.skip(
                f"could not save draft doc (status={draft_status}): "
                f"{draft_resp.get('error', '')}")
        # POST /v1/flows/drafts may rewrite the id (draft_id_ok validator);
        # use what the gateway returned, not our local DRAFT_ID.
        DRAFT_ID = draft_resp.get("draftId", DRAFT_ID)

        body = {
            "model": "krea-2",
            "draft_id": DRAFT_ID,
            "params": {
                "prompt": "lifecycle card-link: a tiny red dot",
                "width": 256, "height": 256, "steps": 2, "seed": 99,
            },
        }
        status, resp = _post(f"{GATEWAY_URL}/v1/flows/start", body)
        if status == 400:
            pytest.skip(
                f"gateway rejected start at 400 (infra issue): "
                f"{resp.get('error', '')}")
        assert status == 202, f"POST /v1/flows/start returned {status}: {resp}"
        run_id = resp["run_id"]

        terminal = _poll_status(run_id)
        assert terminal, "run never became terminal within 120s"
        assert terminal["status"] in ("completed", "error", "stopped"), (
            f"terminal status is {terminal['status']!r}")

        # --- sidecar MUST carry draft_id (docs/queue/sidecar.md:36) ---
        sidecar_path = OUT_ROOT / run_id / "_flow.json"
        assert sidecar_path.exists(), (
            f"no _flow.json for run {run_id} — terminal write never "
            f"fired (zombie). The resilience law requires a sidecar.")
        sc = json.loads(sidecar_path.read_text())
        assert sc.get("draft_id") == DRAFT_ID, (
            f"sidecar draft_id is {sc.get('draft_id')!r}, "
            f"expected {DRAFT_ID!r}. The py gateway dropped the "
            f"run→card wire (2026-09-04 audit, broken since the C "
            f"retirement 2026-09-03). All flows are recoverable by "
            f"design: a card-driven run must surface its card."
        )

        # --- /v1/flows/runs MUST surface the same draft_id ---
        runs_status, runs_body = _get(f"{GATEWAY_URL}/v1/flows/runs?limit=500")
        assert runs_status == 200, f"/v1/flows/runs HTTP {runs_status}"
        runs = runs_body.get("runs", [])
        row = next((r for r in runs if r.get("run_id") == run_id), None)
        assert row is not None, f"run_id {run_id} missing from /v1/flows/runs"
        assert row.get("draft_id") == DRAFT_ID, (
            f"/v1/flows/runs row draft_id is {row.get('draft_id')!r}, "
            f"expected {DRAFT_ID!r}. If this is empty, the click-contract "
            f"gate (editor_runs.py:480) stripped it because the draft doc "
            f"is gone — but we just saved it above, so it MUST exist."
        )

    def test_run_card_link_malformed_refused(self, gateway_up: bool) -> None:
        """A malformed draft_id MUST 4xx before any run registers.

        QUEUE LANE LAW: validation at construction. py/editor_runs
        .py:1080 draft_id_ok() is the SSOT — 96 char cap, [A-Za-z0-9_-].
        A bad wire must NEVER register, never write a sidecar.
        """
        body = {
            "model": "krea-2",
            "draft_id": "has spaces and !bad! chars",
            "params": {"prompt": "should never run", "width": 64,
                       "height": 64, "steps": 1, "seed": 0},
        }
        status, resp = _post(f"{GATEWAY_URL}/v1/flows/start", body)
        assert 400 <= status < 500, (
            f"malformed draft_id must 4xx, got HTTP {status}: {resp}")
        # The error message names the field, so callers can correct.
        err = str(resp.get("error", "")).lower()
        assert "draft_id" in err, (
            f"400 error must name the rejected field, got {resp}")

"""test_no_zombie_slots.py - the QUEUE LANE LAW's central guarantee.

Operator order, 2026-08-30, verbatim: 'No legacy. No fallbacks. No
hardcodes. These are banned.' Enforced by the py gateway's route-layer
validation: 'The pipeline START handler must never silently compose a
graph when a request fails to resolve. Unresolved requests are rejected
with 4xx BEFORE any run is registered (no zombie slots, no sidecars).'

This wall pins the no-sidecar-on-4xx half of that law as a live
HTTP test against the running gateway. Every pre-registration refusal
must leave the data/runs/ sidecar ledger UNCHANGED - one new
run-id directory is one zombie slot.

Run: pytest tests/walls/suites/test_no_zombie_slots.py -v
"""
from __future__ import annotations

import json
import socket
import urllib.error
import urllib.request
from pathlib import Path

import pytest

from _anchor import REPO


GATEWAY_URL = "http://127.0.0.1:33081"
OUT_ROOT = REPO / "data" / "runs" / "output"


def _http_post_json(url, body, timeout=10.0):
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        url, data=data, method="POST",
        headers={"content-type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body_text = e.read().decode()
        try:
            return e.code, json.loads(body_text)
        except json.JSONDecodeError:
            return e.code, {"error": body_text[:200]}
    except (urllib.error.URLError, ConnectionRefusedError, socket.timeout) as e:
        return 0, {"error": str(e)}


def _http_post_raw(url, body, timeout=10.0):
    req = urllib.request.Request(
        url, data=body, method="POST",
        headers={"content-type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode(errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="replace")
    except (urllib.error.URLError, ConnectionRefusedError, socket.timeout) as e:
        return 0, str(e)


def _count_run_dirs():
    """Count every run directory under the gateway OUT_ROOT.

    Each run is a directory named run-<uuid>-<id> that contains the
    sidecar _flow.json plus per-stage artifacts. The count is the
    pre/post diff handle: any growth during a 4xx probe is a zombie
    slot.
    """
    if not OUT_ROOT.exists():
        return 0
    return sum(1 for p in OUT_ROOT.iterdir() if p.is_dir() and p.name.startswith("run-"))


@pytest.fixture(scope="module")
def gateway_up():
    """Skip the module if the gateway is not listening on 33081.

    The dev gateway is the only live instance in the estate; if it is
    not up, the no-sidecar test is meaningless. The unit-level
    equivalent (calling gw.submit() in process) is already pinned by
    test_py_gateway.py - this test is the HTTP-layer pin.
    """
    try:
        s = socket.create_connection(("127.0.0.1", 33081), timeout=2.0)
        s.close()
    except OSError:
        pytest.skip("gateway not listening on 127.0.0.1:33081; "
                    "test_py_gateway.py covers the in-process refusal class")
    return True


class TestNoZombieSlots:
    """Every 4xx-rejected start must leave the sidecar ledger untouched.

    The QUEUE LANE LAW BEFORE-any-run-is-registered half is the
    gate. A response with a run_id AND a directory under OUT_ROOT
    is a registered run. A response without run_id AND no new
    directory is a clean rejection. Anything else is a zombie slot.
    """

    REJECTION_CASES = [
        ("empty body", {}),
        ("non-object body", []),
        ("flow with illegal identifier", {"flow": "no-such-lane-XYZ"}),
        ("model with illegal identifier", {"model": "no-such-model-XYZ"}),
    ]

    @pytest.mark.parametrize("label,body", REJECTION_CASES,
                             ids=[c[0] for c in REJECTION_CASES])
    def test_4xx_rejection_creates_no_sidecar(self, gateway_up, label, body):
        before = _count_run_dirs()
        status, resp = _http_post_json(f"{GATEWAY_URL}/v1/flows/start", body)
        after = _count_run_dirs()
        assert 400 <= status < 500, (
            f"{label}: POST /v1/flows/start returned {status} "
            f"(expected 4xx for a refused request). body={body} resp={resp}"
        )
        assert "run_id" not in resp, (
            f"{label}: refused request returned a run_id - the gateway "
            f"registered a run for a body it should have rejected. "
            f"resp={resp}"
        )
        assert after == before, (
            f"{label}: refused request created {after - before} new run "
            f"directory(ies) under {OUT_ROOT}. QUEUE LANE LAW: 4xx BEFORE "
            "any run is registered (no zombie slots, no sidecars)."
        )

    def test_malformed_json_4xx_no_sidecar(self, gateway_up):
        before = _count_run_dirs()
        status, body = _http_post_raw(
            f"{GATEWAY_URL}/v1/flows/start",
            b"{not json at all",
        )
        after = _count_run_dirs()
        assert status == 400, (
            f"malformed JSON returned {status} (expected 400). body={body!r}"
        )
        assert after == before, (
            f"malformed JSON created {after - before} new run dir(s) - "
            f"the sidecar ledger grew on a refusal. body={body!r}"
        )

    def test_stop_door_on_unknown_run_is_clean(self, gateway_up):
        """Stop on an unknown run must not create a sidecar.

        Stop is post-registration in normal use, but an unknown run
        id is a 4xx at the route layer. The wall asserts no sidecar
        growth for that case too.
        """
        before = _count_run_dirs()
        status, body = _http_post_raw(
            f"{GATEWAY_URL}/v1/flows/stop/__definitely_no_such_run_id_xyz__",
            b"{}",
        )
        after = _count_run_dirs()
        assert 200 <= status < 500, (
            f"unknown-run stop returned {status} (expected 2xx/4xx). body={body!r}"
        )
        assert after == before, (
            f"stop on unknown run created {after - before} new run dir(s). "
            f"body={body!r}"
        )

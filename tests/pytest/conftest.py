"""Pytest config for the live-gateway walls under tests/pytest/.

The live fixture pings /v1/health once per session; any test that
requests it is auto-skipped with a one-line operator hint when the
gateway is unreachable. The helper is exposed as a dict (BASE, get,
post, TIMEOUT) so tests can take the fixture and skip the manual
import dance.
"""
import json
import os
import subprocess
import urllib.error
import urllib.request

import pytest

BASE = os.environ.get("TEST_GATEWAY_BASE", "http://127.0.0.1:33081")
TIMEOUT = 10


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=TIMEOUT) as r:
        return r.status, json.loads(r.read())


def post(path, body):
    req = urllib.request.Request(
        BASE + path, method="POST",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]


@pytest.fixture(scope="session")
def live():
    """Skip the test session if the gateway is unreachable.

    Returns the same dict the old hh import gave: BASE, get, post,
    TIMEOUT. Tests that prefer the module-level BASE can just import
    it from tests.pytest.conftest.
    """
    try:
        with urllib.request.urlopen(BASE + "/v1/health", timeout=2) as r:
            if r.status != 200:
                raise RuntimeError("non-200")
    except Exception as e:
        pytest.skip(
            f"gateway unreachable at {BASE} ({e.__class__.__name__}); "
            f"boot with: cd <repo> && setsid /usr/bin/python3 "
            f"py/gateway.py 33081"
        )
    return {"BASE": BASE, "get": get, "post": post, "TIMEOUT": TIMEOUT}


@pytest.fixture(scope="session")
def repo():
    return subprocess.check_output(
        ["git", "rev-parse", "--show-toplevel"], text=True
    ).strip()

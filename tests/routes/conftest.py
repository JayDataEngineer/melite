"""tests/routes conftest — the live-gateway client.

A typed client (not a dict bag): tests call live.get(path) /
live.post(path, body) directly. The session fixture pings
/v1/health once; an unreachable gateway SKIPS the route suites
with a one-line operator hint instead of erroring.
"""
import json
import os
import urllib.error
import urllib.request

import pytest

BASE = os.environ.get("TEST_GATEWAY_BASE", "http://127.0.0.1:33081")
TIMEOUT = 10


class GatewayClient:
    """Minimal typed client for the estate gateway."""

    def __init__(self, base, timeout):
        self.base = base
        self.timeout = timeout

    def get(self, path):
        with urllib.request.urlopen(
                self.base + path, timeout=self.timeout) as r:
            return r.status, json.loads(r.read())

    def post(self, path, body):
        req = urllib.request.Request(
            self.base + path, method="POST",
            data=json.dumps(body).encode(),
            headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(
                    req, timeout=self.timeout) as r:
                return r.status, json.loads(r.read())
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode()[:300]

    def fetch_bytes(self, path):
        with urllib.request.urlopen(
                self.base + path, timeout=self.timeout) as r:
            return r.read()


@pytest.fixture(scope="session")
def live():
    """The live gateway client, or a SKIP with the operator hint."""
    client = GatewayClient(BASE, TIMEOUT)
    try:
        code, _ = client.get("/v1/health")
        if code != 200:
            raise RuntimeError("non-200 health")
    except Exception as e:
        pytest.skip(
            "gateway unreachable at " + BASE
            + " (" + e.__class__.__name__ + "); boot with: "
            "cd <repo> && setsid /usr/bin/python3 py/gateway.py 33081"
        )
    return client

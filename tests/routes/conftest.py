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
from collections.abc import Iterator

import pytest

BASE = os.environ.get("TEST_GATEWAY_BASE", "http://127.0.0.1:33081")
TIMEOUT = 10

# JSON wire values (the gateway speaks parsed JSON only — fully narrowed).
JsonValue = str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]


class GatewayClient:
    """Minimal typed client for the estate gateway."""

    def __init__(self, base: str, timeout: int) -> None:
        self.base = base
        self.timeout = timeout

    def get(self, path: str) -> tuple[int, JsonValue]:
        # 4xx answers as (code, body) — symmetric with post(): a
        # route-smoke probe may pin a NAMED refusal (e.g. the
        # card-tools lane filter's 404), never an exception.
        try:
            with urllib.request.urlopen(
                    self.base + path, timeout=self.timeout) as r:
                return r.status, json.loads(r.read())
        except urllib.error.HTTPError as e:
            raw = e.read().decode(errors="replace")
            try:
                return e.code, json.loads(raw)
            except json.JSONDecodeError:
                return e.code, raw[:300]

    def get_raw(self, path: str) -> tuple[int, bytes, str]:
        """Binary doors (the provision door streams npz/glb): status,
        body BYTES, content-type — never a json parse."""
        with urllib.request.urlopen(
                self.base + path, timeout=self.timeout) as r:
            return r.status, r.read(), \
                r.headers.get("content-type", "")

    def post(self, path: str, body: dict[str, str]) -> tuple[int, dict[str, JsonValue] | str]:
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

    def fetch_bytes(self, path: str) -> bytes:
        with urllib.request.urlopen(
                self.base + path, timeout=self.timeout) as r:
            return r.read()


@pytest.fixture(scope="session")
def live() -> Iterator[GatewayClient]:
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

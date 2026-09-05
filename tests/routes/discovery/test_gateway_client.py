"""Smoke for the routes conftest GatewayClient.

The client is the wall surface; this keeps base, timeout, get,
post honest. Skips cleanly when the gateway is down (the live
fixture does the health check).
"""
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from conftest import GatewayClient


class TestClientSmoke:
    def test_client_config(self, live: "GatewayClient") -> None:
        # the defaults the suite is written against
        assert live.base == "http://127.0.0.1:33081"
        assert live.timeout > 0

    def test_get_returns_status_and_json(self, live: "GatewayClient") -> None:
        code, body = live.get("/v1/health")
        assert code == 200
        assert isinstance(body, dict)

    def test_post_error_returns_code_and_text(self, live: "GatewayClient") -> None:
        # a refused action comes back as (4xx, str) -- the client
        # never raises for HTTP errors; the wall reads them
        code, body = live.post("/v1/manage", {"action": "__nope__"})
        assert code in (400, 422)
        assert isinstance(body, str)
        assert "detail" in body

    def test_fetch_bytes_returns_raw(self, live: "GatewayClient") -> None:
        blob = live.fetch_bytes("/v1/health")
        assert isinstance(blob, bytes)
        assert len(blob) > 0

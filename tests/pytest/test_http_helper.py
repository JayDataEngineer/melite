"""Smoke for the conftest live fixture.

The fixture is the wall surface; trivial smoke keeps BASE, TIMEOUT,
get, post honest.
"""
import pytest

from tests.pytest.conftest import BASE, TIMEOUT


class TestBaseConfig:
    def test_base_is_local_default(self):
        # the helper defaults to the local estate gateway (port 33081)
        assert BASE == "http://127.0.0.1:33081"

    def test_timeout_is_set(self):
        assert TIMEOUT is not None
        assert TIMEOUT > 0


class TestLiveHelperSmoke:
    # depends on the live fixture; skipped if the gateway is down

    def test_get_envelope(self, live):
        code, body = live["get"]("/v1/health")
        assert code == 200
        assert isinstance(body, dict)

    def test_post_validates(self, live):
        # unknown action returns 422 (the manage door pydantic refusal)
        code, body = live["post"]("/v1/manage",
                                   {"action": "__nonexistent__"})
        assert code in (400, 422)
        assert isinstance(body, str)
        assert "detail" in body

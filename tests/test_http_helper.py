"""Smoke for tests/_http.py — the shared live-gateway helper.

The helper is the wall's surface; if it breaks (wrong BASE, swallows
errors, mishandles timeouts), every route test is wrong. These are
trivial but load-bearing.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))
import _live
import _http as hh  # noqa: E402


class BaseConfigTests(unittest.TestCase):
    def test_base_is_local_default(self):
        # the helper defaults to the local estate gateway (port 33081).
        # The TEST_GATEWAY_BASE env override is read at import time
        # (module-level), so this test simply pins the default contract
        # the suite was written against.
        self.assertEqual(hh.BASE, "http://127.0.0.1:33081")

    def test_timeout_is_set(self):
        # a missing timeout could hang the board indefinitely
        self.assertIsNotNone(hh.TIMEOUT)
        self.assertGreater(hh.TIMEOUT, 0)


class LiveHelperSmokeTests(_live.LiveRequired, unittest.TestCase):
    # the helper against the real gateway: get returns (status, body)
    # with JSON, post returns (status, body) for 2xx or (code, text)
    # for 4xx/5xx (the truncated body is the diagnostic).

    def test_get_envelope(self):
        code, body = hh.get("/v1/health")
        self.assertEqual(code, 200)
        # health is the smallest live shape — any 200 JSON is a pass
        self.assertIsInstance(body, dict)

    def test_post_validates(self):
        # unknown action returns 422 (the manage door's pydantic refusal)
        code, body = hh.post("/v1/manage", {"action": "__nonexistent__"})
        self.assertIn(code, (400, 422))
        # the body is a string for HTTPError paths (text-truncated)
        self.assertIsInstance(body, str)
        self.assertIn("detail", body)


if __name__ == "__main__":
    unittest.main()

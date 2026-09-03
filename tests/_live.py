"""Live-gateway mixin for tests that hit the real server.

A suite that subclasses this gets a clean SKIP (not a 4-suite red) when
the gateway is unreachable, with a one-line message telling the
operator how to fix it. The 4 live route walls (assets_route,
manage_route, routes_smoke, http_helper) all use this.
"""
import unittest

import _http as hh  # type: ignore[import-not-found]


class LiveRequired(unittest.TestCase):
    # pings /v1/health once per class. Healthy -> runs the tests.
    # Unreachable / non-200 -> skipTest with a message (the operator
    # knows the gateway is down without us faking a fake pass).

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        try:
            with __import__("urllib.request").request.urlopen(
                    hh.BASE + "/v1/health", timeout=2) as r:
                if r.status != 200:
                    raise RuntimeError("non-200 health")
        except Exception as e:
            raise unittest.SkipTest(
                f"gateway unreachable at {hh.BASE} ({e.__class__.__name__}); "
                f"start it with: pkill -f 'gateway.py 33081' ; "
                f"cd <repo> && setsid /usr/bin/python3 py/gateway.py 33081"
            )

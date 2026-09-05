"""test_dev_dsh_api_contract — the route coverage the editor actually
exercises, probed BOTH through the dev DSH public origin AND against
the upstream estate gateway the dev DSH proxies to.

The gap this wall closes (operator order 2026-09-05, verbatim: "we
need testing around this massive testing gap"):

The existing dev DSH suite (tests/dev_dsh/test_dev_dsh.py) probes
~2 routes through the dev DSH origin (/v1/forms, /editor/). The
editor's client code (plugins/web/editor/src/) fetches at least 9
distinct /v1/* routes — the form-spec per-model probe, the
model-catalog, themes, tags, services, kinds, queue, and the
/v1/forms?tag= variant. When the upstream estate gateway serves
stale code (a card package the in-flight session just rewrote),
the editor's probes 500 and the user sees bare "Internal Server
Error" — the traceback is hidden because the gateway's adapter
swallowed it.

This wall:
  1. probes the dev DSH origin (HTTPS :3909) for EVERY route the
     editor fetches — pins 200 + JSON envelope (the surfacing fix
     in _adapt makes a 500 carry a JSON error body, never bare text);
  2. probes the upstream estate gateway (env ESTATE_UPSTREAM_PORT,
     default probes 33081 then 43737) for the same routes — when
     the dev DSH is green but the upstream is stale, the user
     still sees 200 (the dev DSH's buffered cache) until they
     hard-reload; the upstream probe catches the drift;
  3. asserts the response body is valid JSON (not the bare
     "Internal Server Error" text the swallowed exception used to
     return) — the surfacing fix's load-bearing contract.

Skips when the dev DSH isn't up (opt-in infra); the existing
dev_dsh_up fixture owns that policy.
"""

import json
import os
import socket
import urllib.error
import urllib.request

from collections.abc import Iterator
from typing import NoReturn

import pytest

# The dev DSH public origin (matches the constants in test_dev_dsh.py —
# the dev_dsh/ dir has no __init__.py, so we mirror instead of import).
DEV_PORT = 3909
DEV_TAILNET_FQDN = "cloud.tailb1e597.ts.net"


@pytest.fixture(scope="module")
def dev_dsh_up() -> Iterator[bool]:
    """Ensure the dev DSH is running before this module's tests run.

    Mirrors the fixture in test_dev_dsh.py (no __init__ in the dir,
    so the fixture is duplicated rather than imported). If the port
    isn't listening, SKIP — the dev DSH is opt-in infra; CI may not
    have it."""
    import socket
    with socket.socket() as s:
        s.settimeout(0.3)
        if s.connect_ex(("127.0.0.1", DEV_PORT)) == 0:
            yield True
            return
    pytest.skip(
        "dev DSH not listening on :%d — opt-in infra; skip" % DEV_PORT)

# Every route the editor's client code fetches (grep of
# plugins/web/editor/src for /v1/<path>). When the editor adds a
# new route, ADD IT HERE — a missing entry is the wall's job to
# catch (so a route that ships without a probe is a red).
EDITOR_ROUTES = [
    "/v1/health",
    "/v1/queue",
    "/v1/forms",
    "/v1/forms?tag=image",
    "/v1/model-catalog",
    "/v1/services",
    "/v1/themes",
    "/v1/tags",
    "/v1/kinds",
    "/v1/form-spec?model=krea-2",
    "/v1/form-spec?model=z-image",
    "/v1/form-spec?model=anima",
    "/v1/form-spec?model=ideogram",
    "/v1/form-spec?model=anny",
    "/v1/form-spec?model=h3-timeline",
]


def _http(url: str, timeout: int = 15) -> tuple[int, bytes]:
    try:
        r = urllib.request.urlopen(url, timeout=timeout)
        return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read() or b""
    except Exception as e:
        return 0, f"(connect failed: {e})".encode()


def _find_estate_port() -> int | None:
    """The dev DSH proxies /v1/* to an estate gateway. The wall
    needs to probe that gateway DIRECTLY too (catches "dev DSH
    green, upstream stale" — the exact failure the user hit). The
    port is whatever the dev DSH was started against; ESTATE_UPSTREAM
    overrides; default probes 33081 then 43737 (the two known
    estate ports in the dev loop)."""
    env = os.environ.get("ESTATE_UPSTREAM_PORT")
    if env:
        return int(env)
    for port in (33081, 43737, 33080):
        with socket.socket() as s:
            s.settimeout(0.3)
            if s.connect_ex(("127.0.0.1", port)) == 0:
                return port
    return None


def _assert_json_envelope(label: str, status: int, body: bytes, route: str) -> None:
    """A 200 OR a 4xx/5xx with a JSON body carrying a real error
    message. Bare text = the old swallowed-exception leak (the
    "Internal Server Error" the user saw on form-spec?model=anny).
    The surfacing fix in py/gateway.py _adapt means a 500 has
    `{"error": "...", "traceback": "..."}` — the wall pins the
    shape so a regression to bare text is a red."""
    if status == 200:
        assert body, "%s %s returned 200 with empty body" % (label, route)
        try:
            json.loads(body)
        except Exception as e:
            pytest.fail(
                "%s %s returned 200 but body is NOT JSON: %r (the "
                "old bare-text leak is back: %s)"
                % (label, route, body[:120], e))
        return
    if 400 <= status < 600:
        # Even 4xx/5xx must be JSON with a real error message
        # (RESILIENCE: a failure documents the exact failure
        # message — the HTTP layer too).
        try:
            j = json.loads(body)
        except Exception:
            pytest.fail(
                "%s %s returned %d with NON-JSON body %r — a "
                "swallowed exception, not a documented failure. "
                "The _adapt surfacing fix is missing or regressed."
                % (label, route, status, body[:200]))
        assert "error" in j or "status" in j, (
            "%s %s returned %d but JSON body lacks an error key: %r"
            % (label, route, status, j))
        return
    pytest.fail("%s %s returned status=%d body=%r"
                % (label, route, status, body[:200]))


def test_dev_dsh_origin_serves_every_editor_route(dev_dsh_up: bool) -> None:
    """The dev DSH public origin (HTTPS :3909) MUST serve 200 with
    a JSON envelope for every route the editor fetches. The user
    hit the exact gap this test closes: form-spec?model=anny served
    500 because the upstream estate was stale; the dev DSH
    forwarded the 500 verbatim and the editor's bundle crashed."""
    base = "https://%s:%d" % (DEV_TAILNET_FQDN, DEV_PORT)
    failures = []
    for route in EDITOR_ROUTES:
        url = base + route
        status, body = _http(url)
        try:
            _assert_json_envelope("dev DSH", status, body, route)
        except AssertionError as e:
            failures.append(str(e))
    assert not failures, "\n  ".join(failures)


def test_upstream_estate_matches_dev_dsh_for_every_editor_route(dev_dsh_up: bool) -> None:
    """The dev DSH is a proxy; the SOURCE of truth is the estate
    gateway it proxies to. When the dev DSH green-proxies a stale
    upstream, the user sees 200 (the dev DSH's buffered cache)
    until hard-reload — the upstream probe catches the drift.

    Discover the upstream port (ESTATE_UPSTREAM_PORT env override,
    else scan 33081/43737/33080 on 127.0.0.1). Skip if no estate
    is reachable on this host (the dev DSH may proxy to a remote
    estate in some deployments)."""
    upstream = _find_estate_port()
    if upstream is None:
        pytest.skip(
            "no estate gateway reachable on 127.0.0.1:33081/43737/33080; "
            "set ESTATE_UPSTREAM_PORT if the dev DSH proxies to a "
            "remote estate")
    base = "http://127.0.0.1:%d" % upstream
    failures = []
    for route in EDITOR_ROUTES:
        # The upstream estate serves the same routes WITHOUT TLS;
        # strip the leading slash for urlopen's path component.
        path = route if route.startswith("/") else "/" + route
        url = base + path
        status, body = _http(url, timeout=10)
        try:
            _assert_json_envelope("upstream:%d" % upstream, status,
                                  body, route)
        except AssertionError as e:
            failures.append(str(e))
    assert not failures, "\n  ".join(failures)


# ---------------------------------------------------------------------------
# Focused surfacing contract: when a handler raises, the response is
# JSON `{"error", "type", "traceback", "route"}` — NEVER the bare
# "Internal Server Error" text the swallowed exception used to return.
# The user's dev DSH 500 on form-spec?model=anny hid the cause; this
# test pins the surfacing so a regression to bare text is a red.
# ---------------------------------------------------------------------------

def test_gateway_surfaces_uncaught_exceptions_as_json() -> None:
    """RESILIENCE LAW: a failure documents the exact failure message —
    the HTTP layer too. A bare "Internal Server Error" 500 is a
    regression; the wall catches it."""
    import asyncio
    import sys
    sys.path.insert(0, os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", "..", "py"))
    import gateway
    from starlette.requests import Request

    async def _raise(*a: str | bytes | None, **k: str | bytes | None) -> NoReturn:
        raise ValueError("wall surfacing probe — the message must be visible")

    async def receive() -> dict[str, str | bytes | bool]:
        return {"type": "http.request", "body": b"", "more_body": False}

    scope = {
        "type": "http", "method": "GET",
        "path": "/v1/form-spec", "query_string": b"model=anny",
        "headers": [], "scheme": "https",
        "server": ("h", 3909), "client": ("c", 0),
        "app": type("A", (), {"state": type("S", (), {"gw": None})()})(),
    }

    orig = gateway.route
    gateway.route = _raise
    try:
        req = Request(scope, receive)
        resp = asyncio.run(gateway._adapt(req))
        assert resp.status_code == 500
        assert resp.media_type == "application/json", (
            "a 500 must be application/json (the bare text leak — "
            "the old 'Internal Server Error' body — is back)")
        body = resp.body.decode() if hasattr(resp.body, "decode") else resp.body
        j = json.loads(body)
        assert j.get("error") == "wall surfacing probe — the message must be visible", (
            "500 JSON body must carry the real exception message: %r" % j)
        assert j.get("type") == "ValueError"
        assert "traceback" in j and "ValueError" in j["traceback"], (
            "500 JSON body must carry the traceback so the wall and "
            "the user can see the cause: %r" % j)
        assert j.get("route") == "GET /v1/form-spec?model=anny", (
            "500 JSON body must name the route: %r" % j)
    finally:
        gateway.route = orig

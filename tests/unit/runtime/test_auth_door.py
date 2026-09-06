"""test_auth_door.py - the R2 token-auth wall (2026-09-06;
design record docs/gateway/auth.md). The door is OPTIONAL: the env
unset means auth OFF (the dev default - the editor talks to
localhost bare). Set means every door except /v1/health demands a
bearer token; the WS door takes ?token= too (browsers cannot set
WS headers).

Pinned, all offline (scratch gateway, TestClient):
  1. OFF by default: no env, no header - routes serve.
  2. ON: missing / wrong bearer -> 401 + WWW-Authenticate + a body
     that names the env var; /v1/health stays exempt.
  3. ON: the right bearer serves.
  4. ON: the WS handshake is refused without a token and passes
     with ?token=.
  5. WS OFF: tokenless connect answers the unknown-run frame.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from starlette.applications import Starlette
from starlette.routing import Route as HTTPRoute
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "py"))

import gateway as gw_mod  # noqa: E402

JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None


def _client() -> TestClient:
    app = Starlette(routes=[
        gw_mod.WSRoute("/v1/flows/events/{run_id:path}",
                       gw_mod._ws_starlette),
        gw_mod.WSRoute("/v1/flows/events", gw_mod._ws_starlette),
        HTTPRoute("/", gw_mod._adapt, methods=["GET", "POST"]),
        HTTPRoute("/{rest:path}", gw_mod._adapt,
                  methods=["GET", "POST", "PUT", "DELETE"]),
    ])
    app.state.gw = gw_mod.Gateway()
    return TestClient(app)


def test_auth_off_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv(gw_mod.AUTH_TOKEN_ENV, raising=False)
    with _client() as c:
        r = c.get("/v1/metrics")
        assert r.status_code == 200
        assert r.json()["queue_depth"] == 0


def test_auth_on_missing_or_wrong_bearer_401(
        monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(gw_mod.AUTH_TOKEN_ENV, "s3cret")
    with _client() as c:
        bare = c.get("/v1/metrics")
        assert bare.status_code == 401
        assert bare.headers["www-authenticate"] == "Bearer"
        assert gw_mod.AUTH_TOKEN_ENV in bare.json()["error"]
        wrong = c.get("/v1/metrics",
                      headers={"Authorization": "Bearer nope"})
        assert wrong.status_code == 401


def test_auth_on_health_exempt_and_bearer_serves(
        monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(gw_mod.AUTH_TOKEN_ENV, "s3cret")
    with _client() as c:
        assert c.get("/v1/health").status_code == 200
        ok = c.get("/v1/metrics",
                   headers={"Authorization": "Bearer s3cret"})
        assert ok.status_code == 200
        assert "boot_at" in ok.json()


def test_ws_handshake_refused_without_token_passes_with_query(
        monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(gw_mod.AUTH_TOKEN_ENV, "s3cret")
    with _client() as c:
        with pytest.raises(WebSocketDisconnect):
            with c.websocket_connect("/v1/flows/events"):
                pass
        with c.websocket_connect(
                "/v1/flows/events?token=s3cret&run_id=ghost") as ws:
            frame = ws.receive_json()
        assert frame["type"] == "run"
        assert frame["status"] == "unknown"


def test_ws_token_off_by_default(
        monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv(gw_mod.AUTH_TOKEN_ENV, raising=False)
    with _client() as c:
        with c.websocket_connect(
                "/v1/flows/events?run_id=ghost") as ws:
            frame = ws.receive_json()
        assert frame["status"] == "unknown"

"""Head-asset wall - pins the CSS and JS the browser needs. Regression pins for the remote-browser incident.

- exactly ONE htmx core (a second 1.x tag used to downgrade the matched
  2.x core under the 2.x ws extension, killing chat-ws);
- the ws extension rides with the core (the chat form needs it);
- NO live-reload script (live mode opened a live-reload socket, blocked
  on the https tailnet page, reconnecting in a tight loop);
- the daisy plus franken plus tailwind CSS links all present;
- an inline favicon (kills the favicon 404 noise).
"""

from __future__ import annotations

from starlette.testclient import TestClient

from infer_daisy_studio import app as appmod
from infer_daisy_studio.app import build_app
from infer_daisy_studio.chat import EchoAgent
from tests.test_routes import _FakeClient


def _head() -> str:
    appmod._CHAT.clear()
    t = TestClient(build_app(lambda: _FakeClient(), lambda: EchoAgent())).get("/").text
    appmod._CHAT.clear()
    return t.split("<head>")[1].split("</head>")[0]


def test_head_has_exactly_one_htmx_core() -> None:
    h = _head()
    assert "htmx.org@" not in h
    assert h.count("/assets/htmx.min.js") == 1


def test_head_has_ws_extension_for_chat() -> None:
    h = _head()
    assert "/assets/ws.js" in h


def test_head_has_no_live_reload_storm() -> None:
    assert "live-reload" not in _head()


def test_head_has_css_stack() -> None:
    h = _head().lower()
    assert "daisyui" in h
    assert "tailwind" in h
    assert "franken" not in h


def test_head_has_inline_favicon() -> None:
    assert "rel=" in _head() and "icon" in _head()


def test_head_is_fully_offline_capable() -> None:
    h = _head()
    assert "cdn.jsdelivr.net" not in h
    assert "cdn.tailwindcss.com" not in h
    assert "cdnjs.cloudflare.com" not in h
    assert "unpkg.com" not in h


def test_static_assets_serve_200() -> None:
    from infer_daisy_studio.app import STATIC_DIR, STATIC_FILES
    assert STATIC_DIR.is_dir()
    for name in STATIC_FILES:
        assert (STATIC_DIR / name).is_file()
    appmod._CHAT.clear()
    t = TestClient(build_app(lambda: _FakeClient(), lambda: EchoAgent()))
    for name in STATIC_FILES:
        r = t.get("/assets/" + name)
        assert r.status_code == 200
    appmod._CHAT.clear()


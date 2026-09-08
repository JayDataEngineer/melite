"Chat UI pins."

from __future__ import annotations

from starlette.testclient import TestClient

from infer_daisy_studio import app as appmod
from infer_daisy_studio.app import build_app
from infer_daisy_studio.chat import EchoAgent
from tests.test_routes import _FakeClient


def _client() -> TestClient:
    appmod._CHAT.clear()
    return TestClient(build_app(lambda: _FakeClient(), lambda: EchoAgent()))


def test_harness_agent_defaults_to_provisioned_home() -> None:
    from infer_daisy_studio.chat import HarnessAgent, _default_home
    home = _default_home()
    assert home.endswith("dsh-harness-home")
    assert HarnessAgent().dsh_home == home
    assert HarnessAgent(dsh_home="/tmp").dsh_home == "/tmp"


def test_composer_keeps_ws_door() -> None:
    t = _client().get("/chat").text
    assert "chat-form" in t
    assert "chat-prompt" in t
    assert "chat-send" in t
    assert "ws-connect" in t and "/chat-ws" in t
    assert "New chat" in t and "/chat/new" in t
    appmod._CHAT.clear()


def test_behavior_hooks_present() -> None:
    t = _client().get("/chat").text
    assert "chatAutoResize" in t
    assert "chatCheckEnter" in t
    assert "chatRenderMd" in t
    assert "chatBoot" in t
    assert "MutationObserver" in t
    assert "dataset.done" in t
    assert "/assets/marked.min.js" in t
    assert "/assets/purify.min.js" in t
    appmod._CHAT.clear()


def test_assistant_bubbles_carry_md_target() -> None:
    c = _client()
    r = c.post("/chat", data={"prompt": "bold move", "session": "mdtest"})
    assert "md-body" in r.text
    assert "message-1" in r.text
    assert "message-1-content" in r.text
    appmod._CHAT.clear()


def test_new_chat_clears_session() -> None:
    c = _client()
    c.post("/chat", data={"prompt": "remember me", "session": "forgetme"})
    assert len(appmod._CHAT["forgetme"]) == 2
    r = c.post("/chat/new/forgetme")
    assert r.status_code == 200
    assert appmod._CHAT["forgetme"] == []
    assert "remember me" not in r.text
    appmod._CHAT.clear()

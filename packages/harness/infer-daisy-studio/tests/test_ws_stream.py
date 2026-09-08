"""Streaming tests - EchoAgent word chunks, iter_answer, WS roundtrip.

Pins the turn-6 upgrade: token-by-token chat over the FastHTML WS door
(/chat-ws); POST /chat stays the fallback. fh-chat pattern (daisy
bubbles, OOB appends), FastGPT UX (session memory in _CHAT).
"""

from __future__ import annotations

import json

from starlette.testclient import TestClient

from infer_daisy_studio import app as appmod
from infer_daisy_studio.app import build_app
from infer_daisy_studio.chat import EchoAgent, iter_answer
from tests.test_routes import _FakeClient


def test_echo_stream_yields_words_and_records() -> None:
    a = EchoAgent()
    chunks = list(a.stream("hi there", "s-stream"))
    assert "".join(chunks) == "echo: hi there "
    assert a.calls == [("hi there", "s-stream")]


def test_iter_answer_prefers_stream_over_reply() -> None:
    a = EchoAgent()
    assert "".join(iter_answer(a, "yo", "s-iter")) == "echo: yo "

    class _ReplyOnly:
        def reply(self, prompt: str, session_id: str) -> str:
            return "R:" + prompt

    assert "".join(iter_answer(_ReplyOnly(), "yo", "s-ro")) == "R:yo"


def test_chat_pane_advertises_ws_door() -> None:
    appmod._CHAT.clear()
    t = TestClient(build_app(lambda: _FakeClient(), lambda: EchoAgent())).get("/chat").text
    assert "ws-connect" in t
    assert "/chat-ws" in t
    assert "hx-ext" in t
    appmod._CHAT.clear()


def test_ws_roundtrip_streams_echo_chunks() -> None:
    appmod._CHAT.clear()
    client = TestClient(build_app(lambda: _FakeClient(), lambda: EchoAgent()))
    with client.websocket_connect("/chat-ws") as ws:
        ws.send_text(json.dumps({"prompt": "hello ws", "session": "wstest"}))
        msgs = [ws.receive_text() for _ in range(9)]
    body = chr(10).join(msgs)
    assert "hello ws" in body
    assert "echo:" in body
    assert "disabled" in msgs[1] and "disabled" in msgs[2]
    assert "disabled" not in msgs[7] and "disabled" not in msgs[8]
    assert "message-0-content" in body
    assert "message-1-content" in body
    assert "message-2-content" not in body
    hist = dict(appmod._CHAT)["wstest"]
    assert hist[0] == ("user", "hello ws")
    assert hist[1][0] == "assistant"
    assert "echo: hello ws" in hist[1][1]
    appmod._CHAT.clear()


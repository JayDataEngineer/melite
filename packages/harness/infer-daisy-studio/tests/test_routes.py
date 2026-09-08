"""Route tests - daisy studio against fake client + fake agent.

Pins: sidebar sections, lane form, validate/start verbatim replies, run
polling attr, fatal banner, chat bubbles, gallery grid, healthz.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from starlette.testclient import TestClient

from infer_daisy_studio import app as appmod
from infer_daisy_studio.app import build_app
from infer_daisy_studio.chat import ChatAgent, EchoAgent
from infer_daisy_studio.gateway_client import Draft, GatewayError, Lane, ParamSchema, Run, StageRow

if TYPE_CHECKING:
    from fasthtml.common import FastHTML

# Request bodies mirror the gateway wire as decoded JSON.
JsonValue = str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]


class _FakeClient:
    def __init__(self, base_url: str = "http://gw:1") -> None:
        self._base = base_url
        self.lanes_payload = [
            Lane(lane="h3-timeline", kind="video", genre="video", title="H3 Timeline"),
            Lane(lane="audio-tts", kind="audio", genre="audio", title="Audio TTS"),
        ]
        self.drafts_payload = [Draft(draft_id="d1", flow="h3-timeline", name="My shot",
                                     params={"prompt": "a horse"})]
        self.runs_payload = [
            Run(run_id="r1", flow="h3-timeline", status="succeeded",
                stages=(StageRow(id="s1", engine="comfyui", status="succeeded"),)),
            Run(run_id="r2", flow="audio-tts", status="running",
                stages=(StageRow(id="tts", engine="comfyui", status="running"),)),
        ]
        self.start_calls: list = []
        self.validate_calls: list = []
        self.stop_calls: list = []
        self.validate_result = {"ok": True}
        self.start_result = {"run_id": "r_new"}
        self.stop_result = {"status": "stopped"}

    def health(self) -> dict[str, str]:
        return {"status": "ok"}

    def lanes(self) -> list[Lane]:
        return list(self.lanes_payload)

    def drafts(self) -> list[Draft]:
        return list(self.drafts_payload)

    def draft(self, draft_id: str) -> Draft:
        return next(d for d in self.drafts_payload if d.ref() == draft_id)

    def runs(self, limit: int = 50) -> list[Run]:
        return list(self.runs_payload)

    def run(self, run_id: str) -> Run:
        return next(r for r in self.runs_payload if r.ref() == run_id)

    def param_schema(self, lane: str) -> ParamSchema:
        if lane == "h3-timeline":
            return ParamSchema(fields=(
                {"name": "prompt", "type": "text", "title": "Prompt", "default": "a horse"},
                {"name": "seed", "type": "integer", "title": "Seed", "default": 42}),
                required=("prompt",), model="test-model")
        raise GatewayError("unknown lane " + lane)

    def validate(self, body: dict[str, JsonValue]) -> dict[str, JsonValue]:
        self.validate_calls.append(body)
        return self.validate_result

    def start(self, body: dict[str, JsonValue]) -> dict[str, JsonValue]:
        self.start_calls.append(body)
        return self.start_result

    def stop(self, run_id: str) -> dict[str, JsonValue]:
        self.stop_calls.append(run_id)
        return self.stop_result


def _build(fake: _FakeClient | None = None,
           agent: ChatAgent | None = None) -> FastHTML:
    return build_app(lambda: fake or _FakeClient(), lambda: agent or EchoAgent())


def test_index_renders_three_sidebar_sections_and_tabs() -> None:
    r = TestClient(_build()).get("/")
    assert r.status_code == 200
    for needle in ("Daisy Studio", "h3-timeline", "audio-tts", "My shot", "http://gw:1"):
        assert needle in r.text, needle
    for tab in ("Operate", "Chat", "Gallery"):
        assert tab in r.text, tab


def test_index_fatal_when_gateway_down() -> None:
    class _Down(_FakeClient):
        def lanes(self) -> None:
            raise GatewayError("connect: refused")
    r = TestClient(_build(_Down())).get("/")
    assert r.status_code == 200
    assert "gateway unreachable" in r.text.lower()
    assert "http://gw:1" in r.text


def test_healthz() -> None:
    assert TestClient(_build()).get("/healthz").json() == {"ok": True}


def test_flow_detail_renders_daisy_form() -> None:
    r = TestClient(_build()).get("/flow/h3-timeline")
    assert r.status_code == 200
    assert 'name="prompt"' in r.text
    assert 'name="seed"' in r.text
    assert "Validate" in r.text and "Start run" in r.text
    assert "franken" not in r.text.lower()
    assert "daisy" in r.text.lower()


def test_lane_buttons_submit_enclosing_form() -> None:
    r = TestClient(_build()).get("/flow/h3-timeline")
    assert r.status_code == 200
    assert "hx-include" not in r.text
    form = r.text.split("<form")[1].split("</form>")[0]
    assert "name=" in form and "prompt" in form
    assert "Validate" in form and "Start run" in form



def test_flow_detail_unknown_lane_surfaces_error() -> None:
    r = TestClient(_build()).get("/flow/no-such-lane")
    assert r.status_code == 200
    assert "no-such-lane" in r.text


def test_validate_sends_form_params_and_reports_clean() -> None:
    fake = _FakeClient()
    r = TestClient(_build(fake)).post("/flow/h3-timeline/validate",
        data={"lane": "h3-timeline", "prompt": "a horse", "seed": "7"})
    assert r.status_code == 200
    assert fake.validate_calls[0]["model"] == "h3-timeline"
    assert fake.validate_calls[0]["seed"] == 7
    assert "params" not in fake.validate_calls[0]
    assert "Compile clean" in r.text


def test_validate_prefers_posted_model_over_lane() -> None:
    fake = _FakeClient()
    r = TestClient(_build(fake)).post("/flow/tts/validate",
        data={"lane": "tts", "model": "qwen3-tts", "text": "hi"})
    assert r.status_code == 200
    assert fake.validate_calls[0]["model"] == "qwen3-tts"
    assert fake.validate_calls[0]["text"] == "hi"
    assert "params" not in fake.validate_calls[0]


def test_validate_surfaces_compile_refusal_verbatim() -> None:
    fake = _FakeClient()
    fake.validate_result = {"ok": False, "error": "missing_field", "field": "prompt"}
    r = TestClient(_build(fake)).post("/flow/h3-timeline/validate", data={"lane": "h3-timeline"})
    assert r.status_code == 200
    assert "missing_field" in r.text and "prompt" in r.text


def test_start_returns_queued_run_link() -> None:
    fake = _FakeClient()
    fake.start_result = {"run_id": "r_xyz"}
    r = TestClient(_build(fake)).post("/flow/h3-timeline/start",
        data={"lane": "h3-timeline", "prompt": "a horse", "seed": "42"})
    assert r.status_code == 200
    assert fake.start_calls[0]["seed"] == 42
    assert "r_xyz" in r.text and "/run/r_xyz" in r.text


def test_run_page_polls_while_running() -> None:
    r = TestClient(_build()).get("/run/r2")
    assert r.status_code == 200
    assert "every 2s" in r.text
    assert "Stop" in r.text


def test_run_page_quiet_when_terminal() -> None:
    r = TestClient(_build()).get("/run/r1")
    assert r.status_code == 200
    assert "every 2s" not in r.text


def test_stop_reports_status() -> None:
    fake = _FakeClient()
    r = TestClient(_build(fake)).post("/run/r2/stop")
    assert r.status_code == 200
    assert fake.stop_calls == ["r2"]
    assert "stopped" in r.text.lower()


def test_chat_roundtrip_renders_bubbles() -> None:
    appmod._CHAT.clear()
    agent = EchoAgent()
    c = TestClient(_build(agent=agent))
    r = c.post("/chat", data={"prompt": "hello studio", "session": "t1"})
    assert r.status_code == 200
    assert "hello studio" in r.text
    assert "chat-bubble" in r.text
    assert agent.calls == [("hello studio", "t1")]
    r2 = c.get("/chat", params={"session": "t1"})
    assert "hello studio" in r2.text
    appmod._CHAT.clear()


def test_chat_surfaces_agent_failure_verbatim() -> None:
    appmod._CHAT.clear()
    class _Boom:
        def reply(self, prompt: str, session_id: str) -> None:
            from infer_daisy_studio.chat import ChatError
            raise ChatError("sdk missing here")
    r = TestClient(_build(agent=_Boom())).post("/chat", data={"prompt": "hi", "session": "t9"})
    assert r.status_code == 200
    assert "sdk missing here" in r.text
    appmod._CHAT.clear()


def test_gallery_grids_runs() -> None:
    r = TestClient(_build()).get("/gallery")
    assert r.status_code == 200
    assert "/run/r1" in r.text and "/run/r2" in r.text


def test_param_schema_reads_tool_level_shape() -> None:
    from infer_daisy_studio.gateway_client import GatewayClient
    c = GatewayClient("http://127.0.0.1:9")
    bundle = {"tools": [{"model": "qwen3-tts", "params_schema": {"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]}}]}
    c._get = lambda path, **kw: bundle
    s = c.param_schema("tts")
    assert [f.get("name") for f in s.fields] == ["text"]
    assert list(s.required) == ["text"]
    assert s.model == "qwen3-tts"


def test_shell_uses_daisy_chrome_and_dark() -> None:
    t = TestClient(_build()).get("/")
    assert t.status_code == 200
    assert "tabs-bordered" in t.text
    assert "tab-active" in t.text
    assert "menu-title" in t.text
    assert "badge-outline" in t.text
    assert "data-theme=" in t.text and "dark" in t.text

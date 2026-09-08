"""Route tests — drive the FastHTML app against a fake client.

The fake implements the same surface as GatewayClient (lanes, drafts,
runs, run, param_schema, validate, start, stop) but with no network.
The route handlers call `get_client()` per request, so the fake is
swapped in via a factory passed to `build_app`.

These tests pin:
  - the index page renders a sidebar with sections (Lanes, Drafts, Runs)
  - the lane detail page renders a form
  - validate / start POSTs the gateway and surface the verbatim reply
  - the run page polls status (HTMX `every 2s` attribute when not
    terminal)
  - a gateway failure on the index renders the fatal banner with the
    gateway URL (so the operator knows where it tried to reach)
"""

from __future__ import annotations

from typing import Protocol
from fasthtml.common import FastHTML
from starlette.testclient import TestClient

from infer_flow_tavern.app import build_app
from infer_flow_tavern.gateway_client import (
    Draft, GatewayError, Lane, Run, StageRow,
)


# ── JSON aliases (typing-only; fake wire payloads are JSON-shaped) ───
JsonValue = str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]
JsonDict = dict[str, JsonValue]


class _SchemaLike(Protocol):
    """Structural surface of the fake param_schema result (and the real
    ParamSchema row): the lane name, its form-field dicts, and the
    required field names. The fake builds an anonymous attribute bag;
    this protocol names what the route actually reads."""
    lane: str
    fields: tuple[JsonDict, ...]
    required: tuple[str, ...]


# ── fake client ─────────────────────────────────────────────────────

class _FakeClient:
    def __init__(self, base_url: str = "http://gw:1") -> None:
        self._base = base_url
        self.health_payload = {"status": "ok"}
        self.lanes_payload = [
            Lane(lane="h3-timeline", kind="video", genre="video",
                 title="H3 Timeline", one_liner="The 9:16 video timeline"),
            Lane(lane="audio-tts", kind="audio", genre="audio",
                 title="Audio TTS", one_liner="Qwen3 TTS via ComfyUI"),
        ]
        self.drafts_payload = [
            Draft(draft_id="d1", flow="h3-timeline", name="My shot",
                  params={"prompt": "a horse", "seed": 7}),
        ]
        self.runs_payload = [
            Run(run_id="r1", flow="h3-timeline", status="succeeded",
                stages=(StageRow(id="s1", engine="comfyui", status="succeeded"),)),
            Run(run_id="r2", flow="audio-tts", status="running",
                stages=(StageRow(id="tts", engine="comfyui", status="running"),)),
        ]
        # Wire-roundtrip recorders
        self.start_calls: list[JsonDict] = []
        self.validate_calls: list[JsonDict] = []
        self.stop_calls: list[str] = []
        # Operator-controllable response (default: success)
        self.validate_result: JsonDict = {"ok": True}
        self.start_result: JsonDict = {"run_id": "r_new"}
        self.stop_result: JsonDict = {"status": "stopped"}

    def health(self) -> JsonDict:
        return self.health_payload

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

    def param_schema(self, lane: str) -> _SchemaLike:
        if lane == "h3-timeline":
            return type("S", (), {
                "lane": "h3-timeline",
                "fields": (
                    {"name": "prompt", "type": "text", "title": "Prompt",
                     "default": "a horse"},
                    {"name": "seed", "type": "integer", "title": "Seed",
                     "default": 42},
                ),
                "required": ("prompt",),
            })()
        raise GatewayError(f"unknown lane {lane}")

    def validate(self, body: JsonDict) -> JsonDict:
        self.validate_calls.append(body)
        return self.validate_result

    def start(self, body: JsonDict) -> JsonDict:
        self.start_calls.append(body)
        return self.start_result

    def stop(self, run_id: str) -> JsonDict:
        self.stop_calls.append(run_id)
        return self.stop_result


# ── helpers ─────────────────────────────────────────────────────────

def _build(fake: _FakeClient) -> FastHTML:
    return build_app(lambda: fake)


# ── index page ──────────────────────────────────────────────────────

def test_index_renders_three_sidebar_sections() -> None:
    c = TestClient(_build(_FakeClient()))
    r = c.get("/")
    assert r.status_code == 200
    body = r.text
    assert "Flow Tavern" in body
    # Lanes section
    assert "h3-timeline" in body
    assert "audio-tts" in body
    # Drafts
    assert "My shot" in body
    # Runs
    assert "r1"[:6] in body or "r1" in body  # run id is shown
    # Gateway URL visible (operator reassurance)
    assert "http://gw:1" in body


def test_index_gives_fatal_banner_when_gateway_down() -> None:
    class _Down(_FakeClient):
        def lanes(self) -> list[Lane]:
            raise GatewayError("connect: refused")
    c = TestClient(_build(_Down()))
    r = c.get("/")
    assert r.status_code == 200
    assert "gateway unreachable" in r.text.lower()
    assert "http://gw:1" in r.text  # shows the URL it tried


# ── flow detail ─────────────────────────────────────────────────────

def test_flow_detail_renders_form() -> None:
    c = TestClient(_build(_FakeClient()))
    r = c.get("/flow/h3-timeline")
    assert r.status_code == 200
    body = r.text
    # The form fields (input names land in the HTML)
    assert 'name="prompt"' in body
    assert 'name="seed"' in body
    # The action buttons
    assert "Validate" in body
    assert "Start run" in body


def test_flow_detail_unknown_lane_surfaces_error() -> None:
    c = TestClient(_build(_FakeClient()))
    r = c.get("/flow/no-such-lane")
    assert r.status_code == 200
    assert "no-such-lane" in r.text
    assert "not in" in r.text  # the verbatim error


# ── validate / start endpoints ──────────────────────────────────────

def test_validate_sends_form_params() -> None:
    fake = _FakeClient()
    c = TestClient(_build(fake))
    r = c.post(
        "/flow/h3-timeline/validate",
        data={"lane": "h3-timeline", "prompt": "a horse", "seed": "7"},
    )
    assert r.status_code == 200
    assert len(fake.validate_calls) == 1
    body = fake.validate_calls[0]
    assert body["flow"] == "h3-timeline"
    assert body["params"]["prompt"] == "a horse"
    assert body["params"]["seed"] == 7  # numeric coercion
    # The "compile clean" success message
    assert "Compile clean" in r.text


def test_validate_surfaces_compile_refusal_verbatim() -> None:
    fake = _FakeClient()
    fake.validate_result = {"ok": False, "error": "missing_field", "field": "prompt"}
    c = TestClient(_build(fake))
    r = c.post(
        "/flow/h3-timeline/validate",
        data={"lane": "h3-timeline", "prompt": ""},
    )
    assert r.status_code == 200
    # The verbatim error MUST be in the response — RESILIENCE LAW
    assert "missing_field" in r.text
    assert "prompt" in r.text


def test_start_returns_inline_run_link() -> None:
    fake = _FakeClient()
    fake.start_result = {"run_id": "r_xyz"}
    c = TestClient(_build(fake))
    r = c.post(
        "/flow/h3-timeline/start",
        data={"lane": "h3-timeline", "prompt": "a horse", "seed": "42"},
    )
    assert r.status_code == 200
    assert len(fake.start_calls) == 1
    assert fake.start_calls[0]["params"]["seed"] == 42
    assert "r_xyz" in r.text
    # The link target is the run page
    assert "/run/r_xyz" in r.text


def test_start_surfaces_refusal_inline() -> None:
    fake = _FakeClient()
    fake.start_result = {"error": "queue_full", "detail": "GPU busy, retry later"}
    c = TestClient(_build(fake))
    r = c.post(
        "/flow/h3-timeline/start",
        data={"lane": "h3-timeline", "prompt": "a horse"},
    )
    # 200 with an alert block (the route catches and renders; RESILIENCE LAW)
    assert r.status_code == 200
    assert "queue_full" in r.text


# ── run page polling ────────────────────────────────────────────────

def test_run_detail_polls_while_running() -> None:
    c = TestClient(_build(_FakeClient()))
    r = c.get("/run/r2")  # the running one
    assert r.status_code == 200
    body = r.text
    # HTMX poll trigger on non-terminal runs
    assert "every 2s" in body or 'hx-trigger="every' in body
    # The stop button is present
    assert "Stop" in body


def test_run_detail_does_not_poll_when_terminal() -> None:
    c = TestClient(_build(_FakeClient()))
    r = c.get("/run/r1")  # succeeded
    assert r.status_code == 200
    # No poll trigger
    assert "every 2s" not in r.text
    # No stop button
    assert "Stop" not in r.text


def test_run_stop_calls_gateway() -> None:
    fake = _FakeClient()
    c = TestClient(_build(fake))
    r = c.post("/run/r2/stop")
    assert r.status_code == 200
    assert fake.stop_calls == ["r2"]
    assert "stopped" in r.text.lower()

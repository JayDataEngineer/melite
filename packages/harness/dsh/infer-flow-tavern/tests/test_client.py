"""Gateway client tests — pinned to the wire shape, not the network.

The client is the single place endpoint paths live. These tests pin
the constructor's refusal semantics (no hardcoded fallback — the
QUEUE LANE LAW) and the row shapes (PYTHON SHAPE LAW: construction
is the validation door)."""

from __future__ import annotations

import json
from unittest.mock import MagicMock

import pytest

from infer_flow_tavern.gateway_client import (
    Draft, GatewayClient, GatewayError, Lane, Run, StageRow,
)


# ── JSON aliases (typing-only; fake bodies are JSON-shaped) ──────────
JsonValue = str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]
JsonDict = dict[str, JsonValue]


# ── constructor refusals (QUEUE LANE LAW) ────────────────────────────

def test_constructor_refuses_empty_url() -> None:
    with pytest.raises(GatewayError, match="GATEWAY_URL is empty"):
        GatewayClient("")


def test_constructor_refuses_no_scheme() -> None:
    with pytest.raises(GatewayError, match="must include scheme"):
        GatewayClient("localhost:33081")


def test_constructor_accepts_http() -> None:
    c = GatewayClient("http://localhost:33081")
    assert c._base == "http://localhost:33081"  # noqa: SLF001 — display


def test_constructor_strips_trailing_slash() -> None:
    c = GatewayClient("http://h:1/")
    assert c._base == "http://h:1"  # noqa: SLF001


# ── from_env: explicit env, no silent localhost fallback ─────────────

def test_from_env_uses_melite_gateway(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MELITE_GATEWAY", "http://gw:1234")
    monkeypatch.delenv("FLOATER_ALLOW_LOCAL", raising=False)
    c = GatewayClient.from_env()
    assert c._base == "http://gw:1234"  # noqa: SLF001


def test_from_env_refuses_when_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("MELITE_GATEWAY", raising=False)
    monkeypatch.delenv("FLOATER_ALLOW_LOCAL", raising=False)
    with pytest.raises(GatewayError, match="GATEWAY_URL is not set"):
        GatewayClient.from_env()


def test_from_env_opt_in_local_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("MELITE_GATEWAY", raising=False)
    monkeypatch.setenv("FLOATER_ALLOW_LOCAL", "1")
    c = GatewayClient.from_env()
    assert c._base == "http://localhost:33081"  # noqa: SLF001


# ── row validation (PYTHON SHAPE LAW) ───────────────────────────────

def test_lane_validates() -> None:
    lane = Lane.model_validate({
        "lane": "h3-timeline",
        "kind": "video",
        "genre": "video",
        "title": "H3 Timeline",
        "oneLiner": "The 9:16 video timeline",
    })
    assert lane.lane == "h3-timeline"
    assert lane.name() == "h3-timeline"
    assert lane.one_liner == "The 9:16 video timeline"  # alias resolved


def test_lane_accepts_legacy_id_field() -> None:
    """Older gateway versions may have used `id` instead of `lane`.
    The client tolerates both shapes (the name() helper prefers
    `lane`, falls back to `id`). The UI must not refuse to render
    a legacy wire — that's a forward-compat pin."""
    lane = Lane.model_validate({"id": "legacy-name", "kind": "video"})
    assert lane.lane is None
    assert lane.id == "legacy-name"
    assert lane.name() == "legacy-name"


def test_lane_ignores_unknown_fields_for_forward_compat() -> None:
    # The gateway may add fields to its wire (a new `engine` column on
    # /v1/lanes, say) and the UI must NOT refuse to render. extra="ignore"
    # is the operator-chosen policy — the row is built with the known
    # fields; the extras ride silently. The PYTHON SHAPE LAW's
    # "construction is the validation door" is honored for the
    # DECLARED shape, not the wire's future shape.
    lane = Lane.model_validate({"lane": "x", "definitely_not_a_field": True})
    assert lane.name() == "x"
    # The unknown field is not exposed on the model (it's not declared).
    assert not hasattr(lane, "definitely_not_a_field")


def test_draft_validates_minimal() -> None:
    d = Draft.model_validate({"draft_id": "d1", "params": {"prompt": "hi"}})
    assert d.params == {"prompt": "hi"}
    assert d.ref() == "d1"


def test_draft_legacy_id_field() -> None:
    d = Draft.model_validate({"id": "legacy", "params": {}})
    assert d.draft_id is None
    assert d.id == "legacy"
    assert d.ref() == "legacy"


def test_run_with_stages() -> None:
    r = Run.model_validate({
        "run_id": "r1",
        "flow": "h3-timeline",
        "status": "running",
        "stages": [
            {"id": "s1", "engine": "comfyui", "status": "succeeded"},
            {"id": "s2", "engine": "comfyui", "status": "running"},
        ],
    })
    assert r.ref() == "r1"
    assert r.lane_name() == "h3-timeline"
    assert len(r.stages) == 2
    assert r.stages[0].status == "succeeded"
    assert isinstance(r.stages[1], StageRow)


def test_run_tolerates_stages_as_json_string() -> None:
    """The single-run endpoint serializes `stages` as a JSON string
    (the sidecar writer's choice). The list endpoint omits the field.
    The row's BeforeValidator unwraps the string before tuple
    coercion, so both shapes land on the same model."""
    import json as _json
    r = Run.model_validate({
        "run_id": "r2",
        "flow": "krea-2",
        "status": "completed",
        "stages": _json.dumps([
            {"id": "generate", "engine": "comfyui", "status": "completed"},
        ]),
    })
    assert len(r.stages) == 1
    assert r.stages[0].id == "generate"


def test_run_tolerates_stages_empty_string() -> None:
    r = Run.model_validate({"run_id": "r3", "stages": ""})
    assert r.stages == ()


def test_run_tolerates_garbage_stages_string() -> None:
    """A malformed stages string refuses loud at the field validator,
    falls back to an empty tuple (the UI shows 'no stages yet' rather
    than a 500). The gateway shouldn't emit garbage, but the UI
    outlives the gateway's mistakes (RESILIENCE LAW)."""
    r = Run.model_validate({"run_id": "r4", "stages": "this is not json"})
    assert r.stages == ()


# ── wire passthrough: client surfaces verbatim error body ────────────

class _FakeResp:
    def __init__(self, status: int, body: JsonValue, content_type: str = "application/json") -> None:
        self.status_code = status
        self._body = body
        self.content = b"" if body is None else json.dumps(body).encode()
        self.headers = {"content-type": content_type}
        self.text = "" if body is None else json.dumps(body)

    def json(self) -> JsonValue:
        if self._body is None:
            raise json.JSONDecodeError("empty", "", 0)
        return self._body


def test_4xx_surfaces_verbatim_body(monkeypatch: pytest.MonkeyPatch) -> None:
    """The validate door's compile refusal MUST ride the wire into
    the UI alert — the sidecar's `error` field is the operator's
    source of truth (RESILIENCE LAW). The client must NOT collapse
    the message into a generic 'failed'."""
    c = GatewayClient("http://gw:1")
    fake = MagicMock()
    fake.request.return_value = _FakeResp(400, {
        "error": "missing_field",
        "field": "prompt",
        "stage": "tts",
    })
    c._client = fake  # noqa: SLF001
    with pytest.raises(GatewayError) as ei:
        c.validate({"flow": "x"})
    msg = str(ei.value)
    assert "missing_field" in msg
    assert "prompt" in msg


def test_2xx_with_empty_body_returns_none() -> None:
    c = GatewayClient("http://gw:1")
    fake = MagicMock()
    fake.request.return_value = _FakeResp(204, None)
    c._client = fake  # noqa: SLF001
    assert c.health() == {}  # empty dict wrapped


def test_2xx_with_lanes_envelope() -> None:
    c = GatewayClient("http://gw:1")
    fake = MagicMock()
    fake.request.return_value = _FakeResp(200, {
        "lanes": [
            {"lane": "a", "kind": "video"},
            {"lane": "b", "kind": "audio"},
        ]
    })
    c._client = fake  # noqa: SLF001
    lanes = c.lanes()
    assert [l.name() for l in lanes] == ["a", "b"]


def test_2xx_legacy_items_envelope() -> None:
    """Older gateway versions used `items:` as the list key. The
    client tolerates both so the UI never has to special-case."""
    c = GatewayClient("http://gw:1")
    fake = MagicMock()
    fake.request.return_value = _FakeResp(200, {
        "items": [{"id": "a"}]
    })
    c._client = fake  # noqa: SLF001
    assert c.drafts()[0].id == "a"


def test_transport_error_wrapped() -> None:
    import httpx
    c = GatewayClient("http://gw:1")
    fake = MagicMock()
    fake.request.side_effect = httpx.ConnectError("refused")
    c._client = fake  # noqa: SLF001
    with pytest.raises(GatewayError, match="transport error"):
        c.health()


def test_param_schema_normalizes_json_schema_shape() -> None:
    """If the bundle returns JSON-Schema properties (the older shape),
    the client normalizes to a list of {name, ...spec} rows so the
    form renderer stays uniform."""
    c = GatewayClient("http://gw:1")
    fake = MagicMock()
    fake.request.return_value = _FakeResp(200, {
        "params_schema": {
            "fields": {
                "prompt": {"type": "string", "title": "Prompt"},
                "seed":   {"type": "integer", "default": 42},
            },
            "required": ["prompt"],
        }
    })
    c._client = fake  # noqa: SLF001
    schema = c.param_schema("any-lane")
    names = [f["name"] for f in schema.fields]
    assert names == ["prompt", "seed"]
    assert schema.required == ("prompt",)

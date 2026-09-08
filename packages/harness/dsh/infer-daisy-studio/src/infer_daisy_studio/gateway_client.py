"""Gateway client — typed rows over HTTP, no stringly handshakes.

The client speaks ONLY the documented gateway wire. Every shape below
is a frozen pydantic row (PYTHON SHAPE LAW rung 2 — validation at
construction). The flow system is the source of truth: the client is
a thin reader/writer, never an interpreter of the lane shape.

Endpoint surface used (gateway v1):

  GET  /v1/health                          liveness probe
  GET  /v1/lanes                           lane table (peek tier)
  GET  /v1/flows/drafts                    draft list (click-contract)
  GET  /v1/flows/drafts/{id}               one draft
  GET  /v1/flows/runs                      run history (sidecar rows)
  GET  /v1/flows/runs/{id}                 one run
  GET  /v1/flows/status/{id}               live status + queue pos
  POST /v1/flows/validate                  compile a flow_inline body
  POST /v1/flows/start                     submit a run
  POST /v1/flows/stop/{id}                 the stop door
  GET  /v1/flows/events/{id}               SSE progress stream
  GET  /v1/cards/{lane}/bundle             params_schema for a lane
  GET  /v1/skills/{id}                     skill body (lane craft docs)

The client is the ONLY place endpoint paths and field names live.
Every call site imports these helpers — no raw fetch() outside this
module (the property test in tests/ enforces it).
"""

from __future__ import annotations

import json
import os
from typing import Any, Iterable, Mapping
from urllib.parse import urljoin

import httpx
from pydantic import BaseModel, ConfigDict, Field, field_validator


# ── JSON aliases (typing-only; the wire is JSON-shaped) ───────────────
# Gateway payloads are decoded JSON: dicts of str keys over scalars,
# nested lists/dicts, or null. The alias below names that shape once
# so response helpers stay honest without a dynamic top type.
JsonValue = str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]
JsonDict = dict[str, JsonValue]


# ── rows (frozen pydantic) ────────────────────────────────────────────

class _Frozen(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")


class Lane(_Frozen):
    """One row of GET /v1/lanes. Fields are the documented wire shape;
    the gateway owns the meaning (a 'lane' is the lane name — the
    operator routes to it; not a uuid).

    Both `lane` (current wire) and `id` (legacy) are accepted as the
    canonical identifier; the `name()` helper picks the present one.
    This is the forward-compat pin — the wire shape evolves, the UI
    renders."""
    lane: str | None = None
    id: str | None = None
    kind: str | None = None
    genre: str | None = None
    title: str | None = None
    one_liner: str | None = Field(default=None, alias="oneLiner")
    description: str | None = None
    model: str | None = None
    shape: dict[str, Any] | None = None
    params: int | None = None
    skills: int | None = None

    model_config = ConfigDict(frozen=True, extra="ignore", populate_by_name=True)

    def name(self) -> str:
        """The canonical lane identifier (the field the start door
        takes as `{flow: <name>}`). Prefer `lane`, fall back to `id`
        for legacy wire shapes. Returns "" only if NEITHER is set —
        a malformed row that the gateway should never emit (it would
        fail at the route table, not here)."""
        return self.lane or self.id or ""


class Draft(_Frozen):
    """One row of GET /v1/flows/drafts. The wire uses `draft_id`
    (current) — older shapes may have used `id`. The `.ref` helper
    picks the present one, like Lane.name()."""
    draft_id: str | None = None
    id: str | None = None  # legacy
    lane: str | None = None
    flow: str | None = None  # current wire field for the lane name
    name: str | None = None
    title: str | None = None
    model: str | None = None
    params: dict[str, Any] = Field(default_factory=dict)
    updated: str | None = None
    created: str | None = None

    model_config = ConfigDict(frozen=True, extra="ignore", populate_by_name=True)

    def ref(self) -> str:
        """The canonical draft identifier (the field the start door
        takes as `{flow: <name>}` and the drafts URL uses as
        `/{draft_id}`). Prefer `draft_id`, fall back to `id`."""
        return self.draft_id or self.id or ""

    def lane_name(self) -> str:
        return self.lane or self.flow or ""


class StageRow(_Frozen):
    """One stage inside a run's stages[]. Sidecar _flow.json shape."""
    id: str
    engine: str | None = None
    status: str | None = None
    started: str | None = None
    ended: str | None = None
    error: str | None = None

    model_config = ConfigDict(frozen=True, extra="ignore")


class Run(_Frozen):
    """One row of GET /v1/flows/runs. The gateway writes sidecar JSON
    verbatim — we accept anything extra to stay forward-compatible with
    a row the gateway may add (no drift crash on the UI).

    The wire shape varies: list-endpoint runs have `stages` absent
    (the .stages accessor returns ()); the single-run endpoint returns
    `stages` as a JSON-encoded STRING. A BeforeValidator unwraps the
    string before tuple coercion, so both endpoints land on the same
    model."""
    run_id: str | None = None
    id: str | None = None  # legacy
    name: str | None = None
    flow: str | None = None
    lane: str | None = None
    status: str | None = None
    state: str | None = None  # single-run endpoint: mirrors status
    created: int | None = None  # single-run endpoint: epoch int
    created_at: int | None = None  # list endpoint: epoch int
    duration_sec: float | None = None
    started: str | None = None
    ended: str | None = None
    error: str | None = None
    prompt: str | None = None
    seed: int | None = None
    thumbnail: str | None = None
    draft_id: str | None = None
    stages: tuple[StageRow, ...] = ()
    artifacts: tuple[dict[str, Any], ...] = ()

    model_config = ConfigDict(frozen=True, extra="ignore", populate_by_name=True)

    @field_validator("stages", mode="before")
    @classmethod
    def _unwrap_stages(cls, v: JsonValue) -> list[JsonDict]:
        """Some gateway endpoints serialize `stages` as a JSON string
        (the sidecar writer's choice). The list endpoint omits it.
        Tolerate both — pass a list to the tuple coercion, or []."""
        if v is None or v == "":
            return []
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return []
        return v

    def ref(self) -> str:
        """The canonical run identifier (the field the runs URL uses
        as `/{run_id}`). Prefer `run_id`, fall back to `id`."""
        return self.run_id or self.id or ""

    def lane_name(self) -> str:
        return self.lane or self.flow or self.name or ""


class QueueStatus(_Frozen):
    """GET /v1/queue snapshot — used to render queue position + GPU state."""
    queued: tuple[dict[str, Any], ...] = ()
    running: dict[str, Any] | None = None
    active: str | None = None

    model_config = ConfigDict(frozen=True, extra="ignore")


class ParamSchema(_Frozen):
    """One lane's params_schema (the editor form contract). Rendered
    into the sidebar's flow detail pane as a dynamic form."""
    lane: str
    fields: tuple[dict[str, Any], ...] = ()
    required: tuple[str, ...] = ()
    model: str = ""

    model_config = ConfigDict(frozen=True, extra="ignore")


# ── client ────────────────────────────────────────────────────────────

class GatewayError(RuntimeError):
    """Raised on non-2xx. Carries the verbatim body so the UI shows the
    gateway's own error message (the sidecar's `error` field, the
    validate-door's compile refusal, etc.) — never a generic 'failed'."""


class GatewayClient:
    """Thin HTTP client. One instance per process; httpx.Client is
    connection-pooled so the sidebar refreshes are cheap.

    `base_url` MUST be set explicitly — no localhost default. The
    QUEUE LANE LAW refuses hardcoded endpoints: a missing or empty
    `GATEWAY_URL` is a constructor refusal."""

    def __init__(self, base_url: str, *, timeout: float = 20.0) -> None:
        url = (base_url or "").rstrip("/")
        if not url:
            raise GatewayError(
                "GATEWAY_URL is empty — set $MELITE_GATEWAY or pass --gateway "
                "(the QUEUE LANE LAW refuses hardcoded endpoints; canonical "
                "default is http://localhost:33081)."
            )
        if not (url.startswith("http://") or url.startswith("https://")):
            raise GatewayError(f"GATEWAY_URL must include scheme, got: {url!r}")
        self._base = url
        self._client = httpx.Client(timeout=timeout)

    @classmethod
    def from_env(cls) -> "GatewayClient":
        """Resolve the endpoint from $MELITE_GATEWAY (canonical env,
        matches the rest of the estate) and fall back to the documented
        default only if the operator opts in via $FLOATER_ALLOW_LOCAL=1.
        We never silently default to localhost in production — that is
        the QUEUE LANE LAW's 'no fallbacks' clause."""
        url = os.environ.get("MELITE_GATEWAY", "").strip()
        if not url:
            if os.environ.get("FLOATER_ALLOW_LOCAL") == "1":
                url = "http://localhost:33081"
            else:
                raise GatewayError(
                    "GATEWAY_URL is not set. Export MELITE_GATEWAY=http://host:port "
                    "(the canonical default is localhost:33081; pass "
                    "FLOATER_ALLOW_LOCAL=1 to opt in to that fallback)."
                )
        return cls(url)

    # ── base helpers ─────────────────────────────────────────────────

    def _get(self, path: str, **params: JsonValue) -> JsonValue:
        return self._req("GET", path, params=params or None)

    def _post(self, path: str, body: Mapping[str, JsonValue]) -> JsonValue:
        return self._req("POST", path, json_body=dict(body))

    def _req(
        self,
        method: str,
        path: str,
        *,
        params: Mapping[str, JsonValue] | None = None,
        json_body: Mapping[str, JsonValue] | None = None,
    ) -> JsonValue:
        url = urljoin(self._base + "/", path.lstrip("/"))
        try:
            r = self._client.request(
                method, url, params=params, json=json_body
            )
        except httpx.HTTPError as e:
            raise GatewayError(f"{method} {path}: transport error: {e}") from e
        if r.status_code >= 400:
            # Surface the verbatim body — the gateway's 4xx messages are
            # the contract (validate-door compile refusals name the
            # missing field, the start door names the unresolved model).
            raise GatewayError(
                f"{method} {path} → {r.status_code}: {r.text[:500]}"
            )
        if not r.content:
            return None
        try:
            return r.json()
        except json.JSONDecodeError as e:
            raise GatewayError(
                f"{method} {path}: non-JSON body ({r.headers.get('content-type')}): "
                f"{r.text[:200]}"
            ) from e

    # ── public surface ───────────────────────────────────────────────

    def health(self) -> JsonDict:
        body = self._get("/v1/health")
        if body is None:
            return {}
        return body if isinstance(body, dict) else {"raw": body}

    def lanes(self) -> list[Lane]:
        body = self._get("/v1/lanes") or {}
        rows = body.get("lanes") or body.get("items") or []
        return [Lane.model_validate(r) for r in rows]

    def drafts(self) -> list[Draft]:
        body = self._get("/v1/flows/drafts") or {}
        rows = body.get("drafts") or body.get("items") or []
        return [Draft.model_validate(r) for r in rows]

    def draft(self, draft_id: str) -> Draft:
        body = self._get(f"/v1/flows/drafts/{draft_id}")
        # The single-draft endpoint returns a JSON-encoded STRING
        # (the sidecar writer's choice). Unwrap it before model
        # validation — the same forward-compat the Run row does
        # for its stages field.
        if isinstance(body, str):
            try:
                body = json.loads(body)
            except json.JSONDecodeError as e:
                raise GatewayError(
                    f"/v1/flows/drafts/{draft_id}: non-JSON body: {body[:200]}"
                ) from e
        return Draft.model_validate(body)

    def runs(self, *, limit: int = 50) -> list[Run]:
        body = self._get("/v1/flows/runs", limit=limit) or {}
        rows = body.get("runs") or body.get("items") or []
        return [Run.model_validate(r) for r in rows]

    def run(self, run_id: str) -> Run:
        body = self._get(f"/v1/flows/runs/{run_id}")
        # The single-run endpoint returns JSON-as-string too
        # (the sidecar writer's choice). Unwrap; the row's
        # BeforeValidator handles the nested `stages` string.
        if isinstance(body, str):
            try:
                body = json.loads(body)
            except json.JSONDecodeError as e:
                raise GatewayError(
                    f"/v1/flows/runs/{run_id}: non-JSON body: {body[:200]}"
                ) from e
        return Run.model_validate(body)

    def status(self, run_id: str) -> JsonDict:
        body = self._get(f"/v1/flows/status/{run_id}")
        return body if isinstance(body, dict) else {}

    def queue(self) -> QueueStatus:
        body = self._get("/v1/queue") or {}
        return QueueStatus.model_validate(body)

    def param_schema(self, lane: str) -> ParamSchema:
        body = self._get(f"/v1/cards/{lane}/bundle") or {}
        # The bundle envelope is documented; the params_schema lives
        # under either `params_schema` (the editor door) or `form`
        # (older wire), or under tools[] (card-compose tools carry
        # their own params_schema - the live shape for lanes).
        # Take the first present with actual fields.
        cands = [body.get("params_schema") or {}, body.get("form") or {}]
        cands += [(t or {}).get("params_schema") or {} for t in (body.get("tools") or [])]
        ps = {}
        for cand in cands:
            if (cand.get("fields") or cand.get("properties")):
                ps = cand
                break
        fields = ps.get("fields") or ps.get("properties") or ()
        if isinstance(fields, dict):
            # JSON-Schema shape (properties: {name: {...}}) → list of
            # {name, schema} rows so the form renderer stays uniform.
            fields = [
                {"name": name, **{k: v for k, v in spec.items()}}
                for name, spec in fields.items()
            ]
        model = ""
        for tool in (body.get("tools") or []):
            mid = (tool or {}).get("model")
            if mid:
                model = str(mid)
                break
        return ParamSchema(
            lane=lane,
            fields=tuple(fields) if isinstance(fields, Iterable) else (),
            required=tuple(ps.get("required") or ()),
            model=model,
        )

    def validate(self, body: Mapping[str, JsonValue]) -> JsonDict:
        return self._post("/v1/flows/validate", body) or {}

    def start(self, body: Mapping[str, JsonValue]) -> JsonDict:
        return self._post("/v1/flows/start", body) or {}

    def stop(self, run_id: str) -> JsonDict:
        return self._post(f"/v1/flows/stop/{run_id}", {}) or {}

    def iter_events(self, run_id: str) -> Iterable[JsonDict]:
        """Yield SSE event dicts from /v1/flows/events/{run_id}. Used by
        the run-detail pane to live-stream status without a full reload.
        The gateway emits one terminal frame exactly once (the run
        sidecar's `terminal` event)."""
        url = urljoin(self._base + "/", f"v1/flows/events/{run_id}")
        event = ""
        data_lines: list[str] = []
        with self._client.stream("GET", url, timeout=None) as r:
            r.raise_for_status()
            for raw in r.iter_lines():
                if raw is None:
                    continue
                line = raw if isinstance(raw, str) else raw.decode("utf-8", "replace")
                if line == "":
                    if data_lines:
                        payload = "\n".join(data_lines)
                        try:
                            yield {"event": event or "message", "data": json.loads(payload)}
                        except json.JSONDecodeError:
                            yield {"event": event or "message", "data": payload}
                    event = ""
                    data_lines = []
                    continue
                if line.startswith(":"):
                    # SSE comment / heartbeat — ignore
                    continue
                if line.startswith("event:"):
                    event = line[len("event:"):].strip()
                elif line.startswith("data:"):
                    data_lines.append(line[len("data:"):].lstrip())

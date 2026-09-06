#!/usr/bin/env python3
"""lane_wire — the frozen wire contract for the lane-disclosure family.

The gap this module closes (the run_wire/form_wire precedent, applied
to the LAST unvalidated serving family): /v1/lanes, /v1/card-tools,
/v1/skills, /v1/skills/<id>, and /v1/cards/<lane>/bundle served
hand-built raw dicts from py/lane_disclosure.py with NOTHING between
construction and the wire — tool.json manifests were admitted by duck
typing (a bare isinstance(m, dict) let a manifest with no name, no
params_schema, or a string where an int belongs ride the agent
surface silently), and every peek/skill/bundle row was whatever the
scan loops happened to assemble.

The gate (PYTHON SHAPE LAW): every row this family serves is
CONSTRUCTED as a frozen pydantic row — an invalid row cannot be
built, so it cannot be served. Two failure classes, both LOUD:

  * SOURCE drift (a malformed tool.json, a doc row that cannot be
    built): the row is SKIPPED with a logged field-named reason and
    the listing continues (RESILIENCE LAW — document, then continue;
    never ship garbage, never die on one bad file).
  * INTERNAL drift (a peek/bundle row the disclosure engine itself
    cannot build): that is a code bug, not bad data — the door
    answers a structured 500 carrying the refusal reason (the
    form_wire door precedent), never a silent fallback.

Wire compatibility: the keys below are the served contract exactly —
the DSH tools (lane_bundle_peek / lane_bundle_load / skill_read) and
the parity walls consume these unchanged. Key sets are CLOSED
(extra="forbid", enumerated from the live estate sweep 2026-09-05);
VALUES stay open (params_schema property rows are card vocabulary,
not the wire's).
"""
from __future__ import annotations

import enum
from typing import Literal

# The served-envelope shape: decoded JSON (objects, arrays, scalars).
# Params-schema property VALUES stay open (card vocabulary, not the
# wire's) — open as JSON, never as Anything.
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator


class _Frozen(BaseModel):
    """PYTHON SHAPE LAW rung 2: frozen, no extras, validated at build."""

    model_config = ConfigDict(frozen=True, extra="forbid")


class LaneWireError(ValueError):
    """A wire row the disclosure engine ITSELF could not construct —
    a code bug, not bad source data. The gateway doors answer it as a
    structured 500 (the form_wire door precedent); source-data drift
    skips loudly instead and never raises this."""


# ── card-tools manifests (tool.json rows) ──────────────────────────

class ParamsSchemaRow(_Frozen):
    """The manifest's params schema — JSON-schema-shaped but closed at
    the wire level to the three keys every estate manifest carries
    (type / properties / required; property row VALUES stay open)."""

    type: str = Field(min_length=1)
    properties: dict[str, JsonValue] = Field(default_factory=dict)
    required: list[str] = Field(default_factory=list)


class ToolManifestRow(_Frozen):
    """One tool manifest row (GET /v1/card-tools, bundle tools).

    Two flavors, exactly one routing address each (constructed XOR):
      * card tools (tool.json on disk): kind card-compose, card=<card
        id> — the empirical key set (name/version/kind/card/model/
        stage_title/description/params_schema, plus `hidden` on the
        one card that declares it).
      * flow tools (Flow.tool declarations, 2026-09-06 headless-flow
        record docs/design/flow-single-tool.md): kind flow-tool,
        flow=<flow id> — the SAME keys with the lane address in flow
        instead of card, served in template bundles and the
        lane-scoped card-tools door so a lane session mounts ONE tool.
    A manifest that cannot state its name, version, kind, and exactly
    one lane address refuses AT CONSTRUCTION."""

    name: str = Field(min_length=1)
    version: int = Field(ge=1)
    kind: str = Field(min_length=1)
    card: str = ""
    flow: str = ""
    model: str = ""
    stage_title: str = ""
    description: str = ""
    params_schema: ParamsSchemaRow
    hidden: bool | None = None

    @model_validator(mode="after")
    def _lane_address(self) -> "ToolManifestRow":
        if bool(self.card) == bool(self.flow):
            raise ValueError(
                "a tool manifest names its lane exactly once "
                "(card XOR flow — card=%r flow=%r)"
                % (self.card, self.flow))
        if self.flow and self.kind != "flow-tool":
            raise ValueError(
                "a flow-addressed manifest is kind flow-tool "
                "(got kind=%r flow=%r)" % (self.kind, self.flow))
        if self.card and self.kind == "flow-tool":
            raise ValueError(
                "a card-addressed manifest is never kind flow-tool "
                "(card=%r)" % self.card)
        return self

    def wire(self) -> dict[str, JsonValue]:
        """The served shape — card/flow/hidden ride only when set."""
        out = self.model_dump(exclude_none=True)
        if not self.card:
            out.pop("card", None)
        if not self.flow:
            out.pop("flow", None)
        return out


# ── the peek table (GET /v1/lanes) ─────────────────────────────────

class PeekKind(str, enum.Enum):
    """The closed lane-class vocabulary (peek/lane_bundle speak it;
    mirrors the DSH tool's kind union). 'model' is deliberately NOT
    here — models are card parameters, not callable lanes (operator
    order, 2026-09-04)."""

    ACTION_CARD = "action_card"
    TEMPLATE = "template"


class CardLaneRow(_Frozen):
    """One action-card preview row — cheap by design (no bodies, no
    schemas): counts and titles so the agent can CHOOSE a lane."""

    kind: Literal["action_card"] = "action_card"
    lane: str = Field(min_length=1)
    genre: str | None = None
    title: str = Field(min_length=1)
    description: str = ""
    params: int = Field(default=0, ge=0)
    skills: int = Field(default=0, ge=0)


class FlowLaneRow(_Frozen):
    """One flow-template preview row (multi-step lanes). genre is
    always None on the wire today — flow templates carry no genre."""

    kind: Literal["template"] = "template"
    lane: str = Field(min_length=1)
    genre: str | None = None
    title: str = Field(min_length=1)
    description: str = ""
    steps: int = Field(default=0, ge=0)


class LanesEnvelope(_Frozen):
    """GET /v1/lanes envelope. `error` rides only on the named-refusal
    shape (unknown kind) — never a silent empty table."""

    count: int = Field(ge=0)
    lanes: list[CardLaneRow | FlowLaneRow]
    error: str | None = None

    def wire(self) -> dict[str, JsonValue]:
        out: dict[str, JsonValue] = {"count": self.count,
                               "lanes": [r.model_dump() for r in self.lanes]}
        if self.error is not None:
            out["error"] = self.error
        return out


# ── the skills index (GET /v1/skills, bundle skills) ───────────────

class FlowStepRow(_Frozen):
    """One flow-template step (bundle flow rows): stage id + the
    engine/plugin that owns it — structural, not stringly."""

    id: str = Field(min_length=1)
    type: str = Field(min_length=1)
    plugin: str = Field(min_length=1)


class SkillRow(_Frozen):
    """One skill/bundle row. Heterogeneous by source, closed in keys:
    card docs carry genre+card, model docs carry genre+model, flow
    templates carry steps+step_count — the cross-field invariants
    (card XOR model scoping; steps/step_count travel together and
    agree) refuse AT CONSTRUCTION, so the index cannot drift."""

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    description: str = ""
    scope: str = Field(min_length=1)
    genre: str | None = None
    card: str | None = None
    model: str | None = None
    steps: list[FlowStepRow] | None = None
    step_count: int | None = None

    @model_validator(mode="after")
    def _cross_rows(self) -> "SkillRow":
        if self.card and self.model:
            raise ValueError(
                "a skill row is card-scoped OR model-scoped, never both "
                "(card=%r model=%r)" % (self.card, self.model))
        if (self.steps is None) != (self.step_count is None):
            raise ValueError(
                "steps and step_count travel together (steps=%r "
                "step_count=%r)" % (self.steps, self.step_count))
        if (self.steps is not None and self.step_count is not None
                and self.step_count != len(self.steps)):
            raise ValueError(
                "step_count %d != %d step rows"
                % (self.step_count, len(self.steps)))
        return self

    def wire(self) -> dict[str, JsonValue]:
        """The served shape — only the keys the source row carries."""
        return self.model_dump(exclude_none=True)


class SkillsEnvelope(_Frozen):
    """GET /v1/skills envelope."""

    count: int = Field(ge=0)
    skills: list[SkillRow]

    def wire(self) -> dict[str, JsonValue]:
        return {"count": self.count, "skills": [r.wire() for r in self.skills]}


# ── the bundle (GET /v1/cards/<lane>/bundle) ───────────────────────

class AgentBlock(_Frozen):
    """The lane's primary agent doc, INLINED (the load tier's promise:
    orientation arrives with the bundle, zero extra round-trips)."""

    source: str = Field(min_length=1)
    name: str
    content: str


class BundleRow(_Frozen):
    """GET /v1/cards/<lane>/bundle 200 body. The class cross-invariant
    is THE disclosure contract: an action-card bundle carries its card
    dir + card manifests (never flow-tools) and NO flow rows; a template
    bundle carries the flow row and NO card — plus, when the flow
    declares tool=... (2026-09-06 headless-flow record
    docs/design/flow-single-tool.md), exactly its flow-tool manifest(s)
    (never card manifests). A bundle that mixes classes cannot be
    built."""

    lane: str = Field(min_length=1)
    card: str | None = None
    kind: PeekKind
    agent: AgentBlock | None = None
    tools: list[ToolManifestRow] = Field(default_factory=list)
    flows: list[SkillRow] = Field(default_factory=list)
    skills: list[SkillRow] = Field(default_factory=list)
    read_first: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def _class_rows(self) -> "BundleRow":
        if self.kind is PeekKind.ACTION_CARD:
            if not self.card:
                raise ValueError(
                    "an action_card bundle must name its card dir (card=%r)"
                    % self.card)
            if self.flows:
                raise ValueError(
                    "an action_card bundle carries no flow rows (%d)"
                    % len(self.flows))
        else:
            if self.card is not None:
                raise ValueError(
                    "a template bundle carries no card dir (card=%r)"
                    % self.card)
            for t in self.tools:
                if not t.flow or t.card:
                    raise ValueError(
                        "a template bundle carries only flow-tool "
                        "manifests (got kind=%r card=%r flow=%r)"
                        % (t.kind, t.card, t.flow))
        for t in self.tools:
            if self.kind is PeekKind.ACTION_CARD and t.flow:
                raise ValueError(
                    "an action_card bundle carries no flow-tool "
                    "manifests (flow=%r)" % t.flow)
        return self

    def wire(self) -> dict[str, JsonValue]:
        # hand-assembled so each nested row keeps ITS OWN key discipline
        # (a recursive model_dump would re-include nested Nones)
        return {
            "lane": self.lane,
            "card": self.card,
            "kind": self.kind.value,
            "agent": self.agent.model_dump() if self.agent else None,
            "tools": [t.wire() for t in self.tools],
            "flows": [f.wire() for f in self.flows],
            "skills": [s.wire() for s in self.skills],
            "read_first": list(self.read_first),
        }


# ── skill bodies (GET /v1/skills/<id>) ─────────────────────────────

class SkillDocRow(_Frozen):
    """One skill body row — the doc plus its content, the shape
    skill_read serves."""

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    description: str = ""
    scope: str = Field(min_length=1)
    content: str


# ── the loud part ──────────────────────────────────────────────────

def refusal_reason(error: ValidationError) -> str:
    """One-line, field-named reason for a lane-wire contract refusal —
    the LOUD part of document-and-continue (RESILIENCE LAW)."""
    parts = []
    for e in error.errors():
        loc = ".".join(str(x) for x in e["loc"]) or "<root>"
        parts.append(f"{loc}: {e['msg']}")
    return "; ".join(parts)

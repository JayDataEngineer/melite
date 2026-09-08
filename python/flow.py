"""flow.py — THE flow declaration layer (PYTHON SHAPE LAW, 2026-09-04).

Flows are what flows/ was: authored multi-stage graphs for the
queue (design record: docs/queue/flows.md, typed-edges:
docs/queue/flow-typed-edges.md). Declarations are PYTHON MODULES —
one flow per module, the module IS the name (flows/<id>/flow.py
exposing FLOW = Flow(...)). Validation happens AT CONSTRUCTION:
an unbuildable flow (dup ids, a wire to a later or missing stage,
an engine no plugin declares, a wrong-Kind edge) cannot be
declared — the refusal is the import.

Layers (flow_graph.py stays THE graph contract, unchanged):
    flows/<id>/flow.py   authored declaration (this schema)
    Flow.to_graph()      -> FlowGraph / NodeRow (the executor's food)
    resolve_inputs()     runtime __initial__/<node>.<out> wiring (gateway)

Edges are structural + TYPED (rung 5: no stringly handshakes):
    FromInitial("prompt")     -> "__initial__.prompt"
    FromStage("forge","glb")  -> "forge.glb"
    Kind                      -> the closed edge-type vocabulary
The `$key` substitution channel is the ENGINE ABI (params.workflow /
inject deep-walk, pinned by the compose goldens) and stays verbatim
inside params.
"""

from __future__ import annotations

import importlib.util
import re
import sys
from enum import Enum
from pathlib import Path
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    import flow_graph

# The request-body shape: decoded JSON (objects, arrays, scalars).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

from pydantic import (BaseModel, ConfigDict, Field, ValidationError,
                      model_validator)

REPO = Path(__file__).resolve().parents[1]
FLOWS_ROOT = REPO / "flows"

# mirrors gateway IDENT_RE (kept local: flow.py never imports the
# gateway — the gateway imports flow.py)
FLOW_ID_RE = re.compile(r"^[a-z_][a-z0-9_-]*$")


class FlowError(ValueError):
    """A flow that cannot be declared or loaded. Subclasses ValueError
    so pydantic validators and the door both surface it LOUDLY."""


class Kind(str, Enum):
    """The closed edge-type vocabulary (PYTHON SHAPE LAW rung 3).

    Edges carry a Kind: what flows on the wire. The Flow validator
    refuses an edge whose upstream stage's output Kind does not
    match the receiving stage's expected Kind. The refusal names
    both kinds and the AI iterates without a single GPU cycle.

    Adding a kind is a deliberate change to this enum (and to the
    engine `default_output` row for any new engine). A typo at any
    flow site is a construction refusal, not a silent fallback.
    """
    text  = "text"
    image = "image"
    video = "video"
    audio = "audio"
    mesh  = "mesh"     # glb / obj / fbx / usd
    num   = "num"      # a single number / vector (seed, cfg, latents)
    lora  = "lora"     # a lora weight set
    seg   = "seg"      # mask / seg map


class Edge(BaseModel):
    """One stage input wire. Never constructed directly — the rows
    below are the vocabulary (closed, like Quant/DestRoot)."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    def ref(self) -> str:
        raise NotImplementedError


class FromInitial(Edge):
    """Wires a request key into this stage: __initial__.<key>."""
    key: str = Field(min_length=1)

    def ref(self) -> str:
        return "__initial__.%s" % self.key


class SkipWhen(str, Enum):
    """The closed branch-condition vocabulary (PYTHON SHAPE LAW rung 3).

    present = prune this stage when the request carries its initial;
    absent  = prune this stage when the request does NOT carry it.
    A typo is a construction refusal, not a silently-live stage."""
    present = "present"
    absent = "absent"


class StageSkip(BaseModel):
    """One stage's branch condition — the BRANCH system (2026-09-06,
    design record docs/design/character-pipeline.md §2).

    StageSkip(initial="starter_image", when=SkipWhen.present) means:
    when the request carries `starter_image`, this stage's outputs are
    assumed to come from that request key instead — the stage is
    pruned at build time (start/validate doors, before registration)
    and any remaining FromStage edge into it rewrites to
    FromInitial("starter_image") (present-by-construction: the prune
    only fires when the key is there). A remaining edge into a stage
    pruned any other way is a loud FlowError, never a dangling wire."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    initial: str = Field(min_length=1)
    when: SkipWhen


class FromStage(Edge):
    """Wires an EARLIER stage's output into this stage: <stage>.<output>.
    The Kind is INFERRED at construction from the upstream stage's
    declared `outputs[output]`; the AI never types it."""
    stage: str = Field(min_length=1)
    output: str = Field(min_length=1)

    def ref(self) -> str:
        return "%s.%s" % (self.stage, self.output)


class Stage(BaseModel):
    """One flow stage — the authored row. `engine` must be a type the
    plugin registry declares (validated on the Flow, where the whole
    graph is known); `params` is the engine-owned surface, verbatim;
    `expected`/`outputs` carry the edge-Kind contract.

    The CARD-STAGE LATTICE (2026-09-05, design record
    docs/queue/card-stage-typing.md): when `card=` is set, the stage
    opts in to a typed body gate (`python/stage_params.py` validates
    `params` against the card's schema at construction) AND a typed
    I/O contract (the card's `kind_outputs` fills `outputs` when
    the stage omits them; the card's `kind_inputs` is consulted
    when the stage omits `expected`).

    Engine-only stages (card="") are unchanged: `params` is the
    engine's verbatim surface, `outputs` defaults to the engine's
    DEFAULT_OUTPUT, and the engine's own Phase-1 validation owns
    the body shape.
    """
    model_config = ConfigDict(frozen=True, extra="forbid")

    id: str = Field(min_length=1)
    engine: str = Field(min_length=1)
    description: str = ""
    params: dict[str, JsonValue] = Field(default_factory=dict)
    inputs: dict[str, Edge] = Field(default_factory=dict)
    # what the stage PRODUCES, named per output channel. Defaults to
    # {"default": <engine.default_output>}; if the engine declares no
    # default_output the Flow validator refuses loudly (see _kinds_ok).
    # When `card=` is set and the stage omits `outputs`, the registry's
    # `kind_outputs` fills the channels (see _resolve_stage_outputs).
    outputs: dict[str, Kind] = Field(default_factory=dict)
    # what each named input EXPECTS. The Flow validator refuses any
    # input that is wired but untyped, or typed but unwired. When
    # `card=` is set and the stage omits `expected`, the registry's
    # `kind_inputs` is consulted (the AI's first typo class
    # — forgetting `expected=` — has a typed fallback).
    expected: dict[str, Kind] = Field(default_factory=dict)
    # ── the branch opt-in (§2) ─────────────────────────────────────
    # skip_when=None is today's behavior (the stage always runs).
    # Setting it prunes the stage at build time when its condition
    # fires — see StageSkip + Flow.pruned_for.
    skip_when: StageSkip | None = None
    # ── the lattice opt-in (Path C) ───────────────────────────────
    # card="" is the engine-only default. Setting card="<id>" routes
    # the stage through the ParamSchemaRegistry gate (python/stage_params.py):
    # the body is validated against the card's schema_class, and the
    # I/O contract is read from the same row. card_io is the EXPLICIT
    # output override — a flow author who needs the card to declare
    # a different output channel than the registry's default (rare;
    # the same pattern as Stage.outputs) can stamp it here.
    card: str = ""
    card_io: dict[str, Kind] = Field(default_factory=dict)
    # ── R3.3 retry rows (2026-09-06) — policy as data ────────────
    # retries: extra attempts after a failed attempt (0..5, the
    # runner re-executes the stage and ledgers every retry).
    # timeout_s: the RUNNER's stage budget (asyncio.wait_for) — NOT
    # params.timeout_s (the engine's own door). Both optional;
    # omission is today's fail-fast behavior.
    retries: int = Field(default=0, ge=0, le=5)
    timeout_s: float | None = Field(default=None)

    @model_validator(mode="after")
    def _id_legal(self) -> "Stage":
        if not FLOW_ID_RE.match(self.id):
            raise FlowError("stage id %r is not a legal identifier" % self.id)
        return self

    @classmethod
    def from_flow(cls, flow_id: str, stage_id: str, *, id: str = "",
                  inputs: dict[str, Edge] | None = None) -> "Stage":
        """Reuse a donor flow's stage row (the character pipeline's
        IMPORT — docs/design/character-pipeline.md §1: estimate/rig/
        coat/seat ride the SAME row object their home flow validated,
        so a home-flow edit propagates at import — zero drift by
        construction, not by copying. Only `id` (pipeline readability)
        and per-name `inputs` (rewiring donor FromInitials onto this
        flow's FromStage/FromInitial edges) may change; every other
        field — engine, params, expected, outputs, description — rides
        verbatim. Rewiring an input name the donor does not declare
        refuses loudly (a typo must not silently add an unwired
        input — the Flow validator would refuse it anyway, but HERE
        names the donor). The new Flow's construction re-runs every
        wire/kind check over the rewired edges."""
        donor = load_flow(flow_id)
        orig: Stage | None = None
        for st in donor.stages:
            if st.id == stage_id:
                orig = st
                break
        if orig is None:
            raise FlowError(
                "from_flow(%r, %r): the donor flow has no such stage "
                "(has: %s)" % (
                    flow_id, stage_id, [s.id for s in donor.stages]))
        merged = dict(orig.inputs)
        if inputs:
            unknown = set(inputs) - set(orig.inputs)
            if unknown:
                raise FlowError(
                    "from_flow(%r, %r): rewires unknown input(s) %s "
                    "(donor declares: %s)" % (
                        flow_id, stage_id, sorted(unknown),
                        sorted(orig.inputs)))
            merged.update(inputs)
        return orig.model_copy(update={"id": id or orig.id,
                                        "inputs": merged})


# STAGE-EXTRAS key set (2026-09-05): flow_from_body pulls stage fields
# BY NAME, which bypasses Stage's extra=forbid — so this mirror set
# hand-enforces it (a fossil field silently dropping is the incident
# class). It MUST equal set(Stage.model_fields) exactly — the
# hard-gates wall pins the equality, so adding a Stage field without
# updating this set (or vice versa) fails loudly, never drifts.
STAGE_KEYS = frozenset({
    "id", "engine", "description", "params",
    "inputs", "outputs", "expected",
    "card", "card_io",     # CARD-STAGE LATTICE
    "skip_when",           # BRANCH SYSTEM
    # 2026-09-06 gap-fix (caught by the mirror wall): the runner's
    # retries/timeout_s fields landed on Stage without this set —
    # the exact drift class STAGE_KEYS exists to refuse.
    "retries", "timeout_s",
})


# The headless single-tool option (2026-09-06, design record
# docs/design/flow-single-tool.md — the comfy-mcp shape: a template +
# slots surface so ONE tool call runs the flow).
#
# An authored flow may declare tool=FlowTool(...): a constrained,
# mountable headless surface (e.g. image-upscale with image_model in
# {krea-2, z-image}). Tool params are request-body keys; overlays stamp
# validated values into stage params at the door (BEFORE to_graph via
# Flow.compile), while $key slots and initial_pool carry the rest at
# runtime — no new door, no executor change. Opt-in: tool=None keeps
# the flow exactly as today.

type ToolScalar = str | int | float | bool


class ToolParamType(str, Enum):
    """The closed headless-knob vocabulary (rung 3: a typo is a
    construction refusal, not a runtime route mismatch)."""
    string = "string"
    integer = "integer"
    number = "number"
    boolean = "boolean"


def _scalar_matches(ptype: ToolParamType, value: ToolScalar) -> bool:
    """Authored-literal coherence: bool is NOT an int (the isinstance
    bleed would let True ride an integer enum). Strict at construction;
    the door is laxer (numeric strings coerce — the lax-wire
    precedent)."""
    if isinstance(value, bool):
        return ptype is ToolParamType.boolean
    if isinstance(value, int):
        return ptype in (ToolParamType.integer, ToolParamType.number)
    if isinstance(value, float):
        return ptype is ToolParamType.number
    return ptype is ToolParamType.string


def _coerce_tool_scalar(
        ptype: ToolParamType, value: JsonValue) -> ToolScalar | None:
    """Door-time coercion: the validated scalar, or None when the wire
    value is not this type. Numeric strings coerce (the editor sends
    wire ints as strings — lax-wire precedent); booleans never coerce
    to or from numbers."""
    if isinstance(value, bool):
        return value if ptype is ToolParamType.boolean else None
    if isinstance(value, int):
        if ptype in (ToolParamType.integer, ToolParamType.number):
            return value
        return None
    if isinstance(value, float):
        if ptype is ToolParamType.number:
            return value
        if ptype is ToolParamType.integer and value.is_integer():
            return int(value)
        return None
    if isinstance(value, str):
        if ptype is ToolParamType.string:
            return value
        s = value.strip()
        try:
            if ptype is ToolParamType.integer:
                if s.lstrip("-").isdigit() and s not in ("", "-"):
                    return int(s)
                return None
            if ptype is ToolParamType.number:
                return float(s)
        except ValueError:
            return None
        return None
    return None


class FlowToolProperty(BaseModel):
    """One headless knob: type + human description + optional closed
    value set + optional default + optional numeric bounds."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    ptype: ToolParamType
    description: str = ""
    enum: tuple[ToolScalar, ...] = ()
    default: ToolScalar | None = None
    minimum: float | None = None
    maximum: float | None = None

    @model_validator(mode="after")
    def _coherent(self) -> "FlowToolProperty":
        for v in self.enum:
            if not _scalar_matches(self.ptype, v):
                raise FlowError(
                    "tool property enum value %r is not a %s"
                    % (v, self.ptype.value))
        if self.default is not None:
            if not _scalar_matches(self.ptype, self.default):
                raise FlowError(
                    "tool property default %r is not a %s"
                    % (self.default, self.ptype.value))
            if self.enum and self.default not in self.enum:
                raise FlowError(
                    "tool property default %r is not in its enum %s"
                    % (self.default, list(self.enum)))
        if self.minimum is not None or self.maximum is not None:
            if self.ptype not in (
                    ToolParamType.integer, ToolParamType.number):
                raise FlowError(
                    "tool property bounds need a numeric type "
                    "(got %s)" % self.ptype.value)
            if (self.minimum is not None and self.maximum is not None
                    and self.minimum > self.maximum):
                raise FlowError(
                    "tool property minimum %r exceeds maximum %r"
                    % (self.minimum, self.maximum))
        return self


class FlowToolOverlay(BaseModel):
    """The structural bind (rung 5: tuples, not stringly inject keys):
    stamp the validated param value into the stage params at path
    (e.g. ("workflow",) selects a whole baked variant graph). With
    choices, the enum value maps to a baked literal instead of
    stamping raw (e.g. "krea-2" selects the krea+upscale graph)."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    param: str = Field(min_length=1)
    stage: str = Field(min_length=1)
    path: tuple[str, ...] = Field(min_length=1)
    choices: dict[ToolScalar, JsonValue] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _path_shaped(self) -> "FlowToolOverlay":
        for part in self.path:
            if not part:
                raise FlowError(
                    "tool overlay path carries an empty key "
                    "(param %r)" % self.param)
        return self


class FlowTool(BaseModel):
    """The headless surface: mountable name + description + closed
    knob table + required set + overlay binds. Emitted to the agent as
    ONE tool manifest (kind flow-tool) in the template bundle."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    name: str = Field(min_length=1)
    description: str = Field(min_length=1)
    properties: dict[str, FlowToolProperty] = Field(min_length=1)
    required: tuple[str, ...] = ()
    overlays: tuple[FlowToolOverlay, ...] = ()
    version: int = Field(default=1, ge=1)

    @model_validator(mode="after")
    def _tool_coherent(self) -> "FlowTool":
        if not FLOW_ID_RE.match(self.name):
            raise FlowError(
                "tool name %r is not a legal identifier" % self.name)
        for key in self.required:
            if key not in self.properties:
                raise FlowError(
                    "tool required param %r is not in properties (%s)"
                    % (key, sorted(self.properties)))
            if self.properties[key].default is not None:
                raise FlowError(
                    "tool required param %r carries a default — required "
                    "means the caller passes it (a default would mask "
                    "the absence at the defaults-merge; leave it "
                    "optional instead)" % key)
        for ov in self.overlays:
            prop = self.properties.get(ov.param)
            if prop is None:
                raise FlowError(
                    "tool overlay param %r is not in properties (%s)"
                    % (ov.param, sorted(self.properties)))
            if ov.choices:
                if not prop.enum:
                    raise FlowError(
                        "tool overlay param %r maps choices without an "
                        "enum - the keys would be unvalidated" % ov.param)
                if set(ov.choices) != set(prop.enum):
                    raise FlowError(
                        "tool overlay param %r choice keys %s != enum %s"
                        % (ov.param, sorted(
                            ov.choices, key=repr),
                            list(prop.enum)))
        return self


class Flow(BaseModel):
    """An authored flow: a named chain of stages with structural
    input/output wiring AND typed edges. Declared ONCE per module
    (FLOW = Flow(...)) in flows/<id>/flow.py; load_flow() is the only
    door the gateway uses. Construction validates: unique ids, wires
    to EARLIER stages only, every engine declared by a plugin, and
    every wired edge's Kind matches the receiving stage's expected
    Kind (the AI iterates without a single GPU cycle)."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    id: str = Field(min_length=1)
    description: str = ""
    stages: tuple[Stage, ...] = Field(min_length=1)
    # INITIAL-INPUT VALIDATORS (operator order, 2026-09-06: "Where is
    # MY GOD DAMNED COMPILE TIME VALIDATION!") — key → pydantic model.
    # The gateway's start/validate doors model_validate every PRESENT
    # body key against its model BEFORE any run registers: a bad
    # dialect string 4xxes with a field-clean message at the door,
    # never as a node traceback after a GPU claim. The flow DECLARES
    # the models (the dialect belongs to its domain — PLUGIN
    # ARCHITECTURE LAW); the core only invokes them.
    initial_validators: dict[str, type[BaseModel]] = Field(default_factory=dict)
    # THE HEADLESS SINGLE-TOOL OPTION (2026-09-06, design record
    # docs/design/flow-single-tool.md): tool=None is today behavior,
    # untouched. Setting tool=FlowTool(...) mounts ONE constrained
    # headless surface for the flow (ONE tool manifest in the template
    # bundle, validated + overlaid at the doors via Flow.compile).
    # skill_refs merges existing skill rows into the bundle
    # (consolidated-skills mode); flows/<id>/SKILL.md, when present,
    # overrides the flow skill body (mega-skill mode).
    tool: FlowTool | None = None
    skill_refs: tuple[str, ...] = ()

    @model_validator(mode="after")
    def _validators_are_models(self) -> "Flow":
        for key, model in self.initial_validators.items():
            if not (isinstance(model, type) and issubclass(model, BaseModel)):
                raise FlowError(
                    "initial_validators[%r] must be a pydantic BaseModel "
                    "subclass, got %r" % (key, model))
        return self

    def validate_initial(self, body: dict[str, JsonValue]) -> None:
        """The compile-time initial door — called by the gateway's
        start/validate handlers with the REQUEST body. Every key that
        has a declared validator and is PRESENT in the body validates
        NOW; a refusal is a FlowError (clean text, 4xx upstream).
        Absent keys are the stage-runtime's own concern (a flow may
        default them); this door never invents values."""
        from pydantic import ValidationError as _PydanticRefusal
        for key, model in sorted(self.initial_validators.items()):
            if key not in body or body[key] is None:
                continue
            try:
                model.model_validate(body[key])
            except _PydanticRefusal as e:
                raise FlowError(
                    "initial input %r: %s" % (key, e.errors()[0]["msg"]
                                              if e.errors() else str(e)))

    @model_validator(mode="after")
    def _tool_refs_shaped(self) -> "Flow":
        for ref in self.skill_refs:
            if not isinstance(ref, str) or ":" not in ref:
                raise FlowError(
                    "flow %r skill_ref %r is not shaped <scope>:<id>"
                    % (self.id, ref))
            scope = ref.split(":", 1)[0]
            if scope not in ("card", "model", "guide", "flow"):
                raise FlowError(
                    "flow %r skill_ref %r scope %r is not one of "
                    "card | model | guide | flow" % (self.id, ref, scope))
        if self.tool is not None:
            stages = {st.id for st in self.stages}
            for ov in self.tool.overlays:
                if ov.stage not in stages:
                    raise FlowError(
                        "flow %r tool overlay stage %r is not a stage (%s)"
                        % (self.id, ov.stage, sorted(stages)))
            bound = {ov.param for ov in self.tool.overlays}
            consumed: set[str] = set()
            for st in self.stages:
                for edge in st.inputs.values():
                    if isinstance(edge, FromInitial):
                        consumed.add(edge.key)
            for key in self.tool.required:
                if key not in bound and key not in consumed:
                    raise FlowError(
                        "flow %r tool required param %r reaches no "
                        "stage (overlay it or consume it via FromInitial)"
                        % (self.id, key))
        return self

    def validate_tool_params(self, body: dict[str, JsonValue]) -> None:
        if self.tool is None:
            return
        for name in sorted(self.tool.properties):
            prop = self.tool.properties[name]
            raw = body.get(name, None)
            if raw is None:
                if name in self.tool.required:
                    raise FlowError(
                        "flow %r headless param %r is required"
                        % (self.id, name))
                continue
            value = _coerce_tool_scalar(prop.ptype, raw)
            if value is None:
                raise FlowError(
                    "flow %r headless param %r: %r is not a %s"
                    % (self.id, name, raw, prop.ptype.value))
            if prop.enum and value not in prop.enum:
                raise FlowError(
                    "flow %r headless param %r: %r is not one of %s"
                    % (self.id, name, raw, list(prop.enum)))
            if isinstance(value, (int, float)) and not isinstance(
                    value, bool):
                if prop.minimum is not None and value < prop.minimum:
                    raise FlowError(
                        "flow %r headless param %r: %r is below minimum %s"
                        % (self.id, name, raw, prop.minimum))
                if prop.maximum is not None and value > prop.maximum:
                    raise FlowError(
                        "flow %r headless param %r: %r is above maximum %s"
                        % (self.id, name, raw, prop.maximum))

    def apply_tool_defaults(
            self, body: dict[str, JsonValue]) -> dict[str, JsonValue]:
        if self.tool is None:
            return body
        out = dict(body)
        for name, prop in self.tool.properties.items():
            if (name not in out or out[name] is None) \
                    and prop.default is not None:
                out[name] = prop.default
        return out

    def with_tool_params(self, body: dict[str, JsonValue]) -> "Flow":
        if self.tool is None or not self.tool.overlays:
            return self
        import copy as _copy
        stages = {st.id: st for st in self.stages}
        stamped: dict[str, dict[str, JsonValue]] = {}
        # Broad binds first (stable): a whole-workflow choice replace
        # would wipe a narrower stamp applied before it, so overlays
        # apply shortest-path-first whatever the declaration order.
        binds = sorted(self.tool.overlays, key=lambda o: len(o.path))
        for ov in binds:
            st = stages.get(ov.stage)
            if st is None:
                raise FlowError(
                    "flow %r tool overlay stage %r is gone "
                    "(pruned branch takes no overlays; param %r)"
                    % (self.id, ov.stage, ov.param))
            # ROW 4 (2026-09-07): a card= stage's params ARE the card
            # doc — an overlay path speaking the workflow template
            # vocabulary would silently stamp a doc key the card's
            # schema forbids (the compose refusal names it only at
            # run time). Refuse at the lever's own door.
            if st.card and ov.path[0] in ("workflow", "workflow_file",
                                          "inject"):
                raise FlowError(
                    "flow %r tool overlay param %r targets stage %r "
                    "path %r — a card= stage's overlay path speaks "
                    "the CARD DOC (e.g. ('model',)), never the "
                    "workflow template vocabulary"
                    % (self.id, ov.param, ov.stage, ov.path[0]))
            prop = self.tool.properties[ov.param]
            raw = body.get(ov.param, None)
            if raw is None:
                raw = prop.default
            if raw is None:
                raise FlowError(
                    "flow %r tool overlay param %r is not provided "
                    "and has no default" % (self.id, ov.param))
            value = _coerce_tool_scalar(prop.ptype, raw)
            if value is None:
                raise FlowError(
                    "flow %r headless param %r: %r is not a %s"
                    % (self.id, ov.param, raw, prop.ptype.value))
            literal: JsonValue = value
            if ov.choices:
                if value not in ov.choices:
                    raise FlowError(
                        "flow %r headless param %r: %r is not one of %s"
                        % (self.id, ov.param, raw,
                           list(prop.enum)))
                literal = _copy.deepcopy(ov.choices[value])
            params = stamped.get(ov.stage)
            if params is None:
                params = _copy.deepcopy(dict(st.params))
                stamped[ov.stage] = params
            cur = params
            for part in ov.path[:-1]:
                nxt = cur.get(part)
                if nxt is None:
                    nxt = {}
                    cur[part] = nxt
                if not isinstance(nxt, dict):
                    raise FlowError(
                        "flow %r tool overlay path %s hits a scalar at %r "
                        "(stage %r)" % (self.id, list(ov.path),
                                         part, ov.stage))
                cur = nxt
            cur[ov.path[-1]] = literal
        kept = tuple(
            st.model_copy(update={"params": stamped[st.id]})
            if st.id in stamped else st
            for st in self.stages)
        return self.model_copy(update={"stages": kept})

    def pruned_for(self, body: dict[str, JsonValue]
                 ) -> tuple["Flow", tuple[str, ...]]:
        """The BRANCH build step (2026-09-06, §2): evaluate every
        stage\u2019s skip_when against the REQUEST body and prune.

        Returns (flow-to-run, pruned-stage-ids in declaration order).
        A flow with no skip_when anywhere returns (self, ()) —
        today\u2019s behavior, untouched.

        The merge rule (no new edge kind): a remaining FromStage(s, o)
        into a stage pruned by a PRESENT trigger rewrites to
        FromInitial(<the trigger key>) — present-by-construction,
        the prune only fires when the request carries it. A remaining
        edge into a stage pruned any other way (absent-trigger, or a
        stage that never declared a branch) is a FlowError naming
        stage + input + producer — never a dangling wire, never a
        post-claim surprise.

        The pruned flow is RECONSTRUCTED (Flow(...)), so every
        construction validator re-runs over the kept stages; a fully
        pruned flow refuses loudly instead of registering an empty run.
        """
        if not any(st.skip_when is not None for st in self.stages):
            return self, ()
        pruned: dict[str, StageSkip] = {}
        kept: list[Stage] = []
        for st in self.stages:
            cond = st.skip_when
            if cond is None:
                kept.append(st)
                continue
            present = body.get(cond.initial) is not None
            fire = present if cond.when is SkipWhen.present else not present
            if fire:
                pruned[st.id] = cond
            else:
                kept.append(st)
        if not kept:
            raise FlowError(
                "flow %r: the branch pruned every stage (fired: %s) — "
                "a run with no stages never registers"
                % (self.id, sorted(pruned)))
        rewrote = 0
        merged: list[Stage] = []
        for st in kept:
            if not any(isinstance(e, FromStage) and e.stage in pruned
                       for e in st.inputs.values()):
                merged.append(st)
                continue
            new_inputs = dict(st.inputs)
            for name, edge in st.inputs.items():
                if not (isinstance(edge, FromStage)
                        and edge.stage in pruned):
                    continue
                cond = pruned[edge.stage]
                if cond.when is not SkipWhen.present:
                    raise FlowError(
                        "flow %r stage %r input %r wires FromStage(%r) "
                        "to pruned stage %r (branch %r fired) — no "
                        "request key to merge (absent-trigger prunes "
                        "carry nothing)"
                        % (self.id, st.id, name, edge.ref(), edge.stage,
                           cond.initial))
                new_inputs[name] = FromInitial(key=cond.initial)
                rewrote += 1
            merged.append(st.model_copy(update={"inputs": new_inputs}))
        _ = rewrote  # structural count (kept for the audit trail)
        return (Flow(id=self.id, description=self.description,
                     stages=tuple(merged),
                     initial_validators=dict(self.initial_validators),
                     tool=self.tool, skill_refs=tuple(self.skill_refs)),
                tuple(pruned))

    def compile(self, body: dict[str, JsonValue]
                 ) -> tuple["flow_graph.FlowGraph", tuple[str, ...]]:
        """The start/validate build chain in ONE call: the compile-time
        initial door (validate_initial), then the branch prune
        (pruned_for), then to_graph on the kept stages with the pruned
        ids stamped on the graph\u2019s `skipped` record.

        Every refusal is a FlowError (4xx upstream) BEFORE any run
        registers, any GPU claims, any sidecar. Flows without branches
        or tools compile exactly as before (skipped == ()).

        Headless-tool flows (tool is not None) run two extra links in
        the same chain: validate_tool_params after the initial door,
        and with_tool_params on the PRUNED flow before to_graph (an
        overlay onto a pruned-away stage refuses loudly instead of
        stamping a stage that never runs)."""
        self.validate_initial(body)
        self.validate_tool_params(body)
        pruned_flow, skipped = self.pruned_for(body)
        graph = pruned_flow.with_tool_params(body).to_graph()
        # $CHANNEL RESOLUTION DOOR (2026-09-06, the 11-attempt proof's
        # biggest bill): every $name a stage's params reference must
        # resolve against the pool the executor publishes for it —
        # refusing HERE, at both doors, before a queue slot or a GPU
        # claim. Three queued runs once died discovering what the graph
        # already knew ("$photo"/"$seed" rode workflows verbatim).
        bad = graph.unresolved_channels()
        if bad:
            head = "; ".join(
                "stage %r references $%s (available: %s)"
                % (nid, tok, ", ".join(pool) or "nothing")
                for nid, tok, pool in bad[:3])
            raise FlowError(
                "unresolved $channel(s): %s%s"
                % (head, " … +%d more" % (len(bad) - 3) if len(bad) > 3 else ""))
        return graph.model_copy(update={"skipped": tuple(skipped)}), skipped
    @model_validator(mode="after")
    def _wires_resolve(self) -> "Flow":
        if not FLOW_ID_RE.match(self.id):
            raise FlowError("flow id %r is not a legal identifier" % self.id)
        seen: set[str] = set()
        for st in self.stages:
            if st.id in seen:
                raise FlowError("duplicate stage id %r" % st.id)
            seen.add(st.id)
        done: set[str] = set()
        for st in self.stages:
            for name, edge in st.inputs.items():
                if isinstance(edge, FromStage):
                    if edge.stage not in done:
                        raise FlowError(
                            "stage %r input %r wires to %r — not an "
                            "EARLIER stage (known earlier: %s)"
                            % (st.id, name, edge.ref(),
                               sorted(done) or "none"))
                if edge.ref() == "__initial__.":
                    raise FlowError("empty initial key on stage %r" % st.id)
            done.add(st.id)
        return self

    @model_validator(mode="after")
    def _card_params_gate(self) -> "Flow":
        """The CARD-STAGE LATTICE body gate (Path C,
        docs/queue/card-stage-typing.md). Every stage that opts in
        with `card=` has its `params` validated against the card's
        schema class. Runs BEFORE _validate_kinds so a typo'd knob
        refuses the `Flow(...)` line — same lever as the
        flow-typed-edges kind check.

        Engine-only stages (card="") skip the gate (the engine's
        own Phase-1 validation owns the body). The validator is a
        separate pass so the lattice has a distinct refusal channel
        (the AI iterates on a body-shape refusal without confusing
        it with a kind-mismatch refusal)."""
        # Lazy import: python/stage_params imports python/flow's Kind lazily
        # to avoid the cycle; this validator runs at construction
        # time, after both modules are fully loaded.
        import stage_params
        for st in self.stages:
            if not st.card:
                continue
            try:
                stage_params.validate_stage_params(
                    st.card, st.params,
                    where="flow %r stage %r" % (self.id, st.id))
            except stage_params.StageParamError as e:
                # a pydantic-shaped refusal from a pydantic-shaped
                # gate — translate the ValueError so the door
                # speaks one error language
                raise FlowError(str(e)) from e
        return self

    def _kinds_ok(self, engine_defaults: dict[str, Optional[Kind]]) -> "Flow":
        """Type-check the graph (flow-typed-edges.md). Three refusal
        classes:
        1. inputs/expected symmetry (a key in one and not the other)
        2. a FromStage output name not declared by the upstream stage
        3. an upstream output Kind does not match the receiving
           input's expected Kind — the AI's main failure mode
        Plus a fourth, deferred: a stage that omits `outputs` and
        whose engine has no `default_output` — the engine default
        comes from `engine_defaults`; stages without either are
        refused at validate_engines() (where the bus has loaded
        the engine module and the default is known).
        Every refusal names flow + stage + input/output + the two
        Kinds (or the missing one), so the AI iterates without a
        single GPU cycle.

        CARD-STAGE LATTICE: when a stage has `card=`, the registry's
        `kind_outputs` is consulted (precedence: Stage.outputs >
        Stage.card_io > registry.kind_outputs > engine DEFAULT_OUTPUT).
        Same precedence as the existing engine-default resolution —
        a stage that names its outputs explicitly wins.
        """
        # Lazy import: cycle (python/stage_params imports python/flow's
        # Kind via TYPE_CHECKING + lazy). At construction time both
        # modules are loaded; the import is cheap.
        import stage_params
        outputs_by_stage: dict[str, dict[str, Kind]] = {}
        for st in self.stages:
            # 1) inputs/expected symmetry. CARD-STAGE LATTICE: when
            # `card=` is set and the stage omits `expected`, fill the
            # wired-but-untyped keys from the card's kind_inputs. The
            # author can still override per-key explicitly — the
            # lattice does not stamp over explicit rows (the same
            # precedence ladder as outputs below).
            effective_expected: dict[str, Kind] = dict(st.expected)
            if st.card and st.inputs:
                card_in = stage_params.card_inputs(st.card)
                for name in st.inputs:
                    if name in effective_expected:
                        continue
                    if name in card_in:
                        effective_expected[name] = Kind(card_in[name])
            if set(st.inputs.keys()) != set(effective_expected.keys()):
                only_input = set(st.inputs) - set(effective_expected)
                only_expected = set(effective_expected) - set(st.inputs)
                bits = []
                if only_input:
                    bits.append("wired but untyped: %s" % sorted(only_input))
                if only_expected:
                    bits.append("typed but unwired: %s" % sorted(only_expected))
                raise FlowError(
                    "flow %r stage %r: inputs/expected mismatch (%s) — "
                    "every input needs an expected Kind, every expected "
                    "Kind needs an input"
                    % (self.id, st.id, "; ".join(bits)))
            # resolve this stage's effective outputs — precedence
            # ladder (Path C, design record):
            #   1. Stage.outputs    (author explicit)
            #   2. Stage.card_io    (author explicit override)
            #   3. registry.kind_outputs   (card contract)
            #   4. engine DEFAULT_OUTPUT   (engine contract)
            resolved: dict[str, Kind] = {}
            if st.outputs:
                resolved.update(st.outputs)
            if st.card_io:
                resolved.update(st.card_io)
            if not resolved and st.card:
                card_outs = stage_params.card_outputs(st.card)
                if card_outs:
                    resolved.update(
                        {k: Kind(v) for k, v in card_outs.items()})
            if resolved:
                outputs_by_stage[st.id] = resolved
            elif st.engine in engine_defaults:
                # bus loaded the engine — its default is authoritative
                default = engine_defaults[st.engine]
                if default is None:
                    raise FlowError(
                        "flow %r stage %r: engine %r declares no "
                        "default_output and stage declares no outputs — "
                        "add outputs={'default': <Kind>} on the stage, "
                        "or set DEFAULT_OUTPUT on the engine"
                        % (self.id, st.id, st.engine))
                outputs_by_stage[st.id] = {"default": default}
            # else: defer; the validate_engines() pass will fill it in
            # 2 + 3) every FromStage edge: upstream kind vs receiving.
            # The kind check runs REGARDLESS of whether this stage
            # resolved outputs — the upstream stage's outputs are
            # what matter and those are looked up directly.
            for name, edge in st.inputs.items():
                if not isinstance(edge, FromStage):
                    continue
                upstream = outputs_by_stage.get(edge.stage)
                if upstream is None:
                    # upstream is a LATER stage (not yet processed)
                    # OR upstream has no outputs and its engine
                    # default is deferred — either way we cannot
                    # check yet; validate_engines() (run AFTER the
                    # full pass) will catch it.
                    continue
                if edge.output not in upstream:
                    raise FlowError(
                        "flow %r stage %r input %r: stage %r has no "
                        "output named %r (declared outputs: %s)"
                        % (self.id, st.id, name, edge.stage,
                           edge.output, sorted(upstream)))
                upstream_kind = upstream[edge.output]
                receiving_kind = effective_expected[name]
                if upstream_kind is not receiving_kind:
                    raise FlowError(
                        "flow %r stage %r input %r: expected %s, "
                        "got %s from stage %r output %r — must be %s"
                        % (self.id, st.id, name,
                           receiving_kind.value, upstream_kind.value,
                           edge.stage, edge.output,
                           receiving_kind.value))
        return self

    @model_validator(mode="after")
    def _validate_kinds(self) -> "Flow":
        # At pure construction time we have no engine defaults
        # (the plugin bus hasn't loaded). Defer all engine-default
        # resolutions to validate_engines(). Here we still catch
        # every refusal class that DOES NOT need engine defaults:
        # inputs/expected symmetry, FromStage output-name not in
        # upstream's declared outputs, and kinds when BOTH sides
        # are explicit. validate_engines() runs the full pass
        # again with engine_defaults filled in.
        self._kinds_ok(engine_defaults={})
        return self

    def engines(self) -> tuple[str, ...]:
        return tuple(st.engine for st in self.stages)

    def to_graph(self) -> flow_graph.FlowGraph:
        """The FlowGraph the executor consumes — the SAME typed
        contract compose arms hand the core (python/flow_graph.py).

        The flow-typed-edges contract (docs/queue/flow-typed-edges.md):
        resolve each stage's effective outputs (its `outputs` or its
        engine's DEFAULT_OUTPUT, whichever applies) and stamp the
        per-output Kind.values into the NodeRow. The runtime sidecar
        (MCP introspection, editor graph view) sees the typed chain
        past construction — the operator's lever doesn't just refuse
        wrong wires, it annotates the right ones.

        Engine modules are loaded via the same bus validate_engines
        uses (python/plugins.py caches the import after the first call,
        so repeated to_graph() is cheap)."""
        import flow_graph
        if str(REPO / "python") not in sys.path:
            sys.path.insert(0, str(REPO / "python"))
        import plugins
        import stage_params
        # resolve per-stage outputs: explicit row wins; card_io (the
        # stage's override) wins next; the card registry's
        # kind_outputs fills when the stage has card= and no
        # explicit row; engine DEFAULT_OUTPUT is the final fallback.
        # Same precedence ladder as _kinds_ok — the sidecar sees
        # the SAME typed chain the gate used.
        resolved: dict[str, dict[str, Kind]] = {}
        for st in self.stages:
            if st.outputs:
                resolved[st.id] = dict(st.outputs)
                continue
            if st.card_io:
                resolved[st.id] = dict(st.card_io)
                continue
            if st.card:
                card_outs = stage_params.card_outputs(st.card)
                if card_outs:
                    resolved[st.id] = {k: Kind(v)
                                        for k, v in card_outs.items()}
                    continue
            try:
                mod = plugins.load_engine(st.engine)
                default = getattr(mod, "DEFAULT_OUTPUT", None)
            except Exception:
                default = None
            if isinstance(default, Kind):
                resolved[st.id] = {"default": default}
            # else: leave unresolved — NodeRow.outputs stays empty,
            # the sidecar will show '' for that stage's output kind
        # the effective INPUT contract too (the same fill the kind
        # gate applies): card kind_inputs type the stage's unwired
        # keys, so the runner's FILE-kind absolutization sees the
        # artifact slots on card= stages (a FromStage handoff that
        # never absolutizes rides a wire spelling into the engine).
        expected_rows: dict[str, dict[str, Kind]] = {}
        for st in self.stages:
            eff: dict[str, Kind] = dict(st.expected)
            if st.card and st.inputs:
                card_in = stage_params.card_inputs(st.card)
                for name in st.inputs:
                    if name not in eff and name in card_in:
                        eff[name] = Kind(card_in[name])
            expected_rows[st.id] = eff
        return flow_graph.FlowGraph(
            name=self.id,
            description=self.description,
            nodes=tuple(
                flow_graph.NodeRow(
                    node_id=st.id,
                    node_type=st.engine,
                    description=st.description,
                    params=dict(st.params),
                    input_from=tuple(e.ref() for e in st.inputs.values()),
                    # the receiving-name map (FromStage incident,
                    # 2026-09-06): name -> ref so the runner can publish
                    # values under the names $channels speak
                    input_names={name: e.ref()
                                 for name, e in st.inputs.items()},
                    # STROKE 4 (2026-09-06): the card id rides the
                    # ABI row — the worker's card bridge composes
                    # the card doc into engine params (the arm
                    # contract) before execute
                    card=st.card,
                    # R3.3: retry policy rides the ABI row verbatim
                    retries=st.retries,
                    timeout_s=st.timeout_s,
                    outputs={
                        k: v.value
                        for k, v in resolved.get(st.id, {}).items()
                    },
                    # the receiving half of the same contract — the
                    # runner absolutizes artifact refs on FILE-kind
                    # inputs (see flow_graph.NodeRow.expected)
                    expected={
                        # the EFFECTIVE contract (card kind_inputs
                        # fill the unwired keys — the same ladder as
                        # outputs; the raw st.expected leaves the
                        # FILE-kind absolutization blind on card=
                        # stages, the FromStage artifact handoff
                        # never resolves to disk)
                        k: v.value
                        for k, v in expected_rows[st.id].items()
                    },
                )
                for st in self.stages),
        )


def validate_engines(fl: Flow) -> Flow:
    """Every stage's engine must be declared by a plugin — through the
    SAME bus the gateway executes with (declarer-wins, LOUD). Called
    by load_flow() right after import: a typo'd engine refuses before
    any run registers, not on the GPU.

    Also records each engine's `DEFAULT_OUTPUT` (the Kind the engine
    produces when a stage omits `outputs`) and re-runs the kind pass
    with engine defaults filled in — the deferred checks (engine
    default resolution, downstream kinds for stages that omit
    outputs) all fire here."""
    if str(REPO / "python") not in sys.path:
        sys.path.insert(0, str(REPO / "python"))
    import plugins
    engine_defaults: dict[str, Optional[Kind]] = {}
    for st in fl.stages:
        try:
            mod = plugins.load_engine(st.engine)
        except Exception as e:
            raise FlowError(
                "flow %r stage %r: engine %r — %s"
                % (fl.id, st.id, st.engine, e)) from e
        default = getattr(mod, "DEFAULT_OUTPUT", None)
        if default is not None and not isinstance(default, Kind):
            raise FlowError(
                "flow %r stage %r: engine %r DEFAULT_OUTPUT is %r, "
                "expected a Kind member"
                % (fl.id, st.id, st.engine, default))
        engine_defaults[st.engine] = default
    # Re-run the kind pass with engine defaults filled in. This
    # catches every deferred check: stages that omit `outputs` are
    # now resolved against their engine's DEFAULT_OUTPUT, and any
    # downstream kind mismatch (the AI's main failure mode) refuses
    # loud.
    fl._kinds_ok(engine_defaults=engine_defaults)
    return fl


def load_flow(name: str) -> Flow:
    """flows/<name>/flow.py must expose FLOW = Flow(...) — the module
    IS the name. Loads on demand (test lanes may write + remove
    modules at runtime); the id must match the directory; engines
    validated through the plugin bus. LOUD on every breach."""
    if not isinstance(name, str) or not FLOW_ID_RE.match(name):
        raise FlowError("flow name %r is not a legal identifier" % (name,))
    path = FLOWS_ROOT / name / "flow.py"
    if not path.is_file():
        raise FlowError("no flow at flows/%s/flow.py" % name)
    modname = "flow_" + name.replace("-", "_")
    spec = importlib.util.spec_from_file_location(modname, path)
    if spec is None or spec.loader is None:
        raise FlowError("flows/%s/flow.py is not importable" % name)
    mod = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(mod)
    except FlowError as e:
        raise FlowError("flows/%s/flow.py refuses at construction: %s"
                        % (name, e)) from e
    except Exception as e:
        raise FlowError("flows/%s/flow.py failed to import: %s" % (name, e)) from e
    fl = getattr(mod, "FLOW", None)
    if not isinstance(fl, Flow):
        raise FlowError(
            "flows/%s/flow.py declares no FLOW (expected FLOW = Flow(...))"
            % name)
    if fl.id != name:
        raise FlowError("flow id %r does not match its module dir %r"
                        % (fl.id, name))
    return validate_engines(fl)


def scan_flow_ids() -> list[str]:
    """Every declared flow on disk, sorted (walls sweep the registry;
    the loader stays per-name)."""
    if not FLOWS_ROOT.is_dir():
        return []
    return sorted(
        d.name for d in FLOWS_ROOT.iterdir()
        if d.is_dir() and (d / "flow.py").is_file())


# ── the AI compose surface (typed-edges design record) ──────────────
#
# The same rows a flows/<id>/flow.py module declares, expressed as
# JSON, so an agent can CONSTRUCT and COMPILE multi-step flows at a
# validate door — iterating on refusals "without burning a single
# queue slot, without claiming the GPU, without producing a sidecar."
# Zero-tolerance (2026-09-04): unknown keys refuse, kind typos
# refuse, ambiguous edges refuse — nothing drops silently.

_INLINE_TOP_KEYS = {"id", "description", "stages"}


def schema_snapshot() -> "dict[str, object]":
    """GET /v1/schema — the ENTIRE flow-authoring vocabulary in one
    payload (stroke 2, docs/design/production-architecture-review.md:
    the AI stops reading plugin source to compose). Everything here
    is DERIVED from the same rows the validators enforce — the pin is
    the wall (tests/unit/runtime/test_schema_door.py: the snapshot's
    kinds/engines/flows answer the loaders, and the stage shape
    matches STAGE_KEYS).

    Sections:
      kinds        — the closed Kind vocabulary (edge types)
      engines      — engine id -> default_output kind (or null)
      cards        — every registry card: engine, kind contract,
                     requires_model, and the param JSON Schema
                     generated from its schema row (null when the
                     card ships no schema.py) — the machine UI a
                     headless session fills to compose a card= stage
      stage_shape  — the flow_inline stage row: every field, its wire
                     name, and the two edge forms
      flow_body    — top-level keys a {flow_inline} body may carry
      doors        — the three request doors + the validate loop
      flows        — every declared flow: description, stage rows
                     (id/engine/card/inputs/outputs), tool params
      pointers     — the vocabulary that lives on sibling doors
                     (family param schemas, models) — not duplicated
    """
    import json as _json

    import plugins as _plugins
    engines: dict[str, object] = {}
    for eid in sorted(_plugins.scan_engines()):
        try:
            mod = _plugins.load_engine(eid)
            d = getattr(mod, "DEFAULT_OUTPUT", None)
            engines[eid] = d.value if isinstance(d, Kind) else None
        except Exception as e:   # an unloadable engine still lists
            engines[eid] = {"error": "%s: %s" % (type(e).__name__, e)}

    def _wire_edge(e: Edge) -> dict[str, str]:
        if isinstance(e, FromInitial):
            return {"initial": e.key}
        if isinstance(e, FromStage):
            return {"stage": e.stage, "output": e.output}
        return {"ref": e.ref()}

    flows: dict[str, object] = {}
    for fid in scan_flow_ids():
        row: dict[str, object]
        try:
            fl = load_flow(fid)
            # the EFFECTIVE contract — to_graph resolves the card
            # registry / engine defaults exactly as the executor
            # will see them (a Stage row's empty outputs{} is NOT
            # what a composer may wire against)
            g = fl.to_graph()
            gnodes = {n.node_id: n for n in g.nodes}
            row = {
                "description": fl.description,
                "stages": [{
                    "id": st.id,
                    "engine": st.engine,
                    "card": gnodes[st.id].card,
                    "description": st.description,
                    "inputs": {n: _wire_edge(e)
                               for n, e in st.inputs.items()},
                    "outputs": dict(gnodes[st.id].outputs or {}),
                    "expected": {n: k.value
                                 for n, k in st.expected.items()},
                    "skip_when": ({"initial": st.skip_when.initial,
                                   "when": st.skip_when.when.value}
                                  if st.skip_when is not None else None),
                } for st in fl.stages],
            }
        except Exception as e:   # a flow that no longer constructs
            row = {"error": "%s: %s" % (type(e).__name__, e)}   # still lists
        tp = FLOWS_ROOT / fid / "tool.json"
        if tp.is_file():
            try:
                row["tool"] = _json.loads(
                    tp.read_text()).get("params_schema")
            except ValueError:
                row["tool"] = {"error": "unparseable tool.json"}
        flows[fid] = row

    # STROKE 7 (2026-09-06): the card lattice as generated machine
    # UI — every registry card's engine, kinds, model requirement,
    # and param JSON Schema, DERIVED from the same rows the compile
    # gate enforces (a headless session composes a valid card= stage
    # from this ONE payload — no plugin source reading). A card
    # whose schema refuses to resolve still lists (the snapshot
    # rule: unloadable still lists, with the error inline); a card
    # with no schema.py serves params null (the schemaless set is
    # explicit in stage_params, never a silent omission).
    import stage_params as _sp
    cards: dict[str, object] = {}
    for _row in _sp.REGISTRY.rows:
        _entry: dict[str, object] = {
            "engine": _row.engine,
            "kind_inputs": dict(_row.kind_inputs),
            "kind_outputs": dict(_row.kind_outputs),
            "requires_model": bool(
                getattr(_row, "requires_model", False)),
        }
        try:
            _schema_cls = _sp._resolve_schema(_row.card_id)
            _entry["params"] = _schema_cls.model_json_schema() \
                if _schema_cls is not None else None
        except Exception as e:   # resolve/import failure still lists
            _entry["params"] = {"error": "%s: %s"
                                % (type(e).__name__, e)}
        cards[_row.card_id] = _entry

    return {
        "kinds": [k.value for k in Kind],
        "engines": engines,
        "cards": cards,
        "stage_shape": {
            "fields": sorted(STAGE_KEYS),
            "id": "stage id (unique; edges reference it)",
            "engine": "one of engines above (validated at compile)",
            "card": "optional action-card id — opts the stage into "
                    "the typed card gate (params validated against "
                    "the card schema)",
            "params": "the engine's verbatim surface (workflow / "
                      "out_dir / timeout_s for comfyui; task/family "
                      "for audio_cpp) — unvalidated here unless "
                      "card= is set",
            "inputs": 'name -> {"initial": key} (a request key) '
                      'or {"stage": id, "output": name} (an earlier '
                      "stage's output; kind is INFERRED upstream)",
            "outputs": 'name -> Kind string (omit for the engine '
                       "default)",
            "expected": "name -> Kind string (what each input "
                        "expects; required unless card= fills it)",
            "skip_when": '{"initial": key, "when": "present|absent"}'
                         " — prunes the stage at build time",
            "edge_rules": "edges must point at EARLIER stages; a "
                          "kind mismatch refuses at compile with "
                          "both kinds named",
        },
        "flow_body": {
            "keys": sorted(_INLINE_TOP_KEYS),
            "example": {"id": "my-flow", "stages": [
                {"id": "gen", "engine": "anycreature",
                 "inputs": {"prompt": {"initial": "prompt"}},
                 "expected": {"prompt": "text"}},
                {"id": "remesh", "engine": "comfyui",
                 "inputs": {"mesh": {"stage": "gen", "output": "default"}},
                 "expected": {"mesh": "mesh"}}]},
        },
        "doors": {
            "start": "POST /v1/flows/start with exactly one of "
                     '{"flow": name} | {"flow_inline": {...}} | '
                     '{"model": id}, PLUS a REQUIRED doc-backed '
                     '"draft_id" on the envelope (CARD BIRTH LAW: '
                     "compose at POST /v1/flows/drafts first — a "
                     "cardless start 4xxes BEFORE any run registers)",
            "validate": "POST /v1/flows/validate with "
                        '{"flow_inline": {...}} — verbatim compile '
                        "refusals, no queue slot, no GPU, no sidecar",
            "status": "GET /v1/flows/status/<run_id> — stages, "
                      "progress, queue_position",
            "stop": "POST /v1/flows/stop/<run_id>",
        },
        "flows": flows,
        "pointers": {
            "card_param_schemas":
                "GET /v1/flows/families/param-schemas (per-family "
                "card param envelopes)",
            "models": "GET /v1/models (the model catalog)",
        },
    }


def _inline_kind(where: str, value: JsonValue) -> Kind:
    if not isinstance(value, str):
        raise FlowError("%s: kind %r is not a string" % (where, value))
    try:
        return Kind(value)
    except ValueError:
        raise FlowError(
            "%s: %r is not a Kind — the closed vocabulary is %s"
            % (where, value, [k.value for k in Kind])) from None


def _inline_edge(where: str, value: JsonValue) -> Edge:
    if not isinstance(value, dict):
        raise FlowError(
            "%s: edge %r is not an object — use {\"initial\": key} "
            "or {\"stage\": id, \"output\": name}" % (where, value))
    if set(value) == {"initial"}:
        return FromInitial(key=str(value["initial"]))
    if set(value) == {"stage", "output"}:
        return FromStage(
            stage=str(value["stage"]), output=str(value["output"]))
    raise FlowError(
        "%s: edge keys %s are not an edge shape — exactly "
        "{\"initial\": key} or {\"stage\": id, \"output\": name}"
        % (where, sorted(value)))


def _inline_skip(where: str, value: JsonValue) -> StageSkip | None:
    """{"initial": key, "when": present|absent} -> StageSkip (None
    when the stage declares no branch)."""
    if value is None:
        return None
    if not isinstance(value, dict):
        raise FlowError(
            "%s: skip_when %r is not an object — use {\"initial\": "
            "key, \"when\": present|absent}" % (where, value))
    if set(value) != {"initial", "when"}:
        raise FlowError(
            "%s: skip_when keys %s are not a branch shape — exactly "
            "{\"initial\": key, \"when\": present|absent}"
            % (where, sorted(value) if isinstance(value, dict) else value))
    try:
        when = SkipWhen(value["when"])
    except ValueError:
        raise FlowError(
            "%s: %r is not a branch condition — the closed vocabulary "
            "is %s" % (where, value["when"],
                        [w.value for w in SkipWhen])) from None
    initial = value["initial"]
    if not isinstance(initial, str) or not initial:
        raise FlowError("%s: skip initial %r is not a non-empty string"
                        % (where, initial))
    return StageSkip(initial=initial, when=when)


def flow_from_body(body: JsonValue) -> Flow:
    """A JSON body -> a fully validated Flow (the AI compose surface).

    Shape:
        {"id": "...", "description": "...", "stages": [{
            "id": "...", "engine": "...", "description": "...",
            "params": {...},
            "inputs":  {"name": {"initial": "key"}
                                 | {"stage": "id", "output": "name"}},
            "outputs": {"name": "<Kind>"},   # omit for engine default
            "expected": {"name": "<Kind>"},  # what each input expects
            # ── BRANCH SYSTEM (2026-09-06, §2) ──
            "skip_when": {"initial": "key", "when": "present|absent"}
            # ── CARD-STAGE LATTICE (2026-09-05, Path C) ──
            "card": "<id>",                   # opt in to the body gate
            "card_io": {"name": "<Kind>"}     # output override (rare)
        }]}

    Every refusal is a FlowError naming flow/stage/input and both
    Kinds — the compile-time feedback the AI iterates on. Engines are
    validated through the plugin bus HERE (validate_engines runs
    inside), so the caller gets a loadable flow or a loud refusal.
    """
    if not isinstance(body, dict):
        raise FlowError("flow body must be a JSON object")
    dead = sorted(set(body) - _INLINE_TOP_KEYS)
    if dead:
        raise FlowError(
            "flow body carries unknown keys %s — allowed: %s"
            % (dead, sorted(_INLINE_TOP_KEYS)))
    if "id" not in body or "stages" not in body:
        raise FlowError(
            "flow body needs at least id and stages — got keys %s"
            % sorted(body))
    stages_in = body["stages"]
    if not isinstance(stages_in, list) or not stages_in:
        raise FlowError("flow stages must be a non-empty list")
    rows = []
    for i, st in enumerate(stages_in):
        where = "stage[%d]" % i
        # STAGE-EXTRAS (QUEUE LANE LAW, 2026-09-05): the body's
        # stage row MUST name only the schema's known fields.
        # extra=forbid on Stage pydantic is bypassed here because
        # we pull fields by name; without this check a fossil
        # field (yamlFlow, yamlRunId, etc.) silently drops. Strict
        # makes it loud. STAGE_KEYS is module-level (pinned equal to
        # set(Stage.model_fields) by the hard-gates wall).
        st_extras = sorted(set(st) - STAGE_KEYS)
        if st_extras:
            raise FlowError(
                "stage[%d] %r: body carries unknown field(s) %s — "
                "the schema declares %s (extra=forbid at the door)"
                % (i, st.get("id", "<no id>"), st_extras,
                   sorted(STAGE_KEYS)))

        if not isinstance(st, dict):
            raise FlowError("%s: %r is not an object" % (where, st))
        try:
            inputs = {
                name: _inline_edge(
                    "%s input %r" % (where, name), edge)
                for name, edge in (st.get("inputs") or {}).items()}
            outputs = {
                name: _inline_kind(
                    "%s output %r" % (where, name), kind)
                for name, kind in (st.get("outputs") or {}).items()}
            expected = {
                name: _inline_kind(
                    "%s expected %r" % (where, name), kind)
                for name, kind in (st.get("expected") or {}).items()}
            card_io = {
                name: _inline_kind(
                    "%s card_io %r" % (where, name), kind)
                for name, kind in (st.get("card_io") or {}).items()}
            skip_when = _inline_skip(where, st.get("skip_when"))
            rows.append(Stage(
                id=str(st.get("id", "")),
                engine=str(st.get("engine", "")),
                description=str(st.get("description", "")),
                params=dict(st.get("params") or {}),
                inputs=inputs, outputs=outputs, expected=expected,
                card=str(st.get("card", "") or ""),
                card_io=card_io, skip_when=skip_when))
        except FlowError as e:
            raise e
        except Exception as e:
            # pydantic field refusals (extra keys, empty ids) arrive
            # here — surfaced as FlowError so the door speaks one
            # error language
            raise FlowError("%s refuses: %s" % (where, e)) from e
    try:
        fl = Flow(id=str(body["id"]),
                  description=str(body.get("description", "")),
                  stages=tuple(rows))
    except FlowError as e:
        raise FlowError(str(e)) from e
    except ValidationError as e:
        # pydantic wraps the row validators' FlowErrors — dig the
        # compile message out so the AI loop reads the REAL refusal
        # (flow/stage/input + both kinds), not the wrapper envelope
        inner = None
        for err in e.errors():
            cand = err.get("ctx", {}).get("error")
            if isinstance(cand, (FlowError, ValueError)):
                inner = str(cand)
                break
        raise FlowError(inner or str(e)) from e
    except Exception as e:
        raise FlowError("flow %r refuses at construction: %s"
                        % (body.get("id"), e)) from e
    return validate_engines(fl)

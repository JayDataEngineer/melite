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
from typing import TYPE_CHECKING, Any, Optional

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
    opts in to a typed body gate (`py/stage_params.py` validates
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
    # ── the lattice opt-in (Path C) ───────────────────────────────
    # card="" is the engine-only default. Setting card="<id>" routes
    # the stage through the ParamSchemaRegistry gate (py/stage_params.py):
    # the body is validated against the card's schema_class, and the
    # I/O contract is read from the same row. card_io is the EXPLICIT
    # output override — a flow author who needs the card to declare
    # a different output channel than the registry's default (rare;
    # the same pattern as Stage.outputs) can stamp it here.
    card: str = ""
    card_io: dict[str, Kind] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _id_legal(self) -> "Stage":
        if not FLOW_ID_RE.match(self.id):
            raise FlowError("stage id %r is not a legal identifier" % self.id)
        return self


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
})


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
    initial_validators: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _validators_are_models(self) -> "Flow":
        for key, model in self.initial_validators.items():
            if not (isinstance(model, type) and issubclass(model, BaseModel)):
                raise FlowError(
                    "initial_validators[%r] must be a pydantic BaseModel "
                    "subclass, got %r" % (key, model))
        return self

    def validate_initial(self, body: dict[str, Any]) -> None:
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
        # Lazy import: py/stage_params imports py/flow's Kind lazily
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
        # Lazy import: cycle (py/stage_params imports py/flow's
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
        contract compose arms hand the core (py/flow_graph.py).

        The flow-typed-edges contract (docs/queue/flow-typed-edges.md):
        resolve each stage's effective outputs (its `outputs` or its
        engine's DEFAULT_OUTPUT, whichever applies) and stamp the
        per-output Kind.values into the NodeRow. The runtime sidecar
        (MCP introspection, editor graph view) sees the typed chain
        past construction — the operator's lever doesn't just refuse
        wrong wires, it annotates the right ones.

        Engine modules are loaded via the same bus validate_engines
        uses (py/plugins.py caches the import after the first call,
        so repeated to_graph() is cheap)."""
        import flow_graph
        if str(REPO / "py") not in sys.path:
            sys.path.insert(0, str(REPO / "py"))
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
                    outputs={
                        k: v.value
                        for k, v in resolved.get(st.id, {}).items()
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
    if str(REPO / "py") not in sys.path:
        sys.path.insert(0, str(REPO / "py"))
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
            rows.append(Stage(
                id=str(st.get("id", "")),
                engine=str(st.get("engine", "")),
                description=str(st.get("description", "")),
                params=dict(st.get("params") or {}),
                inputs=inputs, outputs=outputs, expected=expected,
                card=str(st.get("card", "") or ""),
                card_io=card_io))
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

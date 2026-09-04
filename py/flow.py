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
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

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
    `expected`/`outputs` carry the edge-Kind contract."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    id: str = Field(min_length=1)
    engine: str = Field(min_length=1)
    description: str = ""
    params: dict[str, Any] = Field(default_factory=dict)
    inputs: dict[str, Edge] = Field(default_factory=dict)
    # what the stage PRODUCES, named per output channel. Defaults to
    # {"default": <engine.default_output>}; if the engine declares no
    # default_output the Flow validator refuses loudly (see _kinds_ok).
    outputs: dict[str, Kind] = Field(default_factory=dict)
    # what each named input EXPECTS. The Flow validator refuses any
    # input that is wired but untyped, or typed but unwired.
    expected: dict[str, Kind] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _id_legal(self) -> "Stage":
        if not FLOW_ID_RE.match(self.id):
            raise FlowError("stage id %r is not a legal identifier" % self.id)
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
        """
        outputs_by_stage: dict[str, dict[str, Kind]] = {}
        for st in self.stages:
            # 1) inputs/expected symmetry
            if set(st.inputs.keys()) != set(st.expected.keys()):
                only_input = set(st.inputs) - set(st.expected)
                only_expected = set(st.expected) - set(st.inputs)
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
            # resolve this stage's effective outputs
            if st.outputs:
                resolved = dict(st.outputs)
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
                receiving_kind = st.expected[name]
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

    def to_graph(self):
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
        # resolve per-stage outputs: explicit row wins; engine
        # DEFAULT_OUTPUT fills the unnamed "default" channel.
        resolved: dict[str, dict[str, Kind]] = {}
        for st in self.stages:
            if st.outputs:
                resolved[st.id] = dict(st.outputs)
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

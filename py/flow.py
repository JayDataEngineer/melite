"""flow.py — THE flow declaration layer (PYTHON SHAPE LAW, 2026-09-04).

Flows are what pipelines/ was: authored multi-stage graphs for the
queue (design record: docs/queue/flows.md). Declarations are PYTHON
MODULES — one flow per module, the module IS the name
(flows/<id>/flow.py exposing FLOW = Flow(...)). Validation happens
AT CONSTRUCTION: an unbuildable flow (dup ids, a wire to a later or
missing stage, an engine no plugin declares) cannot be declared —
the refusal is the import.

Layers (pipeline_graph.py stays THE graph contract, unchanged):
    flows/<id>/flow.py   authored declaration (this schema)
    Flow.to_graph()      -> PipelineGraph / NodeRow (the executor's food)
    resolve_inputs()     runtime __initial__/<node>.<out> wiring (gateway)

Edges are structural (rung 5: no stringly handshakes):
    FromInitial("prompt")     -> "__initial__.prompt"
    FromStage("forge","glb")  -> "forge.glb"
The `$key` substitution channel is the ENGINE ABI (params.workflow /
inject deep-walk, pinned by the compose goldens) and stays verbatim
inside params.
"""

from __future__ import annotations

import importlib.util
import re
import sys
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
    """Wires an EARLIER stage's output into this stage: <stage>.<output>."""
    stage: str = Field(min_length=1)
    output: str = Field(min_length=1)

    def ref(self) -> str:
        return "%s.%s" % (self.stage, self.output)


class Stage(BaseModel):
    """One flow stage — the authored row. `engine` must be a type the
    plugin registry declares (validated on the Flow, where the whole
    graph is known); `params` is the engine-owned surface, verbatim."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    id: str = Field(min_length=1)
    engine: str = Field(min_length=1)
    description: str = ""
    params: dict[str, Any] = Field(default_factory=dict)
    inputs: dict[str, Edge] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _id_legal(self) -> "Stage":
        if not FLOW_ID_RE.match(self.id):
            raise FlowError("stage id %r is not a legal identifier" % self.id)
        return self


class Flow(BaseModel):
    """An authored flow: a named chain of stages with structural
    input/output wiring. Declared ONCE per module (FLOW = Flow(...))
    in flows/<id>/flow.py; load_flow() is the only door the gateway
    uses. Construction validates: unique ids, wires to EARLIER stages
    only, every engine declared by a plugin."""
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

    def engines(self) -> tuple[str, ...]:
        return tuple(st.engine for st in self.stages)

    def to_graph(self):
        """The PipelineGraph the executor consumes — the SAME typed
        contract compose arms hand the core (py/pipeline_graph.py)."""
        import pipeline_graph
        return pipeline_graph.PipelineGraph(
            name=self.id,
            description=self.description,
            nodes=tuple(
                pipeline_graph.NodeRow(
                    node_id=st.id,
                    node_type=st.engine,
                    description=st.description,
                    params=dict(st.params),
                    input_from=tuple(e.ref() for e in st.inputs.values()),
                )
                for st in self.stages),
        )


def validate_engines(fl: Flow) -> Flow:
    """Every stage's engine must be declared by a plugin — through the
    SAME bus the gateway executes with (declarer-wins, LOUD). Called
    by load_flow() right after import: a typo'd engine refuses before
    any run registers, not on the GPU."""
    if str(REPO / "py") not in sys.path:
        sys.path.insert(0, str(REPO / "py"))
    import plugins
    for st in fl.stages:
        try:
            plugins.load_engine(st.engine)
        except Exception as e:
            raise FlowError(
                "flow %r stage %r: engine %r — %s"
                % (fl.id, st.id, st.engine, e)) from e
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

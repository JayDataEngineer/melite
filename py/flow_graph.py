"""flow_graph.py — THE graph contract (typed rows, PYTHON SHAPE rung 2).

Python hands python STRUCTURES; these are the structures. Producers
CONSTRUCT (an invalid graph cannot be built); the plugin bus coerces
arm output at the rim (malformed graphs refuse LOUDLY, by field name
— silent drops are impossible: extra, missing, or typo'd fields all
refuse). Text exists only at the true rims: authored flow.yaml
(parse at the disk rim) and HTTP response skins.

Field aliases keep the wire names (`id`, `type`) — the estate's
recorded goldens and sidecars pin those keys — while construction
stays builtin-clean (node_id/node_type/engine_type; never name
fields after builtins). model_dump(by_alias=True) at a rim produces
exactly the historical dict shape.
"""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class NodeRow(BaseModel):
    """One flow node — the engine ABI row (id/type/input_from/params)."""
    model_config = ConfigDict(
        frozen=True, extra="forbid", populate_by_name=True)

    node_id: str = Field(min_length=1, alias="id")
    node_type: str = Field(min_length=1, alias="type")
    # explicit wiring only: __initial__.$tensor / prior-node outputs
    input_from: tuple[str, ...] = ()
    # authored node documentation (human prose in flow.yaml);
    # engines never read it
    description: str = ""
    # the engine-owned surface (comfyui: workflow/out_dir/timeout_s;
    # audio_cpp: task/family/model/...) — content is the engine's
    params: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _refs_nonempty(self) -> "NodeRow":
        for ref in self.input_from:
            if not isinstance(ref, str) or not ref.strip():
                raise ValueError(
                    "node %r: input_from ref must be a non-empty string "
                    "(got %r)" % (self.node_id, ref))
        return self


class FlowGraph(BaseModel):
    """The gateway's flow graph — what compose arms hand the core
    and what parse_flow_text constructs at the disk rim. May carry
    zero nodes only as the in-progress compose skeleton; the gateway
    refuses an empty graph before any run registers."""
    model_config = ConfigDict(
        frozen=True, extra="forbid", populate_by_name=True)

    name: str = Field(min_length=1)
    # authored flow.yaml never states a graph-level type (engine
    # truth is per node row); composed skeletons carry it for the wire
    engine_type: str = Field(default="", alias="type")
    description: str = ""
    nodes: tuple[NodeRow, ...] = ()

    @model_validator(mode="after")
    def _unique_ids(self) -> "FlowGraph":
        seen = set()
        for n in self.nodes:
            if n.node_id in seen:
                raise ValueError("duplicate node id %r" % n.node_id)
            seen.add(n.node_id)
        return self


class Skeleton(FlowGraph):
    """THE ACTION CARD LAW, enforced at construction: exactly ONE node
    carrying ONE workflow (params.workflow is a dict). An invalid card
    graph cannot be built — the refusal names the breach."""
    model_config = ConfigDict(
        frozen=True, extra="forbid", populate_by_name=True)

    @model_validator(mode="after")
    def _one_node_one_workflow(self) -> "Skeleton":
        if len(self.nodes) != 1:
            raise ValueError(
                "THE ACTION CARD LAW: a card emits exactly ONE skeleton "
                "node (got %d)" % len(self.nodes))
        wf = self.nodes[0].params.get("workflow")
        if not isinstance(wf, dict):
            raise ValueError(
                "THE ACTION CARD LAW: the skeleton node must carry ONE "
                "workflow dict in params.workflow (got %s)"
                % type(wf).__name__)
        return self

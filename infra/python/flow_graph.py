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

from typing import Any  # noqa: F401 — the pydantic `params` FIELD below
# evaluates at runtime (no future-import in this module); the
# annotation wall owns function signatures, not field types.

from pydantic import BaseModel, ConfigDict, Field, model_validator

# Params trees are JSON documents (annotations only — the pydantic
# `params` FIELD keeps its own declared type; see the module docstring
# on why field types are a separate, runtime-visible decision).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None


def _dollar_tokens(value: JsonValue) -> set[str]:
    """Every whole-string $name in a params tree — the compile-time
    twin of gateway._deep_expand's tokenizer: a token is "$" plus the
    ENTIRE remaining string (embedded "x$seed y" is prompt prose, not
    a channel). One tokenizer, two sites: the wall pins that they
    agree."""
    if isinstance(value, str):
        return {value[1:]} if value.startswith("$") and len(value) > 1 else set()
    if isinstance(value, list):
        out: set[str] = set()
        for v in value:
            out |= _dollar_tokens(v)
        return out
    if isinstance(value, dict):
        out = set()
        for v in value.values():
            out |= _dollar_tokens(v)
        return out
    return set()


class NodeRow(BaseModel):
    """One flow node — the engine ABI row (id/type/input_from/params)."""
    model_config = ConfigDict(
        frozen=True, extra="forbid", populate_by_name=True)

    node_id: str = Field(min_length=1, alias="id")
    node_type: str = Field(min_length=1, alias="type")
    # explicit wiring only: __initial__.$tensor / prior-node outputs
    input_from: tuple[str, ...] = ()
    # the receiving-name map (2026-09-06, the character flow's
    # FromStage incident: input_from refs lose the STAGE's input
    # names — resolve_inputs keyed FromStage values by ref
    # ("rig.body") while $channels + `expected` speak names
    # ("body"), so "$body" rode the workflow verbatim and the node
    # refused it. name -> ref, built at to_graph from Stage.inputs;
    # the runner publishes each value under its receiving names too.
    # {} is today's behavior (hand-built rows, card skeletons).
    input_names: dict[str, str] = Field(default_factory=dict)
    # authored node documentation (human prose in flow.yaml);
    # engines never read it
    description: str = ""
    # the engine-owned surface (comfyui: workflow/out_dir/timeout_s;
    # audio_cpp: task/family/model/...) — content is the engine's
    params: dict[str, Any] = Field(default_factory=dict)
    # the flow-typed-edges contract (docs/queue/flow-typed-edges.md):
    # what THIS node produces, named per output channel, as Kind.value
    # strings. Empty for card-only NodeRows (the action-card ABI) and
    # for engine rows that didn't declare `outputs` on the Stage.
    # Carried into the run sidecar so MCP introspection and editor
    # graph views see the typed chain past construction.
    outputs: dict[str, str] = Field(default_factory=dict)
    # the SAME contract's receiving half: what each input EXPECTS,
    # Kind.value strings. The runner reads it to absolutize
    # artifact-ref values on FILE-kind inputs (the engine ABI speaks
    # absolute paths — the $-substitution and the submit-time upload
    # walk both resolve from disk, never from the wire's URL or
    # runs-relative spellings). Mirrors `outputs`: empty when the
    # stage omitted `expected`.
    expected: dict[str, str] = Field(default_factory=dict)
    # STROKE 4 (2026-09-06): the action-card id when this node is a
    # CARD stage (Stage.card → to_graph). "" is the engine-only
    # default (every existing row). When set, the worker's card
    # bridge composes the card doc (params) into engine params via
    # the owning plugin's arm BEFORE execute — the node's params are
    # the CARD DOC, not the engine surface. The bridge is generic:
    # the arm's name is resolved through the plugin bus, the core
    # names no card (PLUGIN ARCHITECTURE LAW).
    card: str = Field(default="")
    # R3.3 RETRY ROWS (2026-09-06): retry policy is DATA on the
    # stage, never engine-side guessing. `retries` = extra attempts
    # after a failed one (0 = today's fail-fast; capped at 5 — a
    # flaky engine needs a couple of tries, not an infinite loop
    # burning GPU-hours). `timeout_s` = the RUNNER's stage budget
    # (asyncio.wait_for) — distinct from params.timeout_s, the
    # ENGINE's own door. Every attempt is ledgered run.stage_retry
    # and stamped stage["retries_used"] in the sidecar (RESILIENCE
    # LAW: documented, then continued).
    retries: int = Field(default=0, ge=0, le=5)
    timeout_s: float | None = Field(default=None)

    @model_validator(mode="after")
    def _refs_nonempty(self) -> "NodeRow":
        for ref in self.input_from:
            if not isinstance(ref, str) or not ref.strip():
                raise ValueError(
                    "node %r: input_from ref must be a non-empty string "
                    "(got %r)" % (self.node_id, ref))
        if self.timeout_s is not None and self.timeout_s <= 0:
            raise ValueError(
                "node %r: timeout_s must be positive (got %r)"
                % (self.node_id, self.timeout_s))
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
    skipped: tuple[str, ...] = ()
    # BRANCH SYSTEM (2026-09-06): ids of declared stages pruned at
    # build time (Flow.compile) — recorded here so registration and
    # the validate door report what didn't run without touching the
    # stage rows every consumer iterates. () is today's behavior.

    @model_validator(mode="after")
    def _unique_ids(self) -> "FlowGraph":
        seen = set()
        for n in self.nodes:
            if n.node_id in seen:
                raise ValueError("duplicate node id %r" % n.node_id)
            seen.add(n.node_id)
        return self

    def _channel_pool(self, node: "NodeRow") -> set[str]:
        """The names the executor would publish for this node — the
        EXACT mirror of python/gateway.py resolve_inputs' output keys:
        producer refs ("rig.body") land verbatim, initial refs
        publish their TENSOR key (the __initial__ spelling never
        rides the pool), and every input_names receiving name joins.
        test_channel_resolution pins the mirror property so this set
        and the resolver cannot drift."""
        pool = set(node.input_names)
        for ref in node.input_from:
            if ref.startswith("__initial__."):
                pool.add(ref.split(".", 1)[1])
            else:
                pool.add(ref)
        return pool

    def unresolved_channels(
            self) -> tuple[tuple[str, str, tuple[str, ...]], ...]:
        """Every $name a node's params reference that NOTHING provides.

        The runtime substitution (gateway._deep_expand) passes unknown
        $-strings through SILENTLY — prompt text is a legitimate
        "$100 bill" — so a mistyped or unwired channel surfaces only
        as a downstream engine refusal ("Invalid image file: $photo",
        character flow attempts 1/8 + the starter branch, 2026-09-06:
        three queued GPU runs spent discovering a wiring bug the graph
        already knew). This is the compile-time twin: the same
        whole-string tokenizer (a token is "$" + the entire remaining
        string, exactly what _deep_expand would try), judged against
        the same pool resolve_inputs builds. What refuses here could
        never have resolved there."""
        bad: list[tuple[str, str, tuple[str, ...]]] = []
        for node in self.nodes:
            pool = self._channel_pool(node)
            for token in _dollar_tokens(node.params):
                if token not in pool:
                    bad.append((node.node_id, token,
                                tuple(sorted(pool))))
        return tuple(bad)


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

"""kernel_manifest — STROKE 6 (2026-09-06): ONE contract for every
executable codebase (design record docs/design/one-contract-compose.md
§4, "ONE CONTRACT INSTEAD OF 5").

The contract was never about kernel runtimes (ggml vs cuda was the
wrong axis). It is the ESTATE BOUNDARY: every native codebase
declares the same rows regardless of what is inside it — plain C++
CLIs (autoremesher, anyCreature), GGML bundles (kimodo, QwenTTS),
HTTP APIs (ideogram). ComfyUI-native CUDA needs no manifest (its
card+model rows already are one).

PYTHON SHAPE LAW throughout: closed vocabularies are enums
(ExecMode/Mount); artifacts are all-or-nothing (a url without a
sha256 refuses); the card lattice is NOT restated (the manifest
names the card id — schema + Kind rows derive from the stage_params
REGISTRY, rung 6); validation happens AT CONSTRUCTION.

The manifest is DATA owned by the plugin (packages/engines/cpp/
<id>/manifest.py); the mechanics live in kernel_exec.py
(core-generic: spawn, timeout, stop, harvest — no lane knowledge,
PLUGIN ARCHITECTURE LAW). The plugin's execute() keeps ONLY its
lane translation (I/O truth like GLB→OBJ) and delegates.
"""

from __future__ import annotations

from enum import Enum
from typing import Dict, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

# Template namespaces are JSON documents (annotations only).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None


class ExecMode(str, Enum):
    """ONE ENUM FIELD, not an architecture. subprocess is the
    DEFAULT: plain C++ CLIs already speak argv+files; in-process
    ctypes only for tensor fusion (geometry code never needs it);
    a hot kernel gets a persistent server process (http); torch-node
    is the bridge-extension mount (the proxy-node follow-up)."""
    SUBPROCESS = "subprocess"
    CTYPES = "ctypes"
    HTTP = "http"
    TORCH_NODE = "torch-node"


class Mount(str, Enum):
    """Where the kernel plugs in: estate stage runs, the ComfyUI
    graph via the bridge extension, or both (declared intent — the
    graph side lands with the bridge)."""
    STAGE = "stage"
    GRAPH = "graph"
    BOTH = "both"


class ArtifactRow(BaseModel):
    """A provisioned blob (binary build, weights, deps): url +
    sha256, ALL OR NOTHING (shape law rung 4 — a linkless row
    claiming 'user provided' is the banned hack)."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    url: str = Field(min_length=1)
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    size: int = Field(default=0, ge=0)


class SubprocessExec(BaseModel):
    """The default exec: argv templates over the $spell namespace
    ({**inputs, **params} + reserved $bin/$out), the required
    output file, optional extra output channels, a timeout, and
    setdefault env extras (never overriding the operator's env).

    Spells: $name, $a.b (nested walk), $name|default (build_argv
    parity — hand-written flows may omit knobs the schema would
    default). An unresolvable spell is a LOUD execution refusal
    (there is no later seam — the mergegraph rule).

    Two-binary kernels (PORT 2, 2026-09-06: anyCreature's node
    interpreter + cli.js): $bin is the PROCESS binary (argv[0]);
    further resolved paths ride caller-supplied namespace extras
    ($cli, $spec…) — lane values, generic slots. The cwd template
    covers engines that read relatively (the vendor root)."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    bin_env: str = ""
    bin_candidates: tuple = ()
    # PATH names (shutil.which, in order) — searched AFTER the env
    # override, BEFORE the absolute candidates (the anyCreature
    # resolve_node order: env → which('node') → ~/.local/bin/node)
    bin_path_names: tuple = ()
    # caller-override spell (PORT 4, 2026-09-06: audio-cpp model
    # rows pin their own cli — lane data, resolved shim-side into
    # namespace_extra; non-empty WINS over the whole search above)
    bin_override: str = ""
    argv: tuple = ()
    # conditional groups: ((condition_spell, (templates...)), ...)
    # — the group expands iff the condition resolves non-empty
    # (born PORT 3 2026-09-06 for kimodo's --smplx-checkpoint; the
    # engine retired same day — ONE-implementation rule, the NVIDIA
    # package wrap won — and the slot lives on serving PORT 4:
    # audio-cpp's duration/prompt/lyrics/seed + instruct/speaker/
    # temperature groups ride it)
    # when a checkpoint is named; absence is legitimate, not a
    # refusal — the $spell language has no conditionals, so the
    # manifest carries the branching as data)
    argv_when: tuple = ()
    # spawn cwd as a spell template (resolved like argv); None =
    # inherit (the autoremesher shape)
    cwd: Optional[str] = None
    # the required output: its runtime channel name (the engine ABI
    # name flows publish — e.g. "mesh") + its path template
    # (run_dir-joined, must exist post-run or the run refused)
    output_channel: str = "default"
    output_file: str = Field(min_length=1)
    extra_outputs: Dict[str, str] = Field(default_factory=dict)
    timeout_s: float = Field(default=600.0, gt=0)
    env: Dict[str, str] = Field(default_factory=dict)
    progress_regex: str = ""


class KernelManifest(BaseModel):
    """The estate boundary row: id/version, the card (schema+kinds
    derive from the registry — never restated here), the owning
    engine (must equal the card row's engine), the exec mode (+ its
    row — mode/subprocess coherence is construction-gated), the
    mount intent, and the provisioned artifacts."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    id: str = Field(min_length=1)
    version: str = Field(min_length=1)
    card: str = Field(min_length=1)
    engine: str = Field(min_length=1)
    exec: ExecMode = ExecMode.SUBPROCESS
    subprocess: Optional[SubprocessExec] = None
    mount: Mount = Mount.STAGE
    artifacts: tuple = ()

    @model_validator(mode="after")
    def _coherent(self) -> "KernelManifest":
        if self.exec == ExecMode.SUBPROCESS and self.subprocess is None:
            raise ValueError(
                "manifest %r: exec 'subprocess' needs its subprocess "
                "row (argv, output_file, binary search)" % self.id)
        if self.exec != ExecMode.SUBPROCESS and self.subprocess is not None:
            raise ValueError(
                "manifest %r: exec %r carries a subprocess row it "
                "will never use — name the mode the row serves"
                % (self.id, self.exec.value))
        for art in self.artifacts:
            if not isinstance(art, ArtifactRow):
                raise ValueError(
                    "manifest %r: artifacts must be ArtifactRows "
                    "(url+sha256, all or nothing)" % self.id)
        # the card lattice check (lazy: the registry mounts card
        # packages on first touch — module-top import would force
        # the bus up for every consumer)
        import stage_params
        row = stage_params.REGISTRY.get(self.card)
        if row is None:
            raise ValueError(
                "manifest %r: card %r is not in the card registry "
                "(Stage=Card lattice: a kernel serves a card, never "
                "a bare engine)" % (self.id, self.card))
        if row.engine != self.engine:
            raise ValueError(
                "manifest %r: engine %r != card %r's engine %r — "
                "the manifest serves its card's lane"
                % (self.id, self.engine, self.card, row.engine))
        return self


def resolve_spell(template: str, namespace: dict[str, JsonValue]) -> str:
    """One argv/output template → string. $out/$bin are reserved
    (injected by the executor); $a.b walks nested dicts;
    $name|default covers omitted knobs. Raises KeyError naming the
    unresolvable spell (the executor turns it into the loud error
    dict — QUEUE LANE LAW, never a silent empty argv)."""
    import re
    def _lookup(spell: str) -> JsonValue:
        name, _, default = spell.partition("|")
        cur: JsonValue = namespace
        for part in name.split("."):
            if isinstance(cur, dict) and part in cur:
                cur = cur[part]
            else:
                if _:
                    return default
                raise KeyError(spell)
        return cur
    def _sub(m: "re.Match") -> str:
        return str(_lookup(m.group(1)))
    return re.sub(r"\$([A-Za-z_][A-Za-z0-9_.]*(\|[^\s$]*)?)",
                  _sub, template)

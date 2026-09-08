"""compose/ — the anycreature plugin's translation service.

The flow-typed-edges contract (docs/queue/flow-typed-edges.md):
this engine produces a glb mesh. Flows that omit `outputs` on a
stage using this engine get the default Kind.mesh output named
"default"; the Flow validator type-checks edges at construction.

Contract (python/plugins.py — the BUS contract every plugin speaks):
    card_compose(body, model, run_id, graph)
        -> (rc, new_graph, extra_dict, error_str)
    execute(node, run_dir, inputs, stop_event, report=None) -> dict
    stop(params, run_dir)



Dispatch is DATA, THE CARD PATTERN (golden base: h3-timeline): the
card owns its arm — action_cards/<genre>/<card>/python/compose.py — and
this package loads the card's python/ as a PACKAGE (relative imports
resolve; same mechanics as comfyui's _load_lane_package) and calls
`compose(body, model, run_id)`. The arm returns a Skeleton STRUCTURE
(python hands python structures — rung 5); the bus re-validates it
as a FlowGraph. Single-card engine: the map is one row; the
model class's `card` attribute names the directory (PLUGIN
ARCHITECTURE LAW: this package is the ONLY place that knows card ids).
"""


from __future__ import annotations

from flow import Kind  # flow-typed-edges: default output kind
# the flow-typed-edges contract: stages that omit `outputs` on this
# engine produce Kind.mesh (the spec-compiled GLB)
DEFAULT_OUTPUT = Kind.mesh

import asyncio
import importlib
import importlib.util
import sys
from collections.abc import Callable
from pathlib import Path
from types import ModuleType

_COMPOSE_DIR = Path(__file__).resolve().parent
_PLUGIN_ROOT = _COMPOSE_DIR.parent
# plugin root = <repo>/packages/engines/node/anycreature → repo is parents[3]
_PY = str(_PLUGIN_ROOT.parents[3] / "python")
if _PY not in sys.path:
    sys.path.insert(0, _PY)

from melite_cards.dsl import ValidationError  # noqa: E402
from flow_graph import FlowGraph  # noqa: E402,F401

type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

# engine-owned mapping: card id → the action_cards/<genre>/<dir> whose
# python/ package owns the arm (compose dispatch is engine knowledge)
_CARD_DIR_BY_CARD = {
    "forge": "3d/forge",
}

_PKG_ALIAS = "anycreature_forge"   # hyphen dirs are not importable names


def _load_card_package(card_dir: str) -> ModuleType:
    """action_cards/<card_dir>/py as the _PKG_ALIAS package (the
    _load_lane_package recipe: sys.modules BEFORE exec, one namespace;
    relative imports inside the arm resolve)."""
    if _PKG_ALIAS in sys.modules:
        return sys.modules[_PKG_ALIAS]
    pkg_dir = _PLUGIN_ROOT / "action_cards" / card_dir / "python"
    spec = importlib.util.spec_from_file_location(
        _PKG_ALIAS, pkg_dir / "__init__.py",
        submodule_search_locations=[str(pkg_dir)])
    pkg = importlib.util.module_from_spec(spec)
    sys.modules[_PKG_ALIAS] = pkg
    spec.loader.exec_module(pkg)
    return pkg


def card_compose(body: dict[str, JsonValue], model: str, run_id: str,
                 graph: FlowGraph | None
                 ) -> tuple[int, Skeleton | None,
                            dict[str, JsonValue] | None, str | None]:
    """The bus door: resolve the model's card → load its arm → call
    compose(body, model, run_id). The arm's (rc, graph, extra, error)
    rides verbatim.

    Yaml lanes (model = flow name, graph already carrying engine
    nodes) pass through untouched — the yaml IS the graph (the
    comfyui dispatcher contract)."""
    card_dir = _card_dir(model)
    if not card_dir:
        return 0, None, {}, None   # not a card-model request — passthrough
    _load_card_package(card_dir)
    arm = importlib.import_module(_PKG_ALIAS + ".compose")
    return arm.compose(body, model, run_id)


def _card_dir(model: str) -> str:
    """The model CLASS decides (model.py flip — class beats yaml):
    load the plugin's model rows, the cls.card attribute names the
    card. '' = no card (LOUD refusal upstream)."""
    try:
        from melite_models import load_model_py
    except Exception:
        return ""
    models_root = _PLUGIN_ROOT / "models"
    for mpy in sorted(models_root.glob("*/*/model.py")):
        try:
            cls = load_model_py(str(mpy), "anycreature")
        except Exception as e:
            print("plugins: %s model row refuses to load (%s) — skipping it loudly, never serving a guessed row"
                  % (mpy, e), file=sys.stderr)
            continue
        if cls.id == model:
            card_dir = _CARD_DIR_BY_CARD.get(cls.card, "")
            if not card_dir:
                print("plugins: model %r names card %r but this "
                      "plugin mounts no such card dir — the drift "
                      "wall owns the vocabulary" % (model, cls.card),
                      file=sys.stderr)
            return card_dir
    # no model row matches: a yaml lane or a foreign model — the
    # caller passes through (the yaml IS the graph)
    return ""


# ---------------------------------------------------------------------------
# execute — PORT 2 (2026-09-06): the manifest port. This shim keeps
# ONLY lane translation (the input-presence gate, the cli.js +
# interpreter resolution, the spec file write); spawn/timeout/stop/
# harvest ride the generic engine (python/kernel_exec.py) driven by
# manifest.py data. Normal-path behavior is identical
# (wall-pinned parity); the stop path is STRICTLY better (killed
# mid-run, not noticed after).
# ---------------------------------------------------------------------------

_MANIFEST_ALIAS = "anycreature_manifest"


def _load_manifest() -> ModuleType:
    """manifest.py under a UNIQUE module alias — the file lives at
    the plugin root (not on sys.path) and the flat name 'manifest'
    would collide across plugins (shape law rung 5: the loader owns
    import mechanics)."""
    if _MANIFEST_ALIAS in sys.modules:
        return sys.modules[_MANIFEST_ALIAS]
    spec = importlib.util.spec_from_file_location(
        _MANIFEST_ALIAS, _PLUGIN_ROOT / "manifest.py")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[_MANIFEST_ALIAS] = mod
    spec.loader.exec_module(mod)
    return mod


async def execute(node: NodeRow, run_dir: str,
                    inputs: dict[str, JsonValue],
                    stop_event: asyncio.Event,
                    report: Callable[[dict[str, JsonValue]], None] | None = None
                    ) -> dict[str, JsonValue]:
    """Run `node engine/cli.js spec.json out.glb` via the kernel
    manifest — translation here, mechanics in the generic engine."""
    _load_card_package("3d/forge")
    renderer = importlib.import_module(_PKG_ALIAS + ".renderer")

    spec_data = node.params.get("workflow")  # THE ACTION CARD LAW
    if not spec_data:
        return {"outputs": {}, "artifacts": [],
                "error": "no spec in node params"}

    cli = renderer.resolve_cli()
    if cli is None:
        return {"outputs": {}, "artifacts": [],
                "error": ("anyCreature CLI not found — ANYCREATURE_CLI "
                          "env or vendor/anyCreature/engine/cli.js "
                          "(QUEUE LANE LAW: no silent fallback)")}

    # the card's I/O truth: the CLI reads a spec FILE — the shim
    # writes it (what goes in is card knowledge), the manifest only
    # names the lane ($spec)
    import json as _json
    spec_path = str(Path(run_dir) / "creature_spec.json")
    with open(spec_path, "w", encoding="utf-8") as f:
        _json.dump(spec_data, f)

    from kernel_exec import execute_manifest
    manifest = _load_manifest()
    return await execute_manifest(
        manifest.FORGE_MANIFEST, node, str(run_dir),
        inputs, stop_event, report,
        namespace_extra={"cli": str(cli),
                         "cli_dir": str(cli.parents[1]),
                         "spec": spec_path})


def stop(params: dict[str, JsonValue], run_dir: str) -> None:
    """Stop door — the subprocess dies via stop_event in execute."""
    pass

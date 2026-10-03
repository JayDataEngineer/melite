"""compose/ — the audio-cpp plugin's translation service.

The flow-typed-edges contract (dev_docs/queue/flow-typed-edges.md):
this engine produces audio. Flows that omit `outputs` on a stage
using this engine get the default Kind.audio output named
"default"; the Flow validator type-checks edges at construction.

Contract (python/plugins.py — the BUS contract every plugin speaks):
    card_compose(body, model, run_id, graph)
        -> (rc, new_graph, extra_dict, error_str)
    execute(node, run_dir, inputs, stop_event, report=None) -> dict
    stop(params, run_dir)

TWO surfaces, ONE door (2026-09-04 compliance pass, operator order:
"just add a few of the most recent ones to the models, make a basic
action card"):

1. THE MUSIC CARD — action_cards/audio/music/python/ (THE CARD PATTERN,
   golden base h3-timeline): boards the three most-recent upstream
   families (ace-step-xl, ace-step-sft, txt2music). The model
   class's `card` attribute names the dispatch (PLUGIN ARCHITECTURE
   LAW: this package is the ONLY place that knows card ids).

2. THE LEGACY KNOB-MAP SURFACE (compose/_knobmap.py — the C
   card_compose port): every OTHER audio model (moss-sfx, qwen3-tts
   era) validates against its model class's card_knobs tuple. It is
   ENGINE surface beside the dispatcher, never inline here (THE
   CARD PATTERN: the bus door dispatches, arms emit nodes).

This package DISPATCHES only — no arm logic, no node emission
(test_cpp_engines TestCardPattern is the law's teeth).
"""


from __future__ import annotations

from flow import Kind  # flow-typed-edges: default output kind
# the flow-typed-edges contract: stages that omit `outputs` on this
# engine produce Kind.audio
DEFAULT_OUTPUT = Kind.audio

import asyncio
import importlib
import importlib.util
import os
import sys
from collections.abc import Callable
from pathlib import Path
from types import ModuleType

_COMPOSE_DIR = Path(__file__).resolve().parent
_PLUGIN_ROOT = _COMPOSE_DIR.parent
# plugin root = <repo>/packages/engines/cpp/audio-cpp → repo is parents[3]
_REPO = _PLUGIN_ROOT.parents[3]
_PY = str(_REPO / "python")
if _PY not in sys.path:
    sys.path.insert(0, _PY)

def _load_knobmap() -> ModuleType:
    """The legacy arm, by path with a stable unique alias (the
    loader's own recipe — pkg_dir may share sys.path with other
    plugins' compose dirs, so top-level names never collide)."""
    alias = "audio_cpp_knobmap"
    mod = sys.modules.get(alias)
    if mod is not None:
        return mod
    spec = importlib.util.spec_from_file_location(
        alias, _COMPOSE_DIR / "_knobmap.py")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[alias] = mod
    spec.loader.exec_module(mod)
    return mod


type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None


_knobmap = _load_knobmap()

# Engine-truth defaults keys (2026-09-02): model `defaults:` entries the
# CARD never shows but this engine's compose consumes as run truth.
# Cross-validation (melite_models.validate_against_cards) allows exactly
# these — anything else naming no card field is a boot-loud typo.
ENGINE_TRUTH_KEYS = ("task", "family", "cli", "model_path", "backend")

# ---------------------------------------------------------------------------
# the music card dispatch (THE CARD PATTERN)
# ---------------------------------------------------------------------------

_CARD_DIR_BY_CARD = {
    "music-native": "audio/music",
}

_PKG_ALIAS = "audio_cpp_music"


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


def _card_rows() -> list[tuple[str, str]]:
    """(id, card) for every model row in this plugin's models/ tree."""
    try:
        from melite_models import load_model_py
    except Exception:
        return []
    out = []
    models_root = _PLUGIN_ROOT / "models"
    for mpy in sorted(models_root.glob("*/*/model.py")):
        try:
            cls = load_model_py(str(mpy), "audio_cpp")
        except Exception as e:
            print("plugins: %s model row refuses to load (%s) — skipping it loudly, never serving a guessed row"
                  % (mpy, e), file=sys.stderr)
            continue
        out.append((cls.id, getattr(cls, "card", "")))
    return out


def card_compose(body: dict[str, JsonValue], model: str, run_id: str,
                 graph: FlowGraph | None
                 ) -> tuple[int, FlowGraph | Skeleton | None,
                            dict[str, JsonValue] | None, str | None]:
    """The bus door — (rc, graph, extra, error). Music-card rows
    dispatch to the arm; everything else rides the legacy knob-map
    surface. A non-zero rc is a LOUD refusal, never a silent drop."""
    for mid, card in _card_rows():
        if mid == model and card in _CARD_DIR_BY_CARD:
            _load_card_package(_CARD_DIR_BY_CARD[card])
            arm = importlib.import_module(_PKG_ALIAS + ".compose")
            return arm.compose(body, model, run_id)
    return _knobmap.knob_compose(body, model, run_id, graph)


# ---------------------------------------------------------------------------
# execute — the engine ABI (spawn audiocpp_cli; the argv shape comes
# from the node's own params — the MUSIC card's workflow dict or the
# legacy flat rows — never rebuilt from engine knowledge here)
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# execute — PORT 4 (2026-09-06): the manifest port (TWO kernels, one
# binary: the music card's workflow shape + the legacy knob-map flat
# shape — the knobmap arm emits flat params, so the legacy branch is
# LIVE, not dead). The shim keeps ONLY lane translation (shape pick
# + the four-level CLI precedence with its is_file filters —
# params.cli → env → runtime → vendored); spawn/timeout/stop/
# harvest ride the generic engine. Normal-path behavior is
# identical (wall-pinned parity both shapes); the stop path is
# STRICTLY better (killed mid-run — the retired code joined the
# proc to completion first).
# ---------------------------------------------------------------------------

_MANIFEST_ALIAS = "audio_cpp_manifest"


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
    """Run audiocpp_cli via the kernel manifest — translation here,
    mechanics in the generic engine."""
    cli = _resolve_cli(node.params.get("cli"))
    if cli is None:
        return {"outputs": {}, "artifacts": [],
                "error": ("audiocpp_cli not found — AUDIO_CPP_CLI env, "
                          "data/runtime/audio.cpp/build/bin/audiocpp_cli, "
                          "or vendor build (QUEUE LANE LAW: "
                          "no silent fallback)")}

    manifest = _load_manifest()
    kernel = manifest.AUDIO_MUSIC_MANIFEST \
        if isinstance(node.params.get("workflow"), dict) \
        else manifest.AUDIO_LEGACY_MANIFEST

    from kernel_exec import execute_manifest
    return await execute_manifest(
        kernel, node, str(run_dir), inputs, stop_event, report,
        namespace_extra={"cli_path": str(cli)})


def _resolve_cli(cli_override: str | None = None) -> Path | None:
    """params.cli (the model's own row) → AUDIO_CPP_CLI env → runtime
    build → vendored source. None = loud refusal upstream."""
    if cli_override and os.path.isfile(str(cli_override)):
        return Path(str(cli_override))
    env = os.environ.get("AUDIO_CPP_CLI")
    if env and os.path.isfile(env):
        return Path(env)
    runtime = _REPO / "data" / "runtime" / "audio.cpp" / "build" / "bin" \
        / "audiocpp_cli"
    if runtime.is_file():
        return runtime
    vendored = _PLUGIN_ROOT / "vendor" / "audio.cpp" / "build" / "bin" \
        / "audiocpp_cli"
    if vendored.is_file():
        return vendored
    return None


def stop(params: dict[str, JsonValue], run_dir: str) -> None:
    """Stop door — the subprocess dies via stop_event in execute."""
    pass

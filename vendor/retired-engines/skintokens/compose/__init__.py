"""compose/ — the skintensors plugin's translation service.

Contract (python/plugins.py — the BUS contract every plugin speaks):
    card_compose(body, model, run_id, graph)
        -> (rc, new_graph, extra_dict, error_str)
    execute(node, run_dir, inputs, stop_event, report=None) -> dict
    stop(params, run_dir)

Dispatch is DATA, THE CARD PATTERN (golden base: h3-timeline): the
card owns its arm — action_cards/<genre>/<card>/python/compose.py — and
this package loads the card's python/ as a PACKAGE and calls
`compose(body, model, run_id)` (the autoremesher precedent, the
compose-first cpp lane).
"""


from __future__ import annotations

from flow import Kind  # flow-typed-edges: default output kind
# the flow-typed-edges contract: stages that omit `outputs` on this
# engine produce Kind.mesh (the rigged GLB)
DEFAULT_OUTPUT = Kind.mesh

import asyncio
import importlib
import importlib.util
import os
import subprocess
import sys
from collections.abc import Callable
from pathlib import Path

_COMPOSE_DIR = Path(__file__).resolve().parent
_PLUGIN_ROOT = _COMPOSE_DIR.parent
# plugin root = <repo>/packages/engines/cpp/skintokens → parents[3]
_PY = str(_PLUGIN_ROOT.parents[3] / "python")
if _PY not in sys.path:
    sys.path.insert(0, _PY)

from melite_cards.dsl import ValidationError  # noqa: E402
from flow_graph import FlowGraph  # noqa: E402,F401

type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

_CARD_DIR_BY_CARD = {
    "auto-rig": "3d/auto-rig",
}

_PKG_ALIAS = "skintokens_auto_rig"


def _load_card_package(card_dir: str) -> ModuleType:
    """action_cards/<card_dir>/py as the _PKG_ALIAS package (the
    _load_lane_package recipe: sys.modules BEFORE exec, one
    namespace; relative imports inside the arm resolve)."""
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
    rides verbatim."""
    card_dir = _card_dir(model)
    if not card_dir:
        return 0, None, {}, None   # not a card-model request — passthrough
    _load_card_package(card_dir)
    arm = importlib.import_module(_PKG_ALIAS + ".compose")
    return arm.compose(body, model, run_id)


def _card_dir(model: str) -> str:
    """The model CLASS decides: load the plugin's model rows, the
    cls.card attribute names the card."""
    try:
        from melite_models import load_model_py
    except Exception:
        return ""
    models_root = _PLUGIN_ROOT / "models"
    for mpy in sorted(models_root.glob("*/*/model.py")):
        try:
            cls = load_model_py(str(mpy), "skintokens")
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
# execute — the engine ABI (subprocess; the card's renderer owns argv)
# ---------------------------------------------------------------------------

async def execute(node: NodeRow, run_dir: str,
                    inputs: dict[str, JsonValue],
                    stop_event: asyncio.Event,
                    report: Callable[[dict[str, JsonValue]], None] | None = None
                    ) -> dict[str, JsonValue]:
    """Run skintokens-cli rig via the built CLI — argv from the card's
    renderer.py, never rebuilt here. CPU generation takes minutes
    (upstream recomputes the Qwen graph without a KV cache) — the
    timeout is an hour, not autoremesher's ten minutes."""
    _load_card_package("3d/auto-rig")
    renderer = importlib.import_module(_PKG_ALIAS + ".renderer")
    cli = renderer.resolve_cli()
    model_dir = renderer.resolve_model_dir()
    if cli is None or model_dir is None:
        missing = ("skintokens-cli binary" if cli is None
                   else "SkinTokens F16 GGUF bundle")
        return {"outputs": {}, "artifacts": [],
                "error": ("%s not found — SKINTOKENS_BIN / "
                          "SKINTOKENS_MODEL_DIR env or the runtime "
                          "under data/runtime/skintokens (cmake build "
                          "+ hf download LocalAI-io/SkinTokens-GGUF "
                          "--include \"F16/*\"; see dev_docs/design/"
                          "auto-rig-skintokens.md) — QUEUE LANE LAW: "
                          "no silent fallback" % missing)}

    wf = node.params.get("workflow") or {}   # THE ACTION CARD LAW
    if not wf.get("input"):
        return {"outputs": {}, "artifacts": [],
                "error": "no input mesh in node params"}

    if report:
        report({"activity": "rigging with SkinTokens (CPU — minutes, "
                            "not seconds)"})
    cmd, out_path = renderer.build_argv(
        cli, model_dir, str(run_dir), dict(node.params, workflow=wf))

    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        _stdout, stderr = await asyncio.wait_for(proc.communicate(),
                                                 timeout=3600)
    except asyncio.TimeoutError:
        proc.kill()
        return {"outputs": {}, "artifacts": [],
                "error": "skintokens rig timed out after 3600s"}
    if stop_event.is_set():
        proc.kill()
        return {"outputs": {}, "artifacts": [], "error": "stopped"}
    if proc.returncode != 0:
        err = stderr.decode(errors="replace").strip() \
            or "exit %d" % proc.returncode
        return {"outputs": {}, "artifacts": [], "error": err}
    if not os.path.isfile(out_path) or os.path.getsize(out_path) == 0:
        return {"outputs": {}, "artifacts": [],
                "error": "skintokens produced no rigged GLB "
                         "(exit 0, no file)"}
    if report:
        report({"activity": "rig complete", "progress": 100})
    return {"outputs": {"mesh": out_path}, "artifacts": [out_path]}


def stop(params: dict[str, JsonValue], run_dir: str) -> None:
    """Stop door — the subprocess dies via stop_event in execute."""

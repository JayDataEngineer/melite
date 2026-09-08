"""renderer.py — the auto-rig card's render payload SSOT.

PYTHON SHAPE LAW rung 8: the argv truth lives HERE (card behavior),
never in the model payload and never inline in execute.

The vendored engine's live-probed surface (its own usage text,
2026-09-06 — never README memory):
    skintokens-cli rig MODEL_DIR MESH.{glb,t2mesh} OUTPUT.glb
        [--device auto|cpu|vulkan] [--postprocess]
        [--beams N] [--temperature F] [--max-tokens N]

v1 boards the rig arm only: input mesh → generated skeleton +
learned skin weights → rigged GLB. The generation knobs (beams/
temperature/max-tokens) ride the CLI's own defaults — a card knob
appears only when an operator asks to steer it (no speculative
surface). The skin arm (existing skeleton → weights) is the
transfer_rig upgrade path, deliberately NOT on this card (see
docs/design/auto-rig-skintensors.md).
"""

from __future__ import annotations

import os
from pathlib import Path

type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

_HERE = Path(__file__).resolve().parent
# python/ -> auto-rig -> 3d -> action_cards -> skintokens (plugin root)
PLUGIN_ROOT = _HERE.parents[3]
# skintokens (plugin root) → cpp → engines → plugins → REPO
_RUNTIME = PLUGIN_ROOT.parents[3] / "data" / "runtime" / "skintokens"
_CLI_CANDIDATES = (_RUNTIME / "bin" / "skintokens-cli",
                   _RUNTIME / "skintokens-cli")
_MODEL_CANDIDATES = (_RUNTIME / "models" / "SkinTokens-GGUF" / "F16",)


def resolve_cli() -> "Path | None":
    """SKINTOKENS_BIN env override (BYO) → the runtime install →
    None (execute refuses LOUDLY)."""
    env = os.environ.get("SKINTOKENS_BIN")
    if env:
        return Path(env)
    for cand in _CLI_CANDIDATES:
        if cand.is_file():
            return cand
    vendored = PLUGIN_ROOT / "vendor" / "skin-tokens.cpp"
    for sub in ("build/release/bin/skintokens-cli",
                "dist/bin/skintokens-cli",
                "build/release/skintokens-cli"):
        cand = vendored / sub
        if cand.is_file():
            return cand
    return None


def resolve_model_dir() -> "Path | None":
    """SKINTOKENS_MODEL_DIR env override → the runtime F16 bundle →
    None (execute refuses LOUDLY). F16 is upstream's own inference
    recommendation; F32 exists for numerical parity work only."""
    env = os.environ.get("SKINTOKENS_MODEL_DIR")
    if env:
        p = Path(env)
        return p if p.is_dir() else None
    for cand in _MODEL_CANDIDATES:
        if cand.is_dir():
            return cand
    return None


def params_from_doc(doc: RigParams) -> dict[str, JsonValue]:
    """The node params: THE ACTION CARD LAW — params.workflow carries
    the input ref; the knobs ride as sibling params."""
    return {
        "workflow": {"input": doc.input},
        "device": doc.device,
        "postprocess": doc.postprocess,
    }


def build_argv(cli: Path, model_dir: Path, run_dir: str,
               params: dict[str, JsonValue]) -> tuple[list[str], str]:
    """The argv truth → (cmd, out_path)."""
    wf = params.get("workflow") or {}   # THE ACTION CARD LAW
    out_path = os.path.join(run_dir, "rigged.glb")
    cmd = [
        str(cli), "rig",
        str(model_dir),
        str(wf.get("input", "")),
        out_path,
        "--device", str(params.get("device", "cpu")),
    ]
    if params.get("postprocess"):
        cmd.append("--postprocess")
    return cmd, out_path

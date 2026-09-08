"""renderer.py — the music card's renderer (argv SSOT, rung 8).

The renderer owns the ARGV (PYTHON SHAPE rung 8: models don't
render, action cards do — and Law 12: CLI flag literals have ONE
home, renderer.py, never the compose package). execute() in the
compose package calls the builders here.

TWO argv shapes, one home:

  build_argv(cli, run_dir, workflow)   the MUSIC card's workflow
                                       dict (THE ACTION CARD LAW:
                                       one node, one workflow)
  build_argv_legacy(cli, run_dir, p)   the legacy knob-map rows
                                       (flat task/family/model/...
                                       params on the node)

CLI shape: the flags mirror the GenerationRequest(task, family,
model, ...) surface of the upstream binding layer (Delusion's
task.py — see docs/research/trellis2-native-method-case-study.md
§"audio.cpp node design, verified 2026-09-03"). The exact flag
spelling is provisional until the binding lane pins it; a wrong
flag surfaces as the binary's own loud stderr in the sidecar
(RESILIENCE LAW: documented failure, never a silent fallback).
"""

import os
from pathlib import Path

from typing import Optional

type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

_REPO = Path(__file__).resolve().parents[7]


def resolve_cli() -> Optional[str]:
    """AUDIO_CPP_CLI env → runtime build → vendored source. None =
    loud refusal upstream (QUEUE LANE LAW: no silent fallback)."""
    env = os.environ.get("AUDIO_CPP_CLI")
    if env and os.path.isfile(env):
        return env
    runtime = _REPO / "data" / "runtime" / "audio.cpp" / "build" / "bin" \
        / "audiocpp_cli"
    if runtime.is_file():
        return str(runtime)
    vendored = _REPO / "packages" / "engines" / "cpp" / "audio-cpp" \
        / "vendor" / "audio.cpp" / "build" / "bin" / "audiocpp_cli"
    if vendored.is_file():
        return str(vendored)
    return None


def build_argv(cli: str, run_dir: str, workflow: dict[str, JsonValue]
               ) -> tuple[list[str], str]:
    """The MUSIC card's audiocpp_cli invocation: task + family +
    model + the card knobs, output lands in the run dir.
    Returns (argv, out_path)."""
    out_path = os.path.join(run_dir, "music_out.wav")
    cmd: list[str] = [
        cli,
        "--task", str(workflow.get("task", "gen")),
        "--family", str(workflow.get("family", "")),
        "--model", str(workflow.get("model", "")),
        "--backend", str(workflow.get("backend", "cuda")),
        "--output", out_path,
    ]
    if workflow.get("duration_sec"):
        cmd += ["--duration", str(workflow["duration_sec"])]
    if workflow.get("prompt"):
        cmd += ["--prompt", str(workflow["prompt"])]
    if workflow.get("lyrics"):
        cmd += ["--lyrics", str(workflow["lyrics"])]
    if "seed" in workflow:
        cmd += ["--seed", str(workflow["seed"])]
    return cmd, out_path


def build_argv_legacy(cli: str, run_dir: str, p: dict[str, JsonValue]
                      ) -> tuple[list[str], str]:
    """The LEGACY knob-map invocation (flat node params — the
    C-port surface: task/family/model/backend/speaker/instruct/
    temperature/seed). Returns (argv, out_path)."""
    out_path = os.path.join(run_dir, "audio_out.wav")
    cmd: list[str] = [
        cli,
        "--task", str(p.get("task", "tts")),
        "--family", str(p.get("family", "")),
        "--model", str(p.get("model", "")),
        "--backend", str(p.get("backend", "cuda")),
        "--output", out_path,
    ]
    if p.get("instruct"):
        cmd += ["--instruct", str(p["instruct"])]
    if p.get("speaker"):
        cmd += ["--speaker", str(p["speaker"])]
    if "temperature" in p:
        cmd += ["--temperature", str(p["temperature"])]
    if "seed" in p:
        cmd += ["--seed", str(p["seed"])]
    return cmd, out_path


def render(card_payload: dict[str, JsonValue],
           model_row: "type[Model] | None") -> dict[str, JsonValue]:
    """Map the music card's payload + picked model row to the
    workflow dict (the same shape compose() emits into the skeleton
    node's params). Kept for parity with the card-arm surface; the
    execute path reads params.workflow directly."""
    li = getattr(model_row, "lane_inputs", None) if model_row else None
    family = (getattr(li, "family", None)
              or card_payload.get("family") or "ace-step-xl")
    model_path = getattr(li, "model_path", None) or ""
    out: dict[str, JsonValue] = {
        "task": "gen",
        "family": family,
        "model": model_path,
        "duration_sec": int(card_payload.get("duration") or 120),
        "sample_rate": 44100,
        "backend": card_payload.get("backend") or "cuda",
    }
    if card_payload.get("seed", -1) != -1:
        out["seed"] = int(card_payload["seed"])
    if card_payload.get("prompt"):
        out["prompt"] = card_payload["prompt"]
    if card_payload.get("lyrics") and family == "minimax":
        out["lyrics"] = card_payload["lyrics"]
    return out
